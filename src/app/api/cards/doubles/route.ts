import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Validation schemas ───────────────────────────────────────────────────────

const UpsertDoubleSchema = z.object({
  cardId:       z.string().min(1),
  quantity:     z.number().int().min(0).max(999),
  condition:    z.string().optional().default("NEAR_MINT"),
  language:     z.string().optional().default("FR"),
  availability: z.enum(["TRADE", "SELL", "BOTH"]).optional().default("TRADE"),
  price:        z.number().positive().nullable().optional(),
});

const PostBodySchema = z.object({
  cards: z.array(UpsertDoubleSchema).min(1).max(200),
});

const DeleteBodySchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(200),
});

// ─── GET /api/cards/doubles?serieSlug=xxx ────────────────────────────────────
// Returns the authenticated user's doubles for a given serie slug.

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

  const doubles = await prisma.userCardDouble.findMany({
    where: { userId, card: { serieId: serie.id } },
    select: {
      id:           true,
      cardId:       true,
      quantity:     true,
      condition:    true,
      language:     true,
      availability: true,
      price:        true,
    },
  });

  return NextResponse.json({ doubles });
}

// ─── POST /api/cards/doubles ─────────────────────────────────────────────────
// Upserts doubles. If quantity = 0, the record is deleted.

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
    cards.map(async ({ cardId, quantity, condition, language, availability, price }) => {
      if (quantity <= 0) {
        await prisma.userCardDouble.deleteMany({ where: { userId, cardId } });
        return { cardId, action: "deleted" };
      }

      const record = await prisma.userCardDouble.upsert({
        where:  { userId_cardId: { userId, cardId } },
        create: {
          userId, cardId, quantity,
          condition: condition as never,
          language:  language as never,
          availability: availability as never,
          price: price ?? null,
        },
        update: {
          quantity,
          condition: condition as never,
          language:  language as never,
          availability: availability as never,
          price: price ?? null,
        },
        select: { id: true, cardId: true, quantity: true, condition: true, language: true, availability: true, price: true },
      });

      return { cardId, action: "upserted", record };
    })
  );

  return NextResponse.json({ results });
}

// ─── DELETE /api/cards/doubles ────────────────────────────────────────────────
// Removes one or more doubles.

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

  const { count } = await prisma.userCardDouble.deleteMany({
    where: { userId, cardId: { in: parsed.data.cardIds } },
  });

  return NextResponse.json({ deleted: count });
}
