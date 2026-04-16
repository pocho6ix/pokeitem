import { prisma } from "@/lib/prisma";

/**
 * Returns the value in cents for a single card.
 * Priority: priceFr > price > 0
 * Uses the Card model's existing price fields.
 */
export async function getCardValueCents(cardId: string): Promise<number> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { priceFr: true, price: true },
  });
  if (!card) return 0;
  const price = card.priceFr ?? card.price ?? 0;
  return Math.round(price * 100);
}

/**
 * Batch version — single SQL query for N cards.
 */
export async function getCardValuesCents(cardIds: string[]): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map();
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    select: { id: true, priceFr: true, price: true },
  });
  const map = new Map<string, number>();
  for (const card of cards) {
    const price = card.priceFr ?? card.price ?? 0;
    map.set(card.id, Math.round(price * 100));
  }
  return map;
}
