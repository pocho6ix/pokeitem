import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// Share settings live on `ClasseurShare` (1:1 with User, created lazily).
// Visibility is one of: "private" | "link" | "public".

// ─── GET /api/share/settings ──────────────────────────────────
router.get("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.classeurShare.findUnique({
      where: { userId: req.userId! },
    });
    res.json({ settings });
  } catch (error) {
    console.error("share/settings GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PUT /api/share/settings ──────────────────────────────────
router.put("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      slug,
      visibility,
      isActive,
      shareCards,
      shareDoubles,
      shareItems,
      shareWishlist,
      contactDiscord,
      contactEmail,
      contactTwitter,
    } = req.body;

    // If caller sets a slug, check uniqueness (ignoring their own record).
    if (typeof slug === "string" && slug.trim()) {
      const clash = await prisma.classeurShare.findFirst({
        where:  { slug, NOT: { userId: req.userId! } },
        select: { id: true },
      });
      if (clash) return res.status(409).json({ error: "Ce slug est déjà pris" });
    }

    // Upsert — first call creates the row; subsequent calls patch it.
    const settings = await prisma.classeurShare.upsert({
      where:  { userId: req.userId! },
      create: {
        userId:         req.userId!,
        slug:           slug ?? req.userId!, // fallback; caller should supply a real one.
        visibility:     visibility     ?? "private",
        isActive:       isActive       ?? false,
        shareCards:     shareCards     ?? true,
        shareDoubles:   shareDoubles   ?? true,
        shareItems:     shareItems     ?? false,
        shareWishlist:  shareWishlist  ?? true,
        contactDiscord: contactDiscord ?? null,
        contactEmail:   contactEmail   ?? null,
        contactTwitter: contactTwitter ?? null,
      },
      update: {
        slug:           slug           ?? undefined,
        visibility:     visibility     ?? undefined,
        isActive:       isActive       ?? undefined,
        shareCards:     shareCards     ?? undefined,
        shareDoubles:   shareDoubles   ?? undefined,
        shareItems:     shareItems     ?? undefined,
        shareWishlist:  shareWishlist  ?? undefined,
        contactDiscord: contactDiscord ?? undefined,
        contactEmail:   contactEmail   ?? undefined,
        contactTwitter: contactTwitter ?? undefined,
      },
    });

    res.json({ settings });
  } catch (error) {
    console.error("share/settings PUT error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/share/:slug ─────────────────────────────────────
// Public endpoint — resolves a slug to a shared classeur view.
// TODO: Copy the full projection logic from src/app/api/share/[slug]/route.ts
// (owner-only gates on shareDoubles/shareItems/etc., hiding PII, etc.).
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const share = await prisma.classeurShare.findUnique({
      where:   { slug: req.params.slug },
      include: {
        user: { select: { id: true, username: true, image: true } },
      },
    });
    if (!share || !share.isActive || share.visibility === "private") {
      return res.status(404).json({ error: "Introuvable" });
    }
    res.json({ share });
  } catch (error) {
    console.error("share/:slug GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
