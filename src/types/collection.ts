// ---------------------------------------------------------------------------
// Portfolio-related types
// ---------------------------------------------------------------------------

import type { Item, ItemCondition, ItemType } from './item';

export type PriceType = 'RETAIL' | 'CUSTOM';

export interface PortfolioItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  purchasePrice: number | null;
  priceType: PriceType;
  purchaseDate: string | null;
  condition: ItemCondition;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Item;
}

export interface WishlistItem {
  id: string;
  userId: string;
  itemId: string;
  maxPrice: number | null;
  notify: boolean;
  createdAt: string;
  item?: Item;
}

export interface PortfolioStats {
  totalValue: number;
  totalItems: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
  variation24h: number;
  variation24hPercent: number;
  distributionByType: Record<ItemType, number>;
  distributionBySerie: Record<string, number>;
  topPerformers: Array<{
    item: Item;
    purchasePrice: number;
    currentPrice: number;
    profitLoss: number;
    profitLossPercent: number;
  }>;
}

export interface PortfolioActivity {
  id: string;
  type: 'added' | 'modified' | 'removed';
  itemName: string;
  quantity: number;
  date: string;
}
