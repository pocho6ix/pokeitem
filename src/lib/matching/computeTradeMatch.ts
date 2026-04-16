import { getCardValuesCents } from "@/lib/pricing/getCardValueCents";

export type TradeSide = {
  userId: string;
  doubles: string[];   // card_ids from UserCardDouble
  wishlist: string[];  // card_ids from CardWishlistItem
};

export type MatchResult = {
  aGivesCardIds: string[];
  bGivesCardIds: string[];
  aValueCents: number;
  bValueCents: number;
  balanceScore: number;
  isViable: boolean;
};

const MIN_VALUE_CENTS = 200; // 2€
const MIN_BALANCE = 0.7;

export async function computeTradeMatch(a: TradeSide, b: TradeSide): Promise<MatchResult> {
  const aGives = a.doubles.filter(id => b.wishlist.includes(id));
  const bGives = b.doubles.filter(id => a.wishlist.includes(id));

  if (aGives.length === 0 || bGives.length === 0) {
    return { aGivesCardIds: [], bGivesCardIds: [], aValueCents: 0, bValueCents: 0, balanceScore: 0, isViable: false };
  }

  const values = await getCardValuesCents([...new Set([...aGives, ...bGives])]);
  const aValueCents = aGives.reduce((s, id) => s + (values.get(id) ?? 0), 0);
  const bValueCents = bGives.reduce((s, id) => s + (values.get(id) ?? 0), 0);
  const maxVal = Math.max(aValueCents, bValueCents, 1);
  const balanceScore = Math.min(aValueCents, bValueCents) / maxVal;
  const isViable = balanceScore >= MIN_BALANCE && Math.min(aValueCents, bValueCents) >= MIN_VALUE_CENTS;

  return { aGivesCardIds: aGives, bGivesCardIds: bGives, aValueCents, bValueCents, balanceScore, isViable };
}
