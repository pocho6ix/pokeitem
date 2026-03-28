// ---------------------------------------------------------------------------
// Market / price-tracking types
// ---------------------------------------------------------------------------

import type { ItemCondition, ItemType } from './item';

export interface MarketListing {
  id: string;
  itemId: string;
  title: string;
  price: number;
  currency: string;
  source: string;
  sourceUrl: string;
  imageUrl: string | null;
  seller: string | null;
  condition: ItemCondition | null;
  isAvailable: boolean;
  scrapedAt: string;
}

export interface MarketFilters {
  search: string | null;
  source: string | null;
  type: ItemType | null;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy:
    | 'price_asc'
    | 'price_desc'
    | 'date_asc'
    | 'date_desc'
    | 'relevance'
    | null;
}
