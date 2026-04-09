import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTcgdexRarity, isSpecialCard } from "@/lib/pokemon/card-variants";
import {
  fetchCMEpisodes,
  fetchCMCardsForEpisode,
  isFrenchPriceFetcherEnabled,
  extractLowestFr,
  normalizeCardNumber,
} from "@/lib/cardmarket-fr";

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
// FR price pass — uses cardmarket-api-tcg (RapidAPI) to pull the cheapest
// Near-Mint French listing for every card on Cardmarket. Falls through silently
// if CARDMARKET_API_KEY is not configured.
// ---------------------------------------------------------------------------
async function updateFrenchPrices(): Promise<{ episodesProcessed: number; cardsFrUpdated: number }> {
  if (!isFrenchPriceFetcherEnabled()) {
    console.warn("[scraper] CARDMARKET_API_KEY not set — FR pass skipped");
    return { episodesProcessed: 0, cardsFrUpdated: 0 };
  }

  const episodes = await fetchCMEpisodes();
  if (episodes.length === 0) return { episodesProcessed: 0, cardsFrUpdated: 0 };

  // Match Cardmarket episode names to DB Serie via name or nameEn (case-insensitive)
  const seriesAll = await prisma.serie.findMany({ select: { id: true, name: true, nameEn: true } });
  const serieByName = new Map<string, string>();
  for (const s of seriesAll) {
    serieByName.set(s.name.toLowerCase(), s.id);
    if (s.nameEn) serieByName.set(s.nameEn.toLowerCase(), s.id);
  }

  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let episodesProcessed = 0;
  let cardsFrUpdated = 0;
  const CHUNK = 50;

  for (const ep of episodes) {
    const serieId = serieByName.get(ep.name.toLowerCase());
    if (!serieId) continue;

    const cmCards = await fetchCMCardsForEpisode(ep.id);
    if (cmCards.length === 0) continue;

    const dbCards = await prisma.card.findMany({
      where: { serieId },
      select: { id: true, number: true },
    });
    const dbByNumber = new Map<string, string>();
    for (const c of dbCards) {
      dbByNumber.set(c.number, c.id);
      dbByNumber.set(normalizeCardNumber(c.number), c.id);
    }

    const updates: Array<{ id: string; priceFr: number }> = [];
    for (const cm of cmCards) {
      const priceFr = extractLowestFr(cm);
      if (priceFr === null) continue;
      const id =
        dbByNumber.get(cm.card_number) ??
        dbByNumber.get(normalizeCardNumber(cm.card_number));
      if (!id) continue;
      updates.push({ id, priceFr });
    }

    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: { priceFr: u.priceFr, priceFrUpdatedAt: now },
          })
        )
      );
      // Merge FR price into daily history (keeps international price if already set)
      await Promise.all(
        chunk.map((u) =>
          prisma.cardPriceHistory.upsert({
            where: { cardId_recordedAt: { cardId: u.id, recordedAt } },
            create: {
              cardId: u.id,
              price: u.priceFr,
              priceFr: u.priceFr,
              source: "cardmarket-api",
              recordedAt,
            },
            update: { priceFr: u.priceFr },
          })
        )
      );
    }

    if (updates.length > 0) {
      console.log(`[scraper] 🇫🇷 ${ep.name}: ${updates.length} prix FR`);
      episodesProcessed++;
      cardsFrUpdated += updates.length;
    }

    // Gentle throttle — RapidAPI has per-minute quotas
    await new Promise((r) => setTimeout(r, 300));
  }

  return { episodesProcessed, cardsFrUpdated };
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
    const frResult = await updateFrenchPrices();
    return NextResponse.json({
      message: "Price update complete",
      ...result,
      ...frResult,
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
    const frResult = await updateFrenchPrices();
    return NextResponse.json({
      message: "Price update complete",
      ...result,
      ...frResult,
    });
  } catch (error) {
    console.error("Manual price update failed:", error);
    return NextResponse.json({ error: "Price update failed" }, { status: 500 });
  }
}
