import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";

// ─── POST /api/auth/register ─────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, username, referralCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ error: "Ce pseudo est déjà pris" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || username || null,
        username: username || null,
        referredById: referralCode
          ? (await prisma.user.findUnique({ where: { referralCode } }))?.id
          : undefined,
      },
    });

    // TODO: Send verification email via Brevo (copy from src/app/api/auth/register/route.ts)
    // TODO: Add contact to Brevo list
    // TODO: Grant referral points

    res.status(201).json({
      success: true,
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

    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ error: "Erreur lors de la vérification" });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: "reset" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // TODO: Send reset email via Brevo (copy logic from src/app/api/auth/forgot-password/route.ts)

    res.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token et mot de passe requis" });
    }

    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (payload.type !== "reset") {
      return res.status(400).json({ error: "Token invalide" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: "Token invalide ou expiré" });
    }
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
