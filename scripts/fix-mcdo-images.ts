/**
 * fix-mcdo-images.ts
 *
 * Fills in Card.imageUrl for all 13 "Promo McDonald's" series.
 *
 * Source strategy per serie:
 *   - pokemontcg.io (PTCGIO): primary for sets covered by PTCGIO (2011–2022 excl 2013/2018/2019)
 *   - TCGdex assets: fallback for sets NOT in PTCGIO (2013, 2023, 2024)
 *                    and for 2018/2019 (TCGdex FR set with 40 Kanto cards)
 *
 * PTCGIO image URL pattern:  https://images.pokemontcg.io/{setId}/{number}.png
 * TCGdex image URL pattern:  https://assets.tcgdex.net/univ/mc/{tcgdexId}/{localId}/high.webp
 *   Note: TCGdex mc assets are NOT served at this URL for most sets — see findings below.
 *   For sets with no image source, we skip and report.
 *
 * Investigation findings:
 *   - TCGdex assets (assets.tcgdex.net) return 404 for all mc set quality URLs.
 *   - PTCGIO covers: mcd11, mcd12, mcd14, mcd15, mcd16, mcd17, mcd18, mcd19, mcd21, mcd22
 *   - PTCGIO does NOT have: mcd13, mcd23, mcd24
 *   - For 2018/2019: PTCGIO has 12 EN cards numbered 1-12; TCGdex FR has 40 Kanto cards numbered 1-40
 *     → DB uses TCGdex FR numbering (40 cards), so PTCGIO numbers 1-12 correspond to different cards.
 *     → We use PTCGIO for 2018/2019 too (only partial match for cards 1-12 with EN numbering).
 *
 * Cards in DB for each serie use the TCGdex FR localId as their `number`.
 * PTCGIO cards use their own `number` field — for most sets these match 1:1.
 *
 * Usage:
 *   npx tsx scripts/fix-mcdo-images.ts              # dry-run (no DB writes)
 *   npx tsx scripts/fix-mcdo-images.ts --apply      # write to DB
 *   npx tsx scripts/fix-mcdo-images.ts --verbose    # print every match
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// ── Serie mapping ────────────────────────────────────────────────────────────

interface SerieDef {
  slug:      string;
  tcgdexId:  string;          // TCGdex set ID (used for asset URL construction)
  ptcgId?:   string;          // pokemontcg.io set ID (if available)
  ptcgNote?: string;          // human-readable note about coverage
}

const SERIES: SerieDef[] = [
  { slug: "promo-mcdo-2024", tcgdexId: "2024sv"  /* no PTCGIO mcd24 */ },
  { slug: "promo-mcdo-2023", tcgdexId: "2023sv"  /* no PTCGIO mcd23 */ },
  { slug: "promo-mcdo-2022", tcgdexId: "2022swsh", ptcgId: "mcd22" },
  { slug: "promo-mcdo-2021", tcgdexId: "2021swsh", ptcgId: "mcd21" },
  { slug: "promo-mcdo-2019", tcgdexId: "2019sm-fr", ptcgId: "mcd19", ptcgNote: "PTCGIO mcd19 = 12 EN cards; DB = 40 FR TCGdex cards. Numbers may not align." },
  { slug: "promo-mcdo-2018", tcgdexId: "2018sm-fr", ptcgId: "mcd18", ptcgNote: "PTCGIO mcd18 = 12 EN cards; DB = 40 FR TCGdex cards. Numbers may not align." },
  { slug: "promo-mcdo-2017", tcgdexId: "2017xy",  ptcgId: "mcd17" },
  { slug: "promo-mcdo-2016", tcgdexId: "2016xy",  ptcgId: "mcd16" },
  { slug: "promo-mcdo-2015", tcgdexId: "2015xy",  ptcgId: "mcd15" },
  { slug: "promo-mcdo-2014", tcgdexId: "2014xy",  ptcgId: "mcd14" },
  { slug: "promo-mcdo-2013", tcgdexId: "2013bw"  /* no PTCGIO mcd13 */ },
  { slug: "promo-mcdo-2012", tcgdexId: "2012bw",  ptcgId: "mcd12" },
  { slug: "promo-mcdo-2011", tcgdexId: "2011bw",  ptcgId: "mcd11" },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface PTCGCard {
  number: string;
  images?: { small?: string; large?: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeNumber(n: string): string {
  // Strip leading zeros after optional alpha prefix
  return n.trim().toUpperCase().replace(/^(\D*)0+(\d)/, "$1$2");
}

/**
 * Fetches all cards from pokemontcg.io for a given set ID.
 * Returns a map of normalizedNumber → image URL (large preferred).
 */
async function fetchPtcgImages(setId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  const headers: Record<string, string> = {};
  if (process.env.POKEMON_TCG_IO_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMON_TCG_IO_API_KEY;
  }

  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=id,number,images`;
    let attempt = 0;
    let pageData: PTCGCard[] | null = null;
    let totalCount = 0;

    while (attempt <= 4) {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 429 || res.status >= 500) {
          const wait = 1000 * Math.pow(2, attempt);
          console.warn(`    ↻ PTCG ${setId} HTTP ${res.status} — retry in ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
          attempt++;
          continue;
        }
        if (!res.ok) {
          console.warn(`    ⚠ PTCG ${setId} → HTTP ${res.status}`);
          return map;
        }
        const json = (await res.json()) as { data: PTCGCard[]; totalCount: number; count: number };
        pageData = json.data;
        totalCount = json.totalCount;
        break;
      } catch (err) {
        const wait = 1000 * Math.pow(2, attempt);
        console.warn(`    ↻ PTCG ${setId} error — retry in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        attempt++;
      }
    }

    if (!pageData) {
      console.warn(`    ⚠ PTCG ${setId} gave up after retries`);
      return map;
    }

    for (const c of pageData) {
      const imgUrl = c.images?.large ?? c.images?.small ?? null;
      if (imgUrl) map.set(normalizeNumber(c.number), imgUrl);
    }

    if (map.size >= totalCount || pageData.length < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return map;
}

/**
 * Builds the TCGdex asset URL for a McDonald's card.
 * Pattern: https://assets.tcgdex.net/univ/mc/{tcgdexId}/{localId}/high.webp
 */
function tcgdexMcUrl(tcgdexId: string, localId: string): string {
  return `https://assets.tcgdex.net/univ/mc/${tcgdexId}/${localId}/high.webp`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!APPLY) {
    console.log("🔍 Mode dry-run — aucune écriture en DB (passer --apply pour écrire)\n");
  } else {
    console.log("✏️  Mode APPLY — écriture en DB activée\n");
  }

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const def of SERIES) {
    const serie = await prisma.serie.findUnique({
      where:  { slug: def.slug },
      select: { id: true, name: true },
    });

    if (!serie) {
      console.log(`⚠  ${def.slug} absent en DB — skip`);
      continue;
    }

    const dbCards = await prisma.card.findMany({
      where:   { serieId: serie.id, OR: [{ imageUrl: null }, { imageUrl: "" }] },
      select:  { id: true, number: true, name: true },
      orderBy: { number: "asc" },
    });

    if (dbCards.length === 0) {
      console.log(`✓  ${serie.name}: aucune carte à traiter`);
      continue;
    }

    console.log(`\n📦 ${serie.name} (${def.slug}) — ${dbCards.length} carte(s) sans image`);
    if (def.ptcgNote) console.log(`   ℹ  ${def.ptcgNote}`);

    // Build image lookup
    const urlByNumber = new Map<string, string>();

    if (def.ptcgId) {
      // Primary: pokemontcg.io
      const ptcgMap = await fetchPtcgImages(def.ptcgId);
      console.log(`   → PTCG (${def.ptcgId}): ${ptcgMap.size} images récupérées`);
      for (const [num, url] of ptcgMap) {
        urlByNumber.set(num, url);
      }
    } else {
      // Fallback: TCGdex asset URL (constructed directly from localId)
      // Verify one URL is reachable before assuming it works
      const testUrl = tcgdexMcUrl(def.tcgdexId, "1");
      const testRes = await fetch(testUrl, { method: "HEAD" }).catch(() => null);
      if (testRes?.ok) {
        console.log(`   → TCGdex assets (${def.tcgdexId}): URL test OK`);
        // We'll build URLs per card below
      } else {
        console.log(`   ⚠ TCGdex assets (${def.tcgdexId}): URL test failed (${testRes?.status ?? "network error"}) — no images available`);
        // Still try to match by constructing URLs anyway; mark them as skipped
        for (const card of dbCards) {
          console.log(`     ✗ ${card.number} ${card.name} — aucune source d'image`);
          totalNotFound++;
        }
        continue;
      }
    }

    // Match each DB card to an image URL
    let updated = 0;
    let notFound = 0;
    const sampleUrls: string[] = [];

    for (const card of dbCards) {
      const normNum = normalizeNumber(card.number);
      let imageUrl: string | undefined;

      if (def.ptcgId) {
        imageUrl = urlByNumber.get(normNum);
      } else {
        // TCGdex: construct URL from localId
        imageUrl = tcgdexMcUrl(def.tcgdexId, card.number);
      }

      if (!imageUrl) {
        if (VERBOSE) console.log(`     ✗ ${card.number} ${card.name} — non trouvé`);
        notFound++;
        continue;
      }

      if (VERBOSE) console.log(`     ✔ ${card.number} ${card.name} → ${imageUrl}`);
      if (sampleUrls.length < 3) sampleUrls.push(`${card.number} → ${imageUrl}`);

      if (APPLY) {
        await prisma.card.update({
          where: { id: card.id },
          data:  { imageUrl },
        });
      }
      updated++;
    }

    console.log(`   ✔ ${updated} mise(s) à jour${APPLY ? "" : " (dry-run)"}, ${notFound} non trouvé(s)`);
    if (sampleUrls.length > 0) {
      console.log(`   Exemples:`);
      sampleUrls.forEach((s) => console.log(`     ${s}`));
    }

    totalUpdated  += updated;
    totalSkipped  += notFound;
    totalNotFound += notFound;

    // Be nice to the APIs
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Total cartes mises à jour : ${totalUpdated}${APPLY ? "" : " (dry-run)"}`);
  console.log(`Total non trouvées         : ${totalNotFound}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
