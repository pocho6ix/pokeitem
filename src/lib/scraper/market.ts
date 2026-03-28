// ---------------------------------------------------------------------------
// Market listing scraper — placeholder
// ---------------------------------------------------------------------------

import type { ItemCondition } from "@/types";

export interface ScrapedListing {
  id: string;
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

/**
 * Scrape market listings matching a search query.
 *
 * TODO: Implement actual scraping logic for marketplace listings.
 * This placeholder returns an empty array until the scraper is built.
 */
export async function scrapeMarketListings(
  _query: string
): Promise<ScrapedListing[]> {
  // TODO: Implement market listing scraping
  return [];
}
