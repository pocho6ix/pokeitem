import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Validation schemas ───────────────────────────────────────────────────────

const UpsertCardSchema = z.object({
  cardId:    z.string().min(1),
  quantity:  z.number().int().min(0).max(999),
  condition: z.string().optional().default("NEAR_MINT"),
  language:  z.string().optional().default("FR"),
  foil:      z.boolean().optional().default(false),
});

const PostBodySchema = z.object({
  cards: z.array(UpsertCardSchema).min(1).max(200),
});

const DeleteBodySchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(200),
});

// ─── GET /api/cards/collection?serieSlug=xxx ─────────────────────────────────
// Returns the authenticated user's owned cards for a given serie slug.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const serieSlug = req.nextUrl.searchParams.get("serieSlug");
  if (!serieSlug) {
    return NextResponse.json({ error: "serieSlug requis" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  const serie = await prisma.serie.findUnique({
    where: { slug: serieSlug },
    select: { id: true },
  });
  if (!serie) {
    return NextResponse.json({ error: "Série introuvable" }, { status: 404 });
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId, card: { serieId: serie.id } },
    select: {
      id:        true,
      cardId:    true,
      quantity:  true,
      foil:      true,
      condition: true,
      language:  true,
    },
  });

  return NextResponse.json({ userCards });
}

// ─── POST /api/cards/collection ───────────────────────────────────────────────
// Upserts one or more cards for the authenticated user.
// If quantity = 0, the record is deleted.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { cards } = parsed.data;

  // Verify all cardIds exist
  const cardIds = cards.map((c) => c.cardId);
  const existingCards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingCards.map((c) => c.id));
  const invalidIds = cardIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json({ error: "Cartes introuvables", invalidIds }, { status: 404 });
  }

  const results = await Promise.all(
    cards.map(async ({ cardId, quantity, condition, language, foil }) => {
      if (quantity <= 0) {
        // Remove from collection
        await prisma.userCard.deleteMany({ where: { userId, cardId } });
        return { cardId, action: "deleted" };
      }

      const record = await prisma.userCard.upsert({
        where:  { userId_cardId: { userId, cardId } },
        create: { userId, cardId, quantity, condition: condition as never, language: language as never, foil },
        update: { quantity, condition: condition as never, language: language as never, foil },
        select: { id: true, cardId: true, quantity: true, condition: true, language: true, foil: true },
      });

      return { cardId, action: "upserted", record };
    })
  );

  return NextResponse.json({ results });
}

// ─── DELETE /api/cards/collection ────────────────────────────────────────────
// Removes one or more cards from the collection.

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { count } = await prisma.userCard.deleteMany({
    where: { userId, cardId: { in: parsed.data.cardIds } },
  });

  return NextResponse.json({ deleted: count });
}
