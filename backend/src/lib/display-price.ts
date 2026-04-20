/**
 * Central helper to compute the price to display / use for valuation.
 *
 * PokeItem is a 100 % French-cards app. We prefer the cheapest French NM
 * listing from Cardmarket (`priceFr`) when available, and fall back to the
 * international trend price (`price`) when no French listing exists.
 *
 * For the reverse variant, Cardmarket doesn't expose a FR-specific field,
 * so we use `priceReverse` first, then `priceFr`, then `price`.
 */

import { CardVersion } from "@prisma/client";

export interface PriceFields {
  price?: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
  priceFirstEdition?: number | null;
}

export function getDisplayPrice(card: PriceFields): number | null {
  return card.priceFr ?? card.price ?? null;
}

export function isFrenchPrice(card: PriceFields): boolean {
  return card.priceFr != null;
}

export function getPriceForVersion(
  card: PriceFields,
  version: CardVersion | "NORMAL" | "REVERSE" | "REVERSE_POKEBALL" | "REVERSE_MASTERBALL" | "FIRST_EDITION"
): number {
  if (version === "NORMAL") {
    return card.priceFr ?? card.price ?? 0;
  }
  if (version === "FIRST_EDITION") {
    return card.priceFirstEdition ?? card.priceFr ?? card.price ?? 0;
  }
  return card.priceReverse ?? card.priceFr ?? card.price ?? 0;
}
