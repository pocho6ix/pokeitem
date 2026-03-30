import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CardVersionEnum = z.enum(["NORMAL", "REVERSE", "REVERSE_POKEBALL", "REVERSE_MASTERBALL"]);

const UpsertCardSchema = z.object({
  cardId:    z.string().min(1),
  quantity:  z.number().int().min(0).max(999),
  condition: z.string().optional().default("NEAR_MINT"),
  language:  z.string().optional().default("FR"),
  version:   CardVersionEnum.optional().default("NORMAL"),
  foil:      z.boolean().optional().default(false),
});

const PostBodySchema = z.object({
  cards: z.array(UpsertCardSchema).min(1).max(200),
});

const DeleteBodySchema = z.object({
  // Each entry: { cardId, version? } — if version omitted, deletes ALL versions of that card
  entries: z.array(
    z.object({
      cardId:  z.string().min(1),
      version: CardVersionEnum.optional(),
    })
  ).min(1).max(200),
});

// ─── GET /api/cards/collection?serieSlug=xxx ─────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const serieSlug = req.nextUrl.searchParams.get("serieSlug");
  if (!serieSlug) return NextResponse.json({ error: "serieSlug requis" }, { status: 400 });

  const userId = (session.user as { id: string }).id;

  const serie = await prisma.serie.findUnique({ where: { slug: serieSlug }, select: { id: true } });
  if (!serie) return NextResponse.json({ error: "Série introuvable" }, { status: 404 });

  const userCards = await prisma.userCard.findMany({
    where: { userId, card: { serieId: serie.id } },
    select: { id: true, cardId: true, quantity: true, foil: true, condition: true, language: true, version: true },
  });

  return NextResponse.json({ userCards });
}

// ─── POST /api/cards/collection ───────────────────────────────────────────────
// Upserts one or more (card + version) entries. quantity = 0 deletes the entry.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  const { cards } = parsed.data;

  const cardIds = [...new Set(cards.map((c) => c.cardId))];
  const existingCards = await prisma.card.findMany({ where: { id: { in: cardIds } }, select: { id: true } });
  const existingIds = new Set(existingCards.map((c) => c.id));
  const invalidIds = cardIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) return NextResponse.json({ error: "Cartes introuvables", invalidIds }, { status: 404 });

  const results = await Promise.all(
    cards.map(async ({ cardId, quantity, condition, language, version, foil }) => {
      if (quantity <= 0) {
        await prisma.userCard.deleteMany({ where: { userId, cardId, version: version as never } });
        return { cardId, version, action: "deleted" };
      }

      const record = await prisma.userCard.upsert({
        where:  { userId_cardId_version: { userId, cardId, version: version as never } },
        create: { userId, cardId, quantity, condition: condition as never, language: language as never, version: version as never, foil },
        update: { quantity, condition: condition as never, language: language as never, foil },
        select: { id: true, cardId: true, quantity: true, condition: true, language: true, version: true, foil: true },
      });

      return { cardId, version, action: "upserted", record };
    })
  );

  return NextResponse.json({ results });
}

// ─── DELETE /api/cards/collection ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  let deleted = 0;
  for (const { cardId, version } of parsed.data.entries) {
    const where = version
      ? { userId, cardId, version: version as never }
      : { userId, cardId };
    const { count } = await prisma.userCard.deleteMany({ where });
    deleted += count;
  }

  return NextResponse.json({ deleted });
}
