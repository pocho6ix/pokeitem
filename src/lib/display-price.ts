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

import { CardVersion } from "@prisma/client"

export interface PriceFields {
  price?: number | null
  priceFr?: number | null
  priceReverse?: number | null
}

/**
 * Returns the best price to show to the user for a card (normal variant).
 * - priceFr if available (cheapest FR NM listing)
 * - otherwise price (international trend)
 * - otherwise null
 */
export function getDisplayPrice(card: PriceFields): number | null {
  return card.priceFr ?? card.price ?? null
}

/**
 * Returns true if the displayed price comes from the French listing.
 * Used to show the 🇫🇷 flag next to the value.
 */
export function isFrenchPrice(card: PriceFields): boolean {
  return card.priceFr != null
}

/**
 * Returns the best price for a card given its variant.
 * Used for portfolio valuation (home, dashboard, stats, chart, points…).
 */
export function getPriceForVersion(
  card: PriceFields,
  version: CardVersion | "NORMAL" | "REVERSE" | "REVERSE_POKEBALL" | "REVERSE_MASTERBALL"
): number {
  if (version === "NORMAL") {
    return card.priceFr ?? card.price ?? 0
  }
  // Reverse variants: no FR-specific field, prefer reverse trend, fallback to FR, then price
  return card.priceReverse ?? card.priceFr ?? card.price ?? 0
}
