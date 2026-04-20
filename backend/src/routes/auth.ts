import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  upsertBrevoContact,
} from "../lib/email";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";

// ─── POST /api/auth/register ─────────────────────────────────
// Mirrors PWA: creates user + VerificationToken (24h) + fires Brevo emails.
// Referral rewards are granted on email verification (onReferralEmailVerified).
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, username, subscribeNewsletter, referralCode } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Pseudo, email et mot de passe requis" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ error: "Ce pseudo est déjà pris" });
      }
    }

    const subscribed = subscribeNewsletter !== false;
    const passwordHash = await bcrypt.hash(password, 12);

    // Resolve referrer from code (matches both referralCode and username ilike)
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findFirst({
        where: {
          OR: [
            { referralCode },
            { username: { equals: referralCode, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (referrer) referredById = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        username: username || null,
        subscribedNewsletter: subscribed,
        ...(referredById ? { referredById } : {}),
      },
    });

    // Generate verification token (24h)
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Upsert Brevo CRM contact (fire-and-forget)
    upsertBrevoContact(email, { name, subscribed }).catch((err) =>
      console.error("[Brevo] register upsert failed:", err)
    );

    res.status(201).json({
      success: true,
      message: "Compte créé. Vérifiez votre email pour activer votre compte.",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
// New endpoint for mobile — returns a Bearer token
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: "Ce compte a été supprimé" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "EMAIL_NOT_VERIFIED" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Generate long-lived mobile token
    const token = jwt.sign(
      { userId: user.id, type: "mobile" },
      JWT_SECRET,
      { expiresIn: "90d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        plan: user.plan,
        hasAvatar: !!user.image,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

// ─── POST /api/auth/verify ───────────────────────────────────
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token requis" });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return res.status(400).json({ error: "Token invalide ou expiré" });
    }

    const user = await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
      select: { id: true, referredById: true, email: true, name: true },
    });

    await prisma.verificationToken.delete({ where: { token } });

    // Trigger referral reward if applicable — lazy import avoids circular deps
    if (user.referredById) {
      const { onReferralEmailVerified } = await import("../lib/referral");
      onReferralEmailVerified(user.id).catch((err) =>
        console.error("[referral] onReferralEmailVerified failed:", err)
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ error: "Erreur lors de la vérification" });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────
// Uses DB VerificationToken with identifier=`reset:${email}` (1h expiry)
// to stay compatible with the PWA's reset flow & reset page URL.
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ error: "Email requis" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, deletedAt: true, passwordHash: true },
    });

    // Always return success to prevent enumeration
    if (!user || user.deletedAt || !user.passwordHash) {
      return res.json({ success: true });
    }

    // Invalidate any existing token for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}` },
    });

    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    try {
      await sendPasswordResetEmail(email, token);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body ?? {};

    if (!token || !password) {
      return res.status(400).json({ error: "Token et mot de passe requis" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (
      !verificationToken ||
      verificationToken.expires < new Date() ||
      !verificationToken.identifier.startsWith("reset:")
    ) {
      return res.status(400).json({ error: "Token invalide ou expiré" });
    }

    const email = verificationToken.identifier.slice("reset:".length);
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    await prisma.verificationToken.delete({ where: { token } });

    res.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────
// Quick session check for mobile — returns current user or 401
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        plan: true,
        planExpiresAt: true,
        referralCode: true,
        scanCount: true,
        scanCountResetAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────────
// Refresh an expiring mobile token
router.post("/refresh", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const token = jwt.sign(
      { userId: req.userId, type: "mobile" },
      JWT_SECRET,
      { expiresIn: "90d" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
