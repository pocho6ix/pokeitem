/**
 * backfill-fr-prices-newly-imaged.ts
 *
 * Targeted companion to backfill-missing-images.ts: fills in `priceFr`
 * for cards in the series we just backfilled images for, pulling from
 * the Cardmarket RapidAPI.
 *
 * Differs from the main backfill-french-prices.ts:
 *   - Only processes the 26 series that were in the image backfill
 *   - Only updates rows where `priceFr IS NULL` (never overwrites existing)
 *   - Skips CM episodes that don't map to one of our target series
 *
 * Usage:
 *   npx tsx scripts/backfill-fr-prices-newly-imaged.ts --dry-run
 *   npx tsx scripts/backfill-fr-prices-newly-imaged.ts
 *   npx tsx scripts/backfill-fr-prices-newly-imaged.ts --serie=alliance-infaillible
 *   npx tsx scripts/backfill-fr-prices-newly-imaged.ts --force   # overwrite existing
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");
const ONLY    = process.argv.find((a) => a.startsWith("--serie="))?.split("=")[1];

const HOST = "cardmarket-api-tcg.p.rapidapi.com";
const KEY  = process.env.CARDMARKET_API_KEY ?? "";

if (!KEY) {
  console.error("❌ CARDMARKET_API_KEY is not set in .env");
  process.exit(1);
}

// ── Target series (slug → Cardmarket tcgid set prefix) ─────────────────────
// Only main-set series that CM indexes by Pokémon TCG set id. Promo sets
// aren't here because CM groups them differently (no consistent tcgid).
const TARGET_SLUG_TO_PTCG: Record<string, string> = {
  // ── Diamant & Perle ──────────────────────────────────────────────────
  "diamant-et-perle":    "dp1",
  "tresors-mysterieux":  "dp2",
  "merveilles-secretes": "dp3",
  "grands-envols":       "dp4",
  "aube-majestueuse":    "dp5",
  "eveil-des-legendes":  "dp6",
  "tempete-dp":          "dp7",

  // ── Platine ──────────────────────────────────────────────────────────
  "arceus":              "pl4",

  // ── HeartGold SoulSilver (secret rares seulement) ────────────────────
  "heartgold-soulsilver-base": "hgss1",
  "dechainement":        "hgss2",
  "indomptable":         "hgss3",
  "triomphe":            "hgss4",

  // ── Soleil & Lune ────────────────────────────────────────────────────
  "alliance-infaillible": "sm10",
  "harmonie-des-esprits": "sm11",
  "destinees-occultes":   "sm115",
  "legendes-brillantes":  "sm3pt5",
  "majeste-des-dragons":  "sm7pt5",

  // ── Wizards of the Coast ─────────────────────────────────────────────
  "aquapolis":            "ecard2",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAllPages<T>(
  buildUrl: (page: number) => string,
  label: string
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(buildUrl(page), {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY },
    });
    if (!res.ok) {
      console.warn(`    ⚠ ${label} p${page} → HTTP ${res.status}`);
      break;
    }
    const body = (await res.json()) as {
      data?: T[];
      paging?: { current: number; total: number };
    };
    const items: T[] = body.data ?? (body as unknown as T[]);
    all.push(...items);
    if (!body.paging || body.paging.current >= body.paging.total) break;
    page++;
    await sleep(200);
  }
  return all;
}

// ── Main ───────────────────────────────────────────────────────────────────

interface CMCard {
  id: number;
  name: string;
  card_number: number | string;
  tcgid?: string | null;
  prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null;
}

async function main() {
  if (DRY_RUN) console.log("🔍 DRY RUN — aucune écriture en DB\n");
  if (FORCE)   console.log("⚠  --force : les priceFr existants seront écrasés\n");

  // Filter target series (with optional --serie=)
  const targets = Object.entries(TARGET_SLUG_TO_PTCG).filter(([slug]) =>
    ONLY ? slug === ONLY : true
  );
  if (ONLY && targets.length === 0) {
    console.log(`❌ "${ONLY}" n'est pas dans les séries ciblées.`);
    console.log(`   Disponibles: ${Object.keys(TARGET_SLUG_TO_PTCG).join(", ")}`);
    return;
  }

  // Build ptcgId (lowercase) → serieId map
  const seriesInDb = await prisma.serie.findMany({ select: { id: true, slug: true, name: true } });
  const slugToSerie = new Map(seriesInDb.map((s) => [s.slug, s]));
  const ptcgToSerieId = new Map<string, string>();
  const serieIdToName = new Map<string, string>();
  for (const [slug, ptcgId] of targets) {
    const serie = slugToSerie.get(slug);
    if (!serie) {
      console.warn(`⚠  ${slug} absent de la DB — skip`);
      continue;
    }
    ptcgToSerieId.set(ptcgId.toLowerCase(), serie.id);
    serieIdToName.set(serie.id, serie.name);
  }

  console.log(`🎯 ${ptcgToSerieId.size} série(s) ciblée(s): ${[...serieIdToName.values()].join(", ")}\n`);

  // Pre-load DB cards for target series (with their current priceFr)
  const dbCardsBySerieId = new Map<string, Map<string, { id: string; priceFr: number | null }>>();
  let totalTargeted = 0;
  for (const serieId of ptcgToSerieId.values()) {
    const cards = await prisma.card.findMany({
      where: FORCE ? { serieId } : { serieId, priceFr: null },
      select: { id: true, number: true, priceFr: true },
    });
    const m = new Map<string, { id: string; priceFr: number | null }>();
    for (const c of cards) {
      const entry = { id: c.id, priceFr: c.priceFr };
      m.set(c.number, entry);
      m.set(normalizeNumber(c.number), entry);
    }
    dbCardsBySerieId.set(serieId, m);
    totalTargeted += cards.length;
  }
  console.log(`📊 ${totalTargeted} carte(s) sans priceFr à renseigner\n`);

  if (totalTargeted === 0) {
    console.log("✓ Rien à faire — toutes les cartes ont déjà un prix FR.");
    await prisma.$disconnect();
    return;
  }

  // Fetch all Cardmarket episodes (paginated)
  console.log("📡 Récupération des épisodes Cardmarket…");
  const episodes = await fetchAllPages<{ id: number; name: string }>(
    (p) => `https://${HOST}/pokemon/episodes?per_page=100&page=${p}`,
    "episodes"
  );
  console.log(`   ${episodes.length} épisodes trouvés\n`);

  const now = new Date();
  const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const CHUNK = 50;

  // Collect updates grouped by serieId
  const updatesBySerie = new Map<string, Array<{ id: string; priceFr: number; cmApiCardId: number }>>();

  let scanned = 0;
  let matchedEpisodes = 0;
  for (const ep of episodes) {
    scanned++;
    if (scanned % 10 === 0) {
      process.stdout.write(`  … ${scanned}/${episodes.length} épisodes scannés, ${matchedEpisodes} match(s)\n`);
    }
    // Fetch ONLY the first page first to decide if this episode is one of
    // ours. Most episodes won't match (we only target 18 series out of ~180).
    const firstRes = await fetch(
      `https://${HOST}/pokemon/episodes/${ep.id}/cards?per_page=100&page=1`,
      { headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY } }
    );
    if (!firstRes.ok) {
      console.warn(`    ⚠ ep-${ep.id} p1 → HTTP ${firstRes.status}`);
      await sleep(150);
      continue;
    }
    const firstBody = (await firstRes.json()) as {
      data?: CMCard[];
      paging?: { current: number; total: number };
    };
    const firstPage = firstBody.data ?? [];
    if (firstPage.length === 0) {
      await sleep(150);
      continue;
    }

    // Does any card in the first page map to a target serie?
    const hasTarget = firstPage.some((c) => {
      const setId = (c.tcgid ?? "").split("-").slice(0, -1).join("-").toLowerCase();
      return setId && ptcgToSerieId.has(setId);
    });
    if (!hasTarget) {
      await sleep(150);
      continue;
    }
    matchedEpisodes++;

    // Fetch remaining pages (we already have page 1)
    const cmCards: CMCard[] = [...firstPage];
    const totalPages = firstBody.paging?.total ?? 1;
    for (let p = 2; p <= totalPages; p++) {
      await sleep(200);
      const res = await fetch(
        `https://${HOST}/pokemon/episodes/${ep.id}/cards?per_page=100&page=${p}`,
        { headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY } }
      );
      if (!res.ok) {
        console.warn(`    ⚠ ep-${ep.id} p${p} → HTTP ${res.status}`);
        break;
      }
      const body = (await res.json()) as { data?: CMCard[] };
      cmCards.push(...(body.data ?? []));
    }

    let epMatched = 0;
    for (const cm of cmCards) {
      const tcgid = cm.tcgid ?? "";
      if (!tcgid) continue;
      const cmSetId = tcgid.split("-").slice(0, -1).join("-").toLowerCase();
      const serieId = ptcgToSerieId.get(cmSetId);
      if (!serieId) continue;

      const priceFr = cm.prices?.cardmarket?.lowest_near_mint_FR ?? null;
      if (!priceFr || priceFr <= 0) continue;

      const dbMap = dbCardsBySerieId.get(serieId);
      if (!dbMap) continue;
      const numStr = String(cm.card_number);
      const entry = dbMap.get(numStr) ?? dbMap.get(normalizeNumber(numStr));
      if (!entry) continue; // already had a price, not in --force, no match, etc.

      if (!updatesBySerie.has(serieId)) updatesBySerie.set(serieId, []);
      updatesBySerie.get(serieId)!.push({ id: entry.id, priceFr, cmApiCardId: cm.id });
      epMatched++;
    }

    if (epMatched > 0) {
      process.stdout.write(`  ✅ ${ep.name.padEnd(40)} ${epMatched} prix FR\n`);
    }

    await sleep(300);
  }

  // Write to DB
  console.log(`\n💾 Écriture en DB…`);
  let totalCards = 0;
  let totalSeries = 0;
  for (const [serieId, updates] of updatesBySerie) {
    const serieName = serieIdToName.get(serieId) ?? serieId;
    console.log(`  • ${serieName}: ${updates.length} carte(s)`);
    if (DRY_RUN) { totalSeries++; totalCards += updates.length; continue; }

    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          prisma.card.update({
            where: { id: u.id },
            data: {
              priceFr: u.priceFr,
              priceFrUpdatedAt: now,
              cardmarketId: String(u.cmApiCardId),
            },
          })
        )
      );
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
    totalSeries++;
    totalCards += updates.length;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Terminé — ${totalSeries} série(s) · ${totalCards}/${totalTargeted} prix FR renseignés`);
  if (DRY_RUN) console.log("(dry-run : rien n'a été écrit)");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
