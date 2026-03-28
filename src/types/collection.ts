// ---------------------------------------------------------------------------
// Collection-related types
// ---------------------------------------------------------------------------

import type { Item, ItemCondition, ItemType } from './item';

export interface UserItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string | null;
  condition: ItemCondition;
  notes: string | null;
  forSale: boolean;
  forTrade: boolean;
  askingPrice: number | null;
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

export interface CollectionStats {
  totalValue: number;
  totalItems: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
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

export interface CollectionActivity {
  id: string;
  type: 'added' | 'modified' | 'removed';
  itemName: string;
  quantity: number;
  date: string;
}
