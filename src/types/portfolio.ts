export interface PortfolioItemData {
  id: string;
  /**
   * Per-user current valuation. `null` if the owner hasn't set one yet — the UI
   * falls back to `item.retailPrice` via `resolveItemPrice` in that case.
   * Never a shared value: editing this never affects other users.
   */
  currentPrice: number | null;
  currentPriceUpdatedAt: string | null;
  item: {
    id: string;
    name: string;
    slug: string;
    type: string; // BOOSTER|DUOPACK|TRIPACK|BOOSTER_BOX|ETB|BOX_SET|UPC|TIN|MINI_TIN|POKEBALL_TIN|THEME_DECK|BUNDLE|TRAINER_KIT|OTHER
    imageUrl: string | null;
    /** @deprecated Use `currentPrice` on the outer row — the shared column is blank. */
    currentPrice?: number | null;
    priceTrend: number | null;
    priceFrom: number | null;
    priceUpdatedAt: string | null;
    lastScrapedAt: string | null;
    cardmarketUrl: string | null;
    retailPrice: number | null;
    serie?: { name: string; bloc?: { name: string } };
  };
  quantity: number;
  purchasePrice: number; // total (unitaire × qté)
  purchasePricePerUnit: number;
  purchaseDate: string | null;
  currentValue: number;
  currentValuePerUnit: number;
  pnl: number;
  pnlPercent: number;
  notes: string | null;
  createdAt: string; // ISO string, for "Récent" sort
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  itemCount: number;
  uniqueItemCount: number;
}
