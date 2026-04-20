import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/avatar/:userId ──────────────────────────────────
// Public route — serves a user's avatar image.
//   • New format: Vercel Blob URL → 302 redirect (immutable cache)
//   • Legacy:     "data:<mime>;base64,<data>" → decode + stream buffer
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { image: true },
    });

    if (!user?.image) return res.status(404).end();

    // New: Vercel Blob URL
    if (user.image.startsWith("https://")) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      return res.redirect(302, user.image);
    }

    // Legacy: data URL
    const [header, data] = user.image.split(",");
    const mimeMatch = header?.match(/data:([^;]+)/);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";
    const buffer = Buffer.from(data ?? "", "base64");

    res.set("Content-Type", mimeType);
    res.set("Cache-Control", "private, max-age=3600, must-revalidate");
    res.send(buffer);
  } catch (error) {
    console.error("avatar/:userId error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
