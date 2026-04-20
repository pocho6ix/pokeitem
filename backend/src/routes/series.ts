import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * Mobile catalog metadata: returns every series with its `cardCount` and
 * bloc slug. Powers the Collection + Classeur list pages on iOS so they
 * can display real "owned/total" progress instead of "owned/?".
 *
 * Mirrors the shape returned by the web helper `getCachedSeriesList()`
 * in `src/lib/cached-queries.ts`.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const series = await prisma.serie.findMany({
      select: {
        id:           true,
        slug:         true,
        name:         true,
        abbreviation: true,
        imageUrl:     true,
        cardCount:    true,
        releaseDate:  true,
        order:        true,
        bloc: { select: { slug: true } },
      },
    });

    res.json({ series });
  } catch (error) {
    console.error("series GET error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Card counts per serie — used for completion logic (normal vs special).
 * Mirrors `getCachedSerieCardCounts()` from the web helper.
 */
router.get("/card-counts", async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.card.groupBy({
      by: ["serieId", "isSpecial"],
      _count: { id: true },
    });

    const map: Record<string, { total: number; special: number }> = {};
    for (const r of rows) {
      if (!map[r.serieId]) map[r.serieId] = { total: 0, special: 0 };
      map[r.serieId].total += r._count.id;
      if (r.isSpecial) map[r.serieId].special += r._count.id;
    }
    res.json({ counts: map });
  } catch (error) {
    console.error("series/card-counts error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
