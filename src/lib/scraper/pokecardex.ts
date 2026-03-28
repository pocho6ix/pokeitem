// ---------------------------------------------------------------------------
// Pokecardex scraper — placeholder
// ---------------------------------------------------------------------------

export interface ScrapedSerie {
  name: string;
  imageUrl: string;
  releaseDate: string;
  cardCount: number;
}

/**
 * Scrape series data from Pokecardex.
 *
 * TODO: Implement actual scraping logic using cheerio or puppeteer-core.
 * This placeholder returns an empty array until the scraper is built.
 */
export async function scrapeSeries(): Promise<ScrapedSerie[]> {
  // TODO: Implement Pokecardex series scraping
  return [];
}
