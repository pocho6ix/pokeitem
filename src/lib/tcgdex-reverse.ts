/**
 * TCGdex reverse holo price fetcher.
 *
 * Uses the public https://api.tcgdex.net/v2/fr endpoints which expose
 * Cardmarket "holo" (= reverse) prices under `pricing.cardmarket["trend-holo"]`.
 *
 * NOTE: tcgdex returns **global** Cardmarket prices, not FR-specific lowest.
 * This is the only currently-available source for reverse prices since:
 *   - the official Cardmarket API is blocked (no new app tokens issued),
 *   - the RapidAPI wrapper does not expose any reverse/holo field,
 *   - pokemontcg.io has zero price coverage on Mega Evolution era sets.
 *
 * We accept the global caveat and surface it in the UI ("prix reverse :
 * marché global"). If/when we regain official Cardmarket API access, we can
 * swap this source for a FR-specific one without touching consumers.
 */

const TCGDEX_BASE = "https://api.tcgdex.net/v2/fr"

interface TCGdexCardPricing {
  pricing?: {
    cardmarket?: {
      trend?: number | null
      low?: number | null
      "trend-holo"?: number | null
      "low-holo"?: number | null
    } | null
  } | null
}

interface TCGdexSetResponse {
  cards?: Array<{ id?: string; localId?: string }>
}

export interface TCGdexReversePrice {
  localId: string       // "198" (as returned by tcgdex, may be padded)
  trendHolo: number | null
  lowHolo: number | null
}

/**
 * Fetch reverse prices for every card in a tcgdex set.
 * Returns a map keyed by localId (both raw and normalized forms are inserted
 * so callers can look up "198", "198a", "TG01", etc. without worrying about
 * zero-padding).
 */
export async function fetchTCGdexReverseForSet(
  setId: string
): Promise<Map<string, TCGdexReversePrice>> {
  const map = new Map<string, TCGdexReversePrice>()
  try {
    const setRes = await fetch(`${TCGDEX_BASE}/sets/${setId}`)
    if (!setRes.ok) {
      console.warn(`[tcgdex-reverse] set ${setId} → HTTP ${setRes.status}`)
      return map
    }
    const setData = (await setRes.json()) as TCGdexSetResponse
    const cards = setData.cards ?? []

    const BATCH = 5
    for (let i = 0; i < cards.length; i += BATCH) {
      const batch = cards.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (c) => {
          const localId = c.localId
          if (!localId) return
          try {
            const r = await fetch(`${TCGDEX_BASE}/cards/${setId}-${localId}`)
            if (!r.ok) return
            const d = (await r.json()) as TCGdexCardPricing
            const cm = d?.pricing?.cardmarket
            const trendHolo = typeof cm?.["trend-holo"] === "number" && cm["trend-holo"]! > 0
              ? cm["trend-holo"]!
              : null
            const lowHolo = typeof cm?.["low-holo"] === "number" && cm["low-holo"]! > 0
              ? cm["low-holo"]!
              : null
            if (trendHolo === null && lowHolo === null) return

            const entry: TCGdexReversePrice = { localId, trendHolo, lowHolo }
            map.set(localId, entry)
            map.set(normalizeLocalId(localId), entry)
          } catch {
            /* ignore per-card errors */
          }
        })
      )
      await new Promise((r) => setTimeout(r, 100))
    }
  } catch (err) {
    console.warn(`[tcgdex-reverse] set ${setId} error:`, err)
  }
  return map
}

/** "001" → "1", "TG01" → "TG1" */
export function normalizeLocalId(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2")
}
