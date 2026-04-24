/**
 * Cardmarket items matching — reusable core.
 *
 * Extracted from the Phase 1 audit script so both the CLI matching job and
 * the Phase 3 admin dashboard share the exact same logic.
 *
 * Pipeline, per item:
 *
 *   DB.Serie (FR)  ─▶ episode.slug (EN) ─▶ products of that episode ─▶ scored
 *
 * Nothing here touches the DB. The caller feeds in the items + series and
 * decides what to persist.
 *
 * API source: RapidAPI `cardmarket-api-tcg.p.rapidapi.com` — same key as the
 * existing cards flow (see src/lib/cardmarket-fr.ts, scripts/backfill-cm-history.ts).
 */

import * as fs from "fs"
import type { ItemType } from "@prisma/client"
import {
  SERIE_SLUG_FR_TO_CM_EPISODE_SLUG,
  PRODUCT_TYPE_RULES,
} from "@/data/cardmarket-mapping"

// ─── API types ──────────────────────────────────────────────────────────────

export interface CMEpisode {
  id: number
  name: string
  slug: string
  code?: string
  released_at?: string
}

export interface CMPrices {
  currency?: string
  lowest?: number | null
  lowest_FR?: number | null
  lowest_EU_only?: number | null
  lowest_FR_EU_only?: number | null
  "30d_average"?: number | null
  "7d_average"?: number | null
}

export interface CMProduct {
  id: number
  name: string
  slug: string
  cardmarket_id: number | null
  tcgplayer_id?: number | null
  image?: string
  prices?: { cardmarket?: CMPrices | null } | null
  episode: CMEpisode
  links?: { cardmarket?: string | null } | null
  tcggo_url?: string | null
}

// ─── String normalization ───────────────────────────────────────────────────

/** Accent-insensitive, ASCII, token-sorted, for fuzzy equality. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ")
}

/** Accent-insensitive, ASCII, single-space, for exact-ish equality. */
export function simpleKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// ─── API pagination ─────────────────────────────────────────────────────────

const HOST = "cardmarket-api-tcg.p.rapidapi.com"

export interface FetchOpts {
  apiKey: string
  cacheFile?: string
  /** Skip the network entirely if a cache file is present. */
  useCache?: boolean
  /** Verbose page-by-page log. */
  verbose?: boolean
}

export async function fetchAllCMProducts(opts: FetchOpts): Promise<CMProduct[]> {
  if (opts.useCache && opts.cacheFile && fs.existsSync(opts.cacheFile)) {
    return JSON.parse(fs.readFileSync(opts.cacheFile, "utf-8"))
  }

  const all: CMProduct[] = []
  let page = 1
  while (true) {
    const url = `https://${HOST}/pokemon/products?page=${page}&per_page=100`
    const res = await fetch(url, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": opts.apiKey },
    })
    if (!res.ok) {
      console.warn(`  ⚠ /pokemon/products page=${page} → HTTP ${res.status}`)
      break
    }
    const body = (await res.json()) as {
      data: CMProduct[]
      paging?: { current: number; total: number }
    }
    all.push(...body.data)
    if (opts.verbose) {
      console.log(`  page ${page}/${body.paging?.total ?? "?"} — ${body.data.length} produits (cumul ${all.length})`)
    }
    const paging = body.paging
    if (!paging || paging.current >= paging.total) break
    page++
    await new Promise((r) => setTimeout(r, 150))
  }

  if (opts.cacheFile) fs.writeFileSync(opts.cacheFile, JSON.stringify(all))
  return all
}

export function extractEpisodes(products: CMProduct[]): CMEpisode[] {
  return Array.from(new Map(products.map((p) => [p.episode.slug, p.episode])).values())
}

export function groupProductsByEpisode(products: CMProduct[]): Map<string, CMProduct[]> {
  const m = new Map<string, CMProduct[]>()
  for (const p of products) {
    const arr = m.get(p.episode.slug) ?? []
    arr.push(p)
    m.set(p.episode.slug, arr)
  }
  return m
}

// ─── Serie → Episode ────────────────────────────────────────────────────────

export type SerieMatchReason = "override" | "exact-name" | "fuzzy-name" | "unmatched"

export interface SerieInput {
  id: string
  slug: string
  name: string
  nameEn: string | null
}

export interface SerieMatch {
  serieId: string
  serieSlug: string
  nameFr: string
  nameEn: string | null
  resolvedEpisodeSlug: string | null
  reason: SerieMatchReason
  /** Top-ranked candidates (only populated when `reason === "unmatched"`). */
  candidates: Array<{ slug: string; name: string; score: number }>
}

export function matchSerieToEpisode(
  serie: SerieInput,
  episodes: CMEpisode[]
): SerieMatch {
  const out: SerieMatch = {
    serieId: serie.id,
    serieSlug: serie.slug,
    nameFr: serie.name,
    nameEn: serie.nameEn,
    resolvedEpisodeSlug: null,
    reason: "unmatched",
    candidates: [],
  }

  // 1) Static override (FR slug → EN slug)
  if (SERIE_SLUG_FR_TO_CM_EPISODE_SLUG[serie.slug]) {
    out.resolvedEpisodeSlug = SERIE_SLUG_FR_TO_CM_EPISODE_SLUG[serie.slug]
    out.reason = "override"
    return out
  }

  if (!serie.nameEn) return out

  // 2) Exact normalized nameEn ↔ episode.name
  const needleExact = simpleKey(serie.nameEn)
  const exact = episodes.find((e) => simpleKey(e.name) === needleExact)
  if (exact) {
    out.resolvedEpisodeSlug = exact.slug
    out.reason = "exact-name"
    return out
  }

  // 3) Token-sorted fuzzy
  const needleFuzzy = normalizeName(serie.nameEn)
  const fuzzy = episodes.find((e) => normalizeName(e.name) === needleFuzzy)
  if (fuzzy) {
    out.resolvedEpisodeSlug = fuzzy.slug
    out.reason = "fuzzy-name"
    return out
  }

  // 4) Rank close candidates (token overlap) for the gap report
  const needleTokens = new Set(
    normalizeName(serie.nameEn).split(" ").filter((t) => t.length >= 3)
  )
  out.candidates = episodes
    .map((e) => {
      const epTokens = new Set(
        normalizeName(e.name).split(" ").filter((t) => t.length >= 3)
      )
      let overlap = 0
      for (const t of needleTokens) if (epTokens.has(t)) overlap++
      return { slug: e.slug, name: e.name, score: overlap }
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  return out
}

// ─── Item → Products ────────────────────────────────────────────────────────

export type ItemVerdict = "no-episode" | "no-candidates" | "single" | "multiple"

export interface ItemInput {
  id: string
  name: string
  slug: string
  type: ItemType
  serieId: string
  serieSlug: string
  serieName: string
}

export interface ItemMatch {
  item: ItemInput
  episodeSlug: string | null
  verdict: ItemVerdict
  candidates: CMProduct[]
}

/** Returns 1 if the product name passes the type rule, else 0. */
export function scoreProductForType(productName: string, type: ItemType): number {
  const rule = PRODUCT_TYPE_RULES[type]
  if (!rule || rule.positive.length === 0) return 0
  for (const neg of rule.negative) if (neg.test(productName)) return 0
  for (const pos of rule.positive) if (pos.test(productName)) return 1
  return 0
}

export function matchItemToProducts(
  item: ItemInput,
  episodeSlug: string | null,
  productsByEpisode: Map<string, CMProduct[]>
): ItemMatch {
  if (!episodeSlug) {
    return { item, episodeSlug: null, verdict: "no-episode", candidates: [] }
  }
  const pool = productsByEpisode.get(episodeSlug) ?? []
  if (pool.length === 0) {
    return { item, episodeSlug, verdict: "no-candidates", candidates: [] }
  }
  const matched = pool.filter((p) => scoreProductForType(p.name, item.type) > 0)
  const verdict: ItemVerdict =
    matched.length === 0 ? "no-candidates" : matched.length === 1 ? "single" : "multiple"
  return { item, episodeSlug, verdict, candidates: matched }
}

// ─── Confidence bucket ──────────────────────────────────────────────────────

export type Confidence = "auto_high" | "auto_low" | "unmatched"

export function decideConfidence(verdict: ItemVerdict): Confidence {
  if (verdict === "single") return "auto_high"
  if (verdict === "multiple") return "auto_low"
  return "unmatched"
}

// ─── Price extraction ───────────────────────────────────────────────────────
//
// Mapping chosen to mirror Cardmarket's own product-page UX:
//   priceFrom    → prices.cardmarket.lowest_FR        (cheapest active FR listing)
//   priceTrend   → prices.cardmarket["30d_average"]   (stable trend)
//   currentPrice → prices.cardmarket["30d_average"]   (display value, stable)
//
// `lowest_FR` is preferred over `lowest` because Pokeitem is FR-first. When
// `lowest_FR` is null (no active FR listing), we fall back to `lowest` so the
// field stays populated. UI can surface the distinction via a flag later.

export interface ExtractedPrice {
  priceFrom: number | null
  priceTrend: number | null
  currentPrice: number | null
  currency: string
}

export function extractPrices(product: CMProduct): ExtractedPrice {
  const cm = product.prices?.cardmarket ?? null
  const priceFrom = cm?.lowest_FR ?? cm?.lowest ?? null
  const priceTrend = cm?.["30d_average"] ?? null
  const currentPrice = priceTrend ?? priceFrom
  return {
    priceFrom: numOrNull(priceFrom),
    priceTrend: numOrNull(priceTrend),
    currentPrice: numOrNull(currentPrice),
    currency: cm?.currency ?? "EUR",
  }
}

function numOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && v > 0 ? v : null
}

// ─── Candidate serialization (for Item.cardmarketCandidates) ────────────────

export interface StoredCandidate {
  cardmarketId: number | null
  productId: number
  name: string
  /** TCGGO redirect — canonical CM URL is harvested separately (Phase 2 puppeteer). */
  url: string | null
  priceFrom: number | null
  priceTrend: number | null
}

export function candidateFromProduct(p: CMProduct): StoredCandidate {
  const prices = extractPrices(p)
  return {
    cardmarketId: p.cardmarket_id,
    productId: p.id,
    name: p.name,
    url: p.links?.cardmarket ?? null,
    priceFrom: prices.priceFrom,
    priceTrend: prices.priceTrend,
  }
}
