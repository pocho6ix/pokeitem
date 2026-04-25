/**
 * Resolve the "current price" to display for a PortfolioItem.
 *
 * Priority (most authoritative first):
 *
 *   1. `marketPrice` — Cardmarket scraped/API value (`Item.priceFrom`).
 *      Fresh, cross-user, ground truth when the item is matched.
 *   2. `portfolioCurrentPrice` — the owner's manually-entered fallback.
 *      Used only when we have no CM listing for this item (unmatched or
 *      auto_low items still pending admin review).
 *   3. `itemRetailPrice` — MSRP, last-resort default so freshly-added items
 *      don't show 0 € before any pricing data lands.
 *   4. 0.
 *
 * We deliberately do NOT read `Item.currentPrice` — that column used to be
 * written cross-user and is now kept blank.
 */
export function resolveItemPrice(
  marketPrice:           number | null | undefined,
  portfolioCurrentPrice: number | null | undefined,
  itemRetailPrice:       number | null | undefined,
): number {
  if (marketPrice != null && marketPrice >= 0) {
    return marketPrice;
  }
  if (portfolioCurrentPrice != null && portfolioCurrentPrice >= 0) {
    return portfolioCurrentPrice;
  }
  if (itemRetailPrice != null && itemRetailPrice >= 0) {
    return itemRetailPrice;
  }
  return 0;
}
