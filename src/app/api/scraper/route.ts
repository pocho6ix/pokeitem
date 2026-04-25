import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTcgdexRarity, isSpecialCard } from "@/lib/pokemon/card-variants";
import {
  fetchCMEpisodes,
  fetchCMCardsForEpisode,
  fetchCardHistory,
  isFrenchPriceFetcherEnabled,
  extractLowestFr,
  normalizeCardNumber,
} from "@/lib/cardmarket-fr";
import { fetchTCGdexReverseForSet } from "@/lib/tcgdex-reverse";

// ---------------------------------------------------------------------------
// Mapping slug → TCGdex set ID (FR sets)
// ---------------------------------------------------------------------------
const SLUG_TO_TCGDEX: Record<string, string> = {
  "mega-evolution": "me01",
  "flammes-fantasmagoriques": "me02",
  "heros-transcendants": "me02.5",
  "equilibre-parfait": "me03",
  "ecarlate-et-violet": "sv01",
  "evolutions-a-paldea": "sv02",
  "flammes-obsidiennes": "sv03",
  "pokemon-151": "sv03.5",
  "faille-paradoxe": "sv04",
  "destinees-de-paldea": "sv04.5",
  "forces-temporelles": "sv05",
  "mascarade-crepusculaire": "sv06",
  "fable-nebuleuse": "sv06.5",
  "couronne-stellaire": "sv07",
  "etincelles-deferlantes": "sv08",
  "evolutions-prismatiques": "sv08.5",
  "aventures-ensemble": "sv09",
  "rivalites-destinees": "sv10",
  "foudre-noire": "sv10.5b",
  "flamme-blanche": "sv10.5w",
};

// Mapping slug → PTCGIO set ID (international sets)
const SLUG_TO_PTCG: Record<string, string> = {
  "ecarlate-et-violet": "sv1",
  "evolutions-a-paldea": "sv2",
  "flammes-obsidiennes": "sv3",
  "pokemon-151": "sv3pt5",
  "faille-paradoxe": "sv4",
  "destinees-de-paldea": "sv4pt5",
  "forces-temporelles": "sv5",
  "mascarade-crepusculaire": "sv6",
  "fable-nebuleuse": "sv6pt5",
  "couronne-stellaire": "sv7",
  "etincelles-deferlantes": "sv8",
  "evolutions-prismatiques": "sv8pt5",
  "aventures-ensemble": "sv9",
  "rivalites-destinees": "sv10",
};

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

// ---------------------------------------------------------------------------
// TCGdex price fetcher
// ---------------------------------------------------------------------------
interface TCGdexCardPricing {
  pricing?: {
    cardmarket?: {
      trend?: number | null;
      "trend-holo"?: number | null;
    } | null;
  } | null;
}

async function fetchTCGdexPrices(setId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const setRes = await fetch(`https://api.tcgdex.net/v2/fr/sets/${setId}`);
    if (!setRes.ok) return map;
    const setData = await setRes.json();
    const cards = setData.cards ?? [];
    const BATCH = 5;
    for (let i = 0; i < cards.length; i += BATCH) {
      const batch = cards.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (c: { localId: string }) => {
          try {
            const r = await fetch(`https://api.tcgdex.net/v2/fr/cards/${setId}-${c.localId}`);
            if (!r.ok) return;
            const d = (await r.json()) as TCGdexCardPricing;
            const cm = d?.pricing?.cardmarket;
            const price = cm?.trend ?? cm?.["trend-holo"] ?? null;
            if (price !== null) {
              map.set(c.localId, price);
              map.set(normalizeNumber(c.localId), price);
            }
          } catch {}
        })
      );
      await new Promise((r) => setTimeout(r, 100));
    }
  } catch {}
  return map;
}

// ---------------------------------------------------------------------------
// PTCGIO price fetcher
// ---------------------------------------------------------------------------
interface PTCGCard {
  number: string;
  cardmarket?: { prices?: { trendPrice?: number | null; averageSellPrice?: number | null } | null } | null;
}

async function fetchPTCGPrices(setId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let page = 1;
  while (true) {
    try {
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=number,cardmarket`
      );
      if (!res.ok) break;
      const json = await res.json();
      const cards: PTCGCard[] = json.data ?? [];
      for (const card of cards) {
        const price = card.cardmarket?.prices?.trendPrice ?? card.cardmarket?.prices?.averageSellPrice ?? null;
        if (price !== null) {
          map.set(normalizeNumber(card.number), price);
          map.set(card.number, price);
        }
      }
      if (cards.length < 250 || (json.data?.length ?? 0) >= (json.totalCount ?? 0)) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      break;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main update logic
// ---------------------------------------------------------------------------
async function updatePrices(): Promise<{ setsProcessed: number; cardsUpdated: number; historyRecords: number }> {
  const allSlugs = new Set([...Object.keys(SLUG_TO_PTCG), ...Object.keys(SLUG_TO_TCGDEX)]);
  const series = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(series.map((s) => [s.slug, s.id]));

  let setsProcessed = 0;
  let cardsUpdated = 0;
  let historyRecords = 0;

  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const slug of allSlugs) {
    const serieId = serieBySlug.get(slug);
    if (!serieId) continue;

    // Build price map
    const ptcgId = SLUG_TO_PTCG[slug];
    const tcgdexId = SLUG_TO_TCGDEX[slug];
    let priceMap = new Map<string, number>();
    let source = "ptcgio";

    if (ptcgId) {
      priceMap = await fetchPTCGPrices(ptcgId);
    }
    if (tcgdexId && priceMap.size === 0) {
      priceMap = await fetchTCGdexPrices(tcgdexId);
      source = "tcgdex";
    }
    if (priceMap.size === 0) continue;

    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    });

    const updates: Array<{ id: string; price: number }> = [];
    for (const dbCard of dbCards) {
      const price = priceMap.get(dbCard.number) ?? priceMap.get(normalizeNumber(dbCard.number));
      if (price != null) updates.push({ id: dbCard.id, price });
    }

    const CHUNK = 50;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: { price: u.price, priceUpdatedAt: now },
          })
        )
      );
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: { cardId: u.id, price: u.price, source, recordedAt },
            update: { price: u.price, source },
          })
        )
      );
    }

    setsProcessed++;
    cardsUpdated += updates.length;
    historyRecords += updates.length;
    await new Promise((r) => setTimeout(r, 150));
  }

  return { setsProcessed, cardsUpdated, historyRecords };
}

// ---------------------------------------------------------------------------
// Reverse holo price pass — uses tcgdex.net
//
// tcgdex is the only source currently exposing Cardmarket "holo" (= reverse)
// prices via `pricing.cardmarket["trend-holo"]`. Prices are GLOBAL, not
// FR-specific — UI surfaces that caveat. Cards with special rarities
// (EX/IR/SAR/HR/MUR/MAR/ACE/Promo) do not have a reverse variant and are
// skipped.
// ---------------------------------------------------------------------------
async function updateReversePrices(): Promise<{
  setsProcessed: number;
  cardsReverseUpdated: number;
}> {
  const series = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const serieBySlug = new Map(series.map((s) => [s.slug, s.id]));

  let setsProcessed = 0;
  let cardsReverseUpdated = 0;

  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const [slug, tcgdexId] of Object.entries(SLUG_TO_TCGDEX)) {
    const serieId = serieBySlug.get(slug);
    if (!serieId) continue;

    const reverseMap = await fetchTCGdexReverseForSet(tcgdexId);
    if (reverseMap.size === 0) continue;

    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true, rarity: true },
    });

    const updates: Array<{ id: string; priceReverse: number }> = [];
    for (const dbCard of dbCards) {
      // Special rarities don't have reverse variants — skip to avoid polluting
      // the column with global prices that don't apply to the card's actual variant.
      // Cast: Prisma's generated CardRarity is value-compatible with the one
      // in @/types/card (same enum strings); TS sees them as distinct nominal types.
      if (isSpecialCard(dbCard.rarity as unknown as Parameters<typeof isSpecialCard>[0])) continue;
      const entry =
        reverseMap.get(dbCard.number) ?? reverseMap.get(normalizeNumber(dbCard.number));
      if (!entry) continue;
      const priceReverse = entry.trendHolo ?? entry.lowHolo;
      if (priceReverse == null) continue;
      updates.push({ id: dbCard.id, priceReverse });
    }

    const CHUNK = 50;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: { priceReverse: u.priceReverse },
          })
        )
      );
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: {
              cardId: u.id,
              price: u.priceReverse, // seed required `price` column if row doesn't exist yet
              priceReverse: u.priceReverse,
              source: "tcgdex-reverse",
              recordedAt,
            },
            update: { priceReverse: u.priceReverse },
          })
        )
      );
    }

    setsProcessed++;
    cardsReverseUpdated += updates.length;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `[scraper] 🔄 Reverse: ${setsProcessed} séries · ${cardsReverseUpdated} prix reverse`
  );
  return { setsProcessed, cardsReverseUpdated };
}

// ---------------------------------------------------------------------------
// FR price pass — uses cardmarket-api-tcg (RapidAPI).
//
// Matching strategy: CM cards carry a `tcgid` field (e.g. "sv3pt5-9").
// We extract the set part ("sv3pt5") and use the existing SLUG_TO_PTCG map
// (reversed) to find the DB serieId. This avoids unreliable name matching.
// Card numbers are integers from the API (e.g. 9); we normalise to strings
// and match against the DB's zero-padded numbers (e.g. "009").
// ---------------------------------------------------------------------------

// Reverse of SLUG_TO_PTCG: ptcgSetId → DB serieId (built at runtime)
async function buildPtcgToSerieIdMap(): Promise<Map<string, string>> {
  const series = await prisma.serie.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map(series.map((s) => [s.slug, s.id]));
  const map = new Map<string, string>();
  for (const [slug, ptcgId] of Object.entries(SLUG_TO_PTCG)) {
    const id = slugToId.get(slug);
    if (id) map.set(ptcgId.toLowerCase(), id);
  }
  return map;
}

async function updateFrenchPrices(): Promise<{ episodesProcessed: number; cardsFrUpdated: number }> {
  if (!isFrenchPriceFetcherEnabled()) {
    console.warn("[scraper] CARDMARKET_API_KEY not set — FR pass skipped");
    return { episodesProcessed: 0, cardsFrUpdated: 0 };
  }

  const episodes = await fetchCMEpisodes();
  if (episodes.length === 0) return { episodesProcessed: 0, cardsFrUpdated: 0 };

  // Build ptcgId → serieId lookup (e.g. "sv3pt5" → "cmnd8zjnl…")
  const ptcgToSerieId = await buildPtcgToSerieIdMap();

  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let episodesProcessed = 0;
  let cardsFrUpdated = 0;
  const CHUNK = 50;

  // Collect all updates: serieId → array of { id, priceFr }
  // We accumulate across all episodes then flush per-serie.
  const updatesBySerie = new Map<string, Array<{ id: string; priceFr: number; cmApiCardId?: number }>>();

  for (const ep of episodes) {
    const cmCards = await fetchCMCardsForEpisode(ep.id);
    if (cmCards.length === 0) continue;

    // Group CM cards by their PTCG set ID (extracted from tcgid, e.g. "sv3pt5-9" → "sv3pt5")
    // Some cards may have no tcgid — skip those.
    const cardsByPtcgSet = new Map<string, typeof cmCards>();
    for (const cm of cmCards) {
      const tcgid = (cm as { tcgid?: string | null }).tcgid;
      if (!tcgid) continue;
      const setId = tcgid.split("-").slice(0, -1).join("-").toLowerCase();
      if (!setId) continue;
      if (!cardsByPtcgSet.has(setId)) cardsByPtcgSet.set(setId, []);
      cardsByPtcgSet.get(setId)!.push(cm);
    }

    for (const [ptcgSetId, setCards] of cardsByPtcgSet) {
      const serieId = ptcgToSerieId.get(ptcgSetId);
      if (!serieId) continue;

      // Lazy-load DB cards for this serie (only once — cache in map)
      if (!updatesBySerie.has(serieId)) updatesBySerie.set(serieId, []);

      const dbCards = await prisma.card.findMany({
        where: { serieId },
        select: { id: true, number: true },
      });
      const dbByNumber = new Map<string, string>();
      for (const c of dbCards) {
        dbByNumber.set(c.number, c.id);
        dbByNumber.set(normalizeCardNumber(c.number), c.id);
      }

      for (const cm of setCards) {
        const priceFr = extractLowestFr(cm);
        if (priceFr === null) continue;
        const numStr = String(cm.card_number);
        const id = dbByNumber.get(numStr) ?? dbByNumber.get(normalizeCardNumber(numStr));
        if (!id) continue;
        updatesBySerie.get(serieId)!.push({ id, priceFr, cmApiCardId: cm.id });
      }
    }

    // Throttle per episode
    await new Promise((r) => setTimeout(r, 200));
  }

  // Flush all updates to DB
  for (const [, updates] of updatesBySerie) {
    if (updates.length === 0) continue;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: {
              priceFr: u.priceFr,
              priceFrUpdatedAt: now,
              ...(u.cmApiCardId != null ? { cardmarketId: String(u.cmApiCardId) } : {}),
            },
          })
        )
      );
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: { cardId: u.id, price: u.priceFr, priceFr: u.priceFr, source: "cardmarket-api", recordedAt },
            update: { priceFr: u.priceFr },
          })
        )
      );
    }
    episodesProcessed++;
    cardsFrUpdated += updates.length;
  }

  console.log(`[scraper] 🇫🇷 ${episodesProcessed} séries · ${cardsFrUpdated} prix FR`);
  return { episodesProcessed, cardsFrUpdated };
}

// ---------------------------------------------------------------------------
// CM history backfill — persists historical CM price data into CardPriceHistory
// so the price chart has rich data without making live API calls per user.
//
// Candidate criteria (mirrors scripts/backfill-cm-history.ts):
//   - Has cardmarketId
//   - No `cardmarket-api` / `cardmarket-api-empty` history row older than 30 days
//     (i.e. hasn't been fully backfilled yet)
//   - No `cardmarket-api*` row with createdAt within the last 7 days
//     (avoids re-processing cards already attempted this week, prevents infinite
//     looping on cards where the CM API returns empty history)
//
// A sentinel row (`cardmarket-api-empty`, recordedAt = today 00:00 UTC) is
// always written per processed card so the next cron excludes it for 7 days,
// regardless of whether the API returned usable history.
// ---------------------------------------------------------------------------

async function backfillCMHistory(): Promise<{ cardsEnriched: number }> {
  if (!isFrenchPriceFetcherEnabled()) return { cardsEnriched: 0 };

  const backfillCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Raw SQL for performance: the equivalent Prisma nested filter becomes a
  // correlated NOT EXISTS that is prohibitively slow at 1M+ history rows.
  const candidates = await prisma.$queryRawUnsafe<
    Array<{ id: string; cardmarketId: string }>
  >(
    `
    SELECT c.id, c."cardmarketId"
    FROM cards c
    LEFT JOIN (
      SELECT DISTINCT "cardId" FROM card_price_history
      WHERE "recordedAt" <= $1
        AND source IN ('cardmarket-api', 'cardmarket-api-empty')
    ) ph_old ON ph_old."cardId" = c.id
    LEFT JOIN (
      SELECT DISTINCT "cardId" FROM card_price_history
      WHERE source IN ('cardmarket-api', 'cardmarket-api-empty')
        AND "createdAt" >= $2
    ) ph_recent ON ph_recent."cardId" = c.id
    WHERE c."cardmarketId" IS NOT NULL
      AND ph_old."cardId" IS NULL
      AND ph_recent."cardId" IS NULL
    ORDER BY c.id
    LIMIT 50
    `,
    backfillCutoff,
    recentCutoff
  );

  if (candidates.length === 0) return { cardsEnriched: 0 };

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  let cardsEnriched = 0;
  for (const card of candidates) {
    try {
      const history = await fetchCardHistory(Number(card.cardmarketId));

      // Always write a sentinel "attempt marker" so this card is excluded by
      // the 7-day filter on the next run, even if the API returned empty
      // history or all days were null-priced.
      await prisma.cardPriceHistory.upsert({
        where: { cardId_recordedAt: { cardId: card.id, recordedAt: todayUTC } },
        create: {
          cardId: card.id,
          price: 0,
          priceFr: null,
          source: "cardmarket-api-empty",
          recordedAt: todayUTC,
        },
        update: { createdAt: new Date() },
      });

      if (history.length === 0) continue;

      const upserts = history.map((h) => {
        const recordedAt = new Date(h.date);
        return prisma.cardPriceHistory.upsert({
          where: { cardId_recordedAt: { cardId: card.id, recordedAt } },
          create: {
            cardId: card.id,
            price: h.cmLow ?? 0,
            priceFr: h.cmLow,
            source: "cardmarket-api",
            recordedAt,
          },
          // Bump createdAt so the next-run filter excludes this card.
          update: { priceFr: h.cmLow, createdAt: new Date() },
        });
      });

      // Write in chunks
      const CHUNK = 50;
      for (let i = 0; i < upserts.length; i += CHUNK) {
        await Promise.all(upserts.slice(i, i + CHUNK));
      }
      cardsEnriched++;
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.warn(`[scraper] CM history backfill failed for card ${card.id}:`, err);
    }
  }

  console.log(`[scraper] 📈 CM history backfill: ${cardsEnriched} cartes enrichies`);
  return { cardsEnriched };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await updatePrices();
    const revResult = await updateReversePrices();
    const frResult = await updateFrenchPrices();
    const histResult = await backfillCMHistory();
    return NextResponse.json({
      message: "Price update complete",
      ...result,
      ...revResult,
      ...frResult,
      ...histResult,
    });
  } catch (error) {
    console.error("Cron price update failed:", error);
    return NextResponse.json({ error: "Price update failed" }, { status: 500 });
  }
}

// Manual trigger via POST
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await updatePrices();
    const revResult = await updateReversePrices();
    const frResult = await updateFrenchPrices();
    const histResult = await backfillCMHistory();
    return NextResponse.json({
      message: "Price update complete",
      ...result,
      ...revResult,
      ...frResult,
      ...histResult,
    });
  } catch (error) {
    console.error("Manual price update failed:", error);
    return NextResponse.json({ error: "Price update failed" }, { status: 500 });
  }
}
