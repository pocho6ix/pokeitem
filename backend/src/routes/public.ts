import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPriceForVersion } from "../lib/display-price";

const router = Router();

// ─── GET /api/u/:slug ─────────────────────────────────────────
// Public profile endpoint. Returns identity + visibility flags + summary
// stats. The old endpoint also embedded full cards/doubles/wishlist arrays;
// those have moved to `/api/users/:slug/trade-calculator`.
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const share = await prisma.classeurShare.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, name: true, image: true, createdAt: true } },
      },
    });

    if (!share || !share.isActive) {
      return res.status(404).json({ error: "Not found" });
    }

    const owner = share.user;

    const [cardsRaw, doublesCount, wishlistCount] = await Promise.all([
      share.shareCards
        ? prisma.userCard.findMany({
            where:  { userId: owner.id },
            select: {
              quantity: true,
              version:  true,
              card: { select: { price: true, priceFr: true, priceReverse: true } },
            },
          })
        : Promise.resolve([] as Array<{
            quantity: number;
            version: import("@prisma/client").CardVersion;
            card: { price: number | null; priceFr: number | null; priceReverse: number | null };
          }>),
      share.shareDoubles
        ? prisma.userCard.count({ where: { userId: owner.id, quantity: { gt: 1 } } })
        : Promise.resolve(0),
      share.shareWishlist
        ? prisma.cardWishlistItem.count({ where: { userId: owner.id } })
        : Promise.resolve(0),
    ]);

    const cardsCount = cardsRaw.length;
    const cardsValueCents = Math.round(
      cardsRaw.reduce(
        (sum, uc) => sum + getPriceForVersion(uc.card, uc.version) * uc.quantity,
        0,
      ) * 100,
    );

    res.json({
      user: {
        slug:        share.slug,
        displayName: owner.name ?? "Dresseur",
        avatarUrl:   owner.image,
        memberSince: owner.createdAt.toISOString(),
        contact: {
          discord: share.contactDiscord,
          email:   share.contactEmail,
          twitter: share.contactTwitter,
        },
      },
      visibility: {
        cards:    share.shareCards,
        doubles:  share.shareDoubles,
        wishlist: share.shareWishlist,
        items:    share.shareItems,
      },
      stats: {
        cardsCount,
        cardsValueCents,
        doublesCount,
        wishlistCount,
      },
    });
  } catch (error) {
    console.error("u/:slug error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
