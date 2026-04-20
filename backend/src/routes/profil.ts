import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// 5 MB avatar upload cap — matches the frontend constraint.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
});

// ─── GET /api/profil ──────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId! },
      select: {
        id:            true,
        email:         true,
        name:          true,
        username:      true,
        image:         true,
        plan:          true,
        planExpiresAt: true,
        createdAt:     true,
      },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ profil: user });
  } catch (error) {
    console.error("profil GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PUT /api/profil ──────────────────────────────────────────
router.put("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where:  { id: req.userId! },
      data:   { name: name ?? undefined },
      select: { id: true, name: true },
    });
    res.json({ profil: user });
  } catch (error) {
    console.error("profil PUT error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/profil/avatar ──────────────────────────────────
// TODO: Upload to Vercel Blob (copy from src/app/api/profil/avatar/route.ts).
router.post("/avatar", requireAuth, upload.single("avatar"), async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: "Not implemented yet — upload Vercel Blob à brancher" });
});

// ─── DELETE /api/profil/avatar ────────────────────────────────
router.delete("/avatar", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Also delete the blob from Vercel Blob storage.
    await prisma.user.update({
      where: { id: req.userId! },
      data:  { image: null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("profil/avatar DELETE error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
