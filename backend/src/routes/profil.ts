import { Router, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { put, del } from "@vercel/blob";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB (matches PWA)
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
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
// multipart/form-data with field "avatar" → resize 400×400 WebP (q=80)
// → upload to Vercel Blob → store the URL in User.image.
router.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Aucun fichier envoyé" });
      }
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        return res.status(400).json({
          error: "Format non supporté. Utilisez JPG, PNG ou WebP.",
        });
      }

      // Compress to 400×400 WebP (same params as the PWA migration script).
      const compressed = await sharp(file.buffer)
        .resize(400, 400, { fit: "cover", position: "center", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // If the user already has a Vercel Blob avatar, delete it first.
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
      });
      if (existing?.image && existing.image.startsWith("https://") && existing.image.includes(".vercel-storage")) {
        await del(existing.image).catch((err) =>
          console.error("[avatar] failed to del old blob:", err)
        );
      }

      const filename = `avatars/${userId}-${Date.now()}.webp`;
      const blob = await put(filename, compressed, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
      });

      await prisma.user.update({
        where: { id: userId },
        data: { image: blob.url },
      });

      res.json({ hasAvatar: true, url: blob.url });
    } catch (error) {
      console.error("profil/avatar POST error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ─── DELETE /api/profil/avatar ────────────────────────────────
router.delete("/avatar", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (existing?.image && existing.image.startsWith("https://") && existing.image.includes(".vercel-storage")) {
      await del(existing.image).catch((err) =>
        console.error("[avatar] failed to del blob on delete:", err)
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });

    res.json({ hasAvatar: false });
  } catch (error) {
    console.error("profil/avatar DELETE error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
