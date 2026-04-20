/**
 * Resolve the "current price" to display for a PortfolioItem.
 *
 * Resolution order:
 *   1. The owner's manually-entered `PortfolioItem.currentPrice`
 *   2. The item's retail price (MSRP)
 *   3. 0
 */
export function resolveItemPrice(
  portfolioCurrentPrice: number | null | undefined,
  itemRetailPrice: number | null | undefined
): number {
  if (portfolioCurrentPrice != null && portfolioCurrentPrice >= 0) {
    return portfolioCurrentPrice;
  }
  if (itemRetailPrice != null && itemRetailPrice >= 0) {
    return itemRetailPrice;
  }
  return 0;
}
