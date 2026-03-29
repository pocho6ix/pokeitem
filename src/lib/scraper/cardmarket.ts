// ---------------------------------------------------------------------------
// CardMarket price scraper for sealed Pokémon TCG products
// Scrapes prices from cardmarket.com product pages
// ---------------------------------------------------------------------------

export interface CardMarketPrice {
  priceTrend: number | null;
  priceFrom: number | null;
  availableSellers: number | null;
  productUrl: string;
  lastUpdated: Date;
}

/**
 * Build a CardMarket search URL for a sealed product.
 * CardMarket uses the pattern: /en/Pokemon/Products/Singles|Booster-Boxes|...
 * For sealed products, we search via their search endpoint.
 */
function buildSearchUrl(itemName: string, serieName?: string): string {
  const query = serieName ? `${serieName} ${itemName}` : itemName;
  const encoded = encodeURIComponent(query);
  return `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encoded}`;
}

/**
 * Scrape price data from a CardMarket product page HTML.
 * Extracts "Price Trend" and "From" price from the info table.
 */
function parsePriceFromHtml(html: string): Omit<CardMarketPrice, "productUrl" | "lastUpdated"> {
  let priceTrend: number | null = null;
  let priceFrom: number | null = null;
  let availableSellers: number | null = null;

  // Extract price trend: look for "Price Trend" followed by a price
  const trendMatch = html.match(
    /Price Trend[\s\S]*?(\d+[.,]\d{2})\s*&euro;/i
  ) || html.match(
    /Price Trend[\s\S]*?(\d+[.,]\d{2})\s*€/i
  );
  if (trendMatch) {
    priceTrend = parseFloat(trendMatch[1].replace(",", "."));
  }

  // Extract "From" price
  const fromMatch = html.match(
    /From[\s\S]*?(\d+[.,]\d{2})\s*&euro;/i
  ) || html.match(
    /class="color-primary[^"]*"[^>]*>(\d+[.,]\d{2})\s*€/i
  );
  if (fromMatch) {
    priceFrom = parseFloat(fromMatch[1].replace(",", "."));
  }

  // Extract available sellers count
  const sellersMatch = html.match(/(\d+)\s*(?:Sellers?|Vendeurs?|Articles?)/i);
  if (sellersMatch) {
    availableSellers = parseInt(sellersMatch[1]);
  }

  return { priceTrend, priceFrom, availableSellers };
}

/**
 * Extract the first product URL from a CardMarket search results page.
 */
function extractProductUrl(html: string): string | null {
  // CardMarket search results have links like /en/Pokemon/Products/...
  const match = html.match(
    /href="(\/en\/Pokemon\/Products\/[^"]+)"/
  );
  return match ? `https://www.cardmarket.com${match[1]}` : null;
}

/**
 * Fetch a URL with appropriate headers to avoid blocks.
 */
async function fetchWithHeaders(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error(`CardMarket fetch failed: ${res.status}`);
  }

  return res.text();
}

/**
 * Scrape current price for a Pokémon TCG sealed product from CardMarket.
 * First searches for the product, then scrapes the product page.
 */
export async function scrapeCardMarketPrice(
  itemName: string,
  serieName?: string,
  cardmarketUrl?: string | null
): Promise<CardMarketPrice | null> {
  try {
    let productUrl = cardmarketUrl || null;

    // If no direct URL, search for the product
    if (!productUrl) {
      const searchUrl = buildSearchUrl(itemName, serieName);
      const searchHtml = await fetchWithHeaders(searchUrl);
      productUrl = extractProductUrl(searchHtml);

      if (!productUrl) {
        return null;
      }
    }

    // Fetch the product page
    const productHtml = await fetchWithHeaders(productUrl);
    const prices = parsePriceFromHtml(productHtml);

    return {
      ...prices,
      productUrl,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("CardMarket scraping error:", error);
    return null;
  }
}
