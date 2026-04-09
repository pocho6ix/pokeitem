/**
 * Cardmarket French price fetcher.
 *
 * Uses the RapidAPI `cardmarket-api-tcg` endpoint, which exposes the
 * `lowest_near_mint_FR` field (the cheapest Near-Mint French card listing
 * currently on cardmarket.com). That value is exactly the "prix de la carte
 * française la moins chère" we want to display in the app.
 *
 * If the API is unreachable, the API key is missing, or a given card has no
 * French listing, the caller should fall back to `card.price` (the
 * international trend price that the existing scraper already stores).
 */

const CARDMARKET_API_HOST = "cardmarket-api-tcg.p.rapidapi.com"

function getApiKey(): string | null {
  const key = process.env.CARDMARKET_API_KEY
  return key && key.length > 0 ? key : null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CMApiCard {
  id: number
  name: string
  card_number: string
  prices?: {
    cardmarket?: {
      lowest_near_mint_FR?: number | null
      lowest_near_mint?: number | null
      "30d_average"?: number | null
    } | null
  } | null
}

export interface CMApiEpisode {
  id: number
  name: string
  code?: string
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

export async function fetchCMEpisodes(): Promise<CMApiEpisode[]> {
  const key = getApiKey()
  if (!key) return []
  try {
    const res = await fetch(
      `https://${CARDMARKET_API_HOST}/pokemon/episodes`,
      {
        headers: {
          "x-rapidapi-host": CARDMARKET_API_HOST,
          "x-rapidapi-key": key,
        },
      }
    )
    if (!res.ok) {
      console.warn(`[cardmarket-fr] episodes → HTTP ${res.status}`)
      return []
    }
    return (await res.json()) as CMApiEpisode[]
  } catch (err) {
    console.warn("[cardmarket-fr] episodes error:", err)
    return []
  }
}

export async function fetchCMCardsForEpisode(
  episodeId: number
): Promise<CMApiCard[]> {
  const key = getApiKey()
  if (!key) return []
  try {
    const res = await fetch(
      `https://${CARDMARKET_API_HOST}/pokemon/episodes/${episodeId}/cards`,
      {
        headers: {
          "x-rapidapi-host": CARDMARKET_API_HOST,
          "x-rapidapi-key": key,
        },
      }
    )
    if (!res.ok) {
      console.warn(
        `[cardmarket-fr] episode ${episodeId} cards → HTTP ${res.status}`
      )
      return []
    }
    return (await res.json()) as CMApiCard[]
  } catch (err) {
    console.warn(`[cardmarket-fr] episode ${episodeId} error:`, err)
    return []
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "001" → "1", "TG01" → "TG1", "GG01" → "GG1" */
export function normalizeCardNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}

/**
 * Returns true if the Cardmarket FR fetcher is available (API key set).
 * Use this from the cron to decide whether to run the FR pass at all.
 */
export function isFrenchPriceFetcherEnabled(): boolean {
  return getApiKey() !== null
}

/**
 * Extracts the lowest Near-Mint FR price from a CMApiCard, or null if none.
 */
export function extractLowestFr(card: CMApiCard): number | null {
  const v = card.prices?.cardmarket?.lowest_near_mint_FR
  return typeof v === "number" && v > 0 ? v : null
}
