export interface PortfolioItemData {
  id: string;
  item: {
    id: string;
    name: string;
    slug: string;
    type: string; // BOOSTER|DUOPACK|TRIPACK|BOOSTER_BOX|ETB|BOX_SET|UPC|TIN|MINI_TIN|POKEBALL_TIN|THEME_DECK|BUNDLE|TRAINER_KIT|OTHER
    imageUrl: string | null;
    currentPrice: number | null;
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
