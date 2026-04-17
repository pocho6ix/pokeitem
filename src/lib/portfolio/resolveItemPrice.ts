/**
 * Resolve the "current price" to display for a PortfolioItem.
 *
 * There is NO reliable automatic price source for sealed items (unlike cards
 * which have CardMarket history). Resolution order:
 *
 *   1. The owner's manually-entered `PortfolioItem.currentPrice` — never cross-user.
 *   2. The item's retail price (MSRP) from the catalogue, as a sane default
 *      so freshly-added items don't show 0 € before the owner has typed a
 *      value.
 *   3. 0 — the owner can edit it from the detail page.
 *
 * We deliberately do NOT read `Item.currentPrice` — that column used to be
 * written cross-user and is now kept blank.
 */
export function resolveItemPrice(
  portfolioCurrentPrice: number | null | undefined,
  itemRetailPrice:       number | null | undefined,
): number {
  if (portfolioCurrentPrice != null && portfolioCurrentPrice >= 0) {
    return portfolioCurrentPrice;
  }
  if (itemRetailPrice != null && itemRetailPrice >= 0) {
    return itemRetailPrice;
  }
  return 0;
}
