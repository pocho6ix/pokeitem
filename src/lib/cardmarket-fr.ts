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
  card_number: number | string  // API returns a number (e.g. 9), not a string
  cardmarket_id?: number | null
  prices?: {
    cardmarket?: {
      lowest_near_mint_FR?: number | null
      lowest_near_mint?: number | null
      "30d_average"?: number | null
    } | null
  } | null
}

/** One day of CM API price history */
export interface CMHistoryDay {
  date: string        // "YYYY-MM-DD"
  cmLow: number | null
}

/** Raw CM API response: date → { cm_low, tcg_player_market } */
interface CMHistoryRawDay {
  cm_low?: number | null
  tcg_player_market?: number | null
}

export interface CMApiEpisode {
  id: number
  name: string
  code?: string
  series?: { name: string; slug: string } | null
}

// ─── Paginated response wrapper (API returns { data: [...] }) ─────────────────
interface CMApiResponse<T> {
  data: T[]
}

// ─── Fetchers (with auto-pagination) ─────────────────────────────────────────

interface CMPaging { current: number; total: number; per_page: number }
interface CMPagedResponse<T> { data: T[]; paging?: CMPaging; results?: number }

async function fetchAllPages<T>(
  buildUrl: (page: number) => string,
  label: string
): Promise<T[]> {
  const key = getApiKey()
  if (!key) return []
  const all: T[] = []
  let page = 1

  while (true) {
    try {
      const res = await fetch(buildUrl(page), {
        headers: {
          "x-rapidapi-host": CARDMARKET_API_HOST,
          "x-rapidapi-key": key,
        },
      })
      if (!res.ok) {
        console.warn(`[cardmarket-fr] ${label} p${page} → HTTP ${res.status}`)
        break
      }
      const body = (await res.json()) as CMPagedResponse<T> | T[]
      const items: T[] = Array.isArray(body) ? body : (body.data ?? [])
      all.push(...items)

      const paging = Array.isArray(body) ? null : body.paging
      if (!paging || paging.current >= paging.total) break
      page++
      await new Promise((r) => setTimeout(r, 150))
    } catch (err) {
      console.warn(`[cardmarket-fr] ${label} error:`, err)
      break
    }
  }

  return all
}

export async function fetchCMEpisodes(): Promise<CMApiEpisode[]> {
  return fetchAllPages<CMApiEpisode>(
    (page) =>
      `https://${CARDMARKET_API_HOST}/pokemon/episodes?per_page=100&page=${page}`,
    "episodes"
  )
}

export async function fetchCMCardsForEpisode(
  episodeId: number
): Promise<CMApiCard[]> {
  return fetchAllPages<CMApiCard>(
    (page) =>
      `https://${CARDMARKET_API_HOST}/pokemon/episodes/${episodeId}/cards?per_page=100&page=${page}`,
    `episode-${episodeId}`
  )
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

/**
 * Fetches historical price data for a card by its CM API internal ID.
 * Returns an array sorted oldest → newest.
 */
export async function fetchCardHistory(cmApiCardId: number): Promise<CMHistoryDay[]> {
  const key = getApiKey()
  if (!key) return []

  const days: CMHistoryDay[] = []
  let page = 1

  while (true) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(
        `https://${CARDMARKET_API_HOST}/pokemon/cards/${cmApiCardId}/history-prices?per_page=100&page=${page}`,
        {
          headers: {
            "x-rapidapi-host": CARDMARKET_API_HOST,
            "x-rapidapi-key": key,
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timer)
      if (!res.ok) break

      const body = (await res.json()) as {
        data?: Record<string, CMHistoryRawDay>
        paging?: { current: number; total: number }
        results?: number
      }

      const raw = body.data ?? {}
      for (const [date, val] of Object.entries(raw)) {
        const cmLow = typeof val.cm_low === "number" ? val.cm_low : null
        days.push({ date, cmLow })
      }

      const paging = body.paging
      if (!paging || paging.current >= paging.total) break
      page++
      await new Promise((r) => setTimeout(r, 150))
    } catch (err) {
      console.warn(`[cardmarket-fr] history ${cmApiCardId} error:`, err)
      break
    }
  }

  // Sort oldest first
  days.sort((a, b) => a.date.localeCompare(b.date))
  return days
}
