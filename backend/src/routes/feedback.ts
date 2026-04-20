import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/feedback ───────────────────────────────────────
// Schema note: `Feedback.userId` is NOT nullable — anonymous feedback is
// impossible. We enforce auth here. Extra fields (category, meta) that
// existed in older drafts have been dropped; only `message` is persisted.
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message requis" });
    }
    if (message.length > 5000) {
      return res.status(413).json({ error: "message trop long (max 5000 caractères)" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.userId!,
        message,
      },
    });

    res.status(201).json({ feedback });
  } catch (error) {
    console.error("feedback error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
