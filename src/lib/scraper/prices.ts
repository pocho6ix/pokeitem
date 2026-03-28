// ---------------------------------------------------------------------------
// Price scraper — placeholder
// ---------------------------------------------------------------------------

export interface ScrapedPrice {
  price: number;
  source: string;
  currency: string;
  url: string;
}

/**
 * Scrape current prices for a given item from multiple sources.
 *
 * TODO: Implement actual scraping logic for CardMarket, eBay, etc.
 * This placeholder returns an empty array until the scraper is built.
 */
export async function scrapeItemPrices(
  _itemName: string
): Promise<ScrapedPrice[]> {
  // TODO: Implement price scraping from multiple marketplaces
  return [];
}
