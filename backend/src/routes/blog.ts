import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/blog ────────────────────────────────────────────
// Public blog listing. Supports optional tag/slug filters.
router.get("/", async (req: Request, res: Response) => {
  try {
    const { tag, slug, limit } = req.query;
    const take = Math.min(Number(limit) || 20, 50);

    const where: Prisma.BlogPostWhereInput = { published: true };
    if (typeof slug === "string") where.slug = slug;
    if (typeof tag  === "string") where.tags = { has: tag };

    const posts = await prisma.blogPost.findMany({
      where,
      take,
      orderBy: { publishedAt: "desc" },
      select: {
        id:          true,
        slug:        true,
        title:       true,
        excerpt:     true,
        coverImage:  true,
        tags:        true,
        publishedAt: true,
      },
    });

    res.json({ posts });
  } catch (error) {
    console.error("blog GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
