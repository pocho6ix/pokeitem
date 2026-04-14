/**
 * backfill-missing-images.ts
 *
 * Fills in Card.imageUrl for every serie that has null/empty image URLs.
 *
 * Strategy per serie:
 *   1. TCGdex FR (primary — matches our French catalog and naming)
 *   2. pokemontcg.io (fallback — English, but has better coverage for
 *      WOTC-era H-variants, older promos, and late-era secret rares)
 *
 * Cards are matched by normalized number (leading zeros stripped, case
 * insensitive). Only updates rows where `imageUrl IS NULL` unless you pass
 * `--force`, in which case existing URLs get refreshed too.
 *
 * Usage:
 *   npx tsx scripts/backfill-missing-images.ts --dry-run
 *   npx tsx scripts/backfill-missing-images.ts
 *   npx tsx scripts/backfill-missing-images.ts --serie=alliance-infaillible
 *   npx tsx scripts/backfill-missing-images.ts --force
 *
 * Idempotent: safe to rerun. Writes nothing in dry-run.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");
const ONLY    = process.argv.find((a) => a.startsWith("--serie="))?.split("=")[1];

// ── serie slug → API set IDs ────────────────────────────────────────────────
interface SerieSources {
  tcgdex?: string;
  ptcg?: string;
}

/**
 * Mapping built from the audit results + seed-cards.ts reference mapping.
 * Only includes series that currently have missing images.
 */
const SERIE_SOURCES: Record<string, SerieSources> = {
  // ── Diamant & Perle (full bloc — 100 % vide) ────────────────────────────
  "diamant-et-perle":         { tcgdex: "dp1", ptcg: "dp1" },
  "tresors-mysterieux":       { tcgdex: "dp2", ptcg: "dp2" },
  "merveilles-secretes":      { tcgdex: "dp3", ptcg: "dp3" },
  "grands-envols":            { tcgdex: "dp4", ptcg: "dp4" },
  "aube-majestueuse":         { tcgdex: "dp5", ptcg: "dp5" },
  "eveil-des-legendes":       { tcgdex: "dp6", ptcg: "dp6" },
  "tempete-dp":               { tcgdex: "dp7", ptcg: "dp7" },
  "promos-diamant-et-perle":  { tcgdex: "dpp", ptcg: "dpp" },

  // ── Platine ─────────────────────────────────────────────────────────────
  "arceus":                   { tcgdex: "col1", ptcg: "pl4" },

  // ── HeartGold SoulSilver (secret rares manquantes + promos) ─────────────
  "heartgold-soulsilver-base":{ tcgdex: "hgss1", ptcg: "hgss1" },
  "dechainement":             { tcgdex: "hgss2", ptcg: "hgss2" },
  "indomptable":              { tcgdex: "hgss3", ptcg: "hgss3" },
  "triomphe":                 { tcgdex: "hgss4", ptcg: "hgss4" },
  "promos-heartgold-soulsilver": { tcgdex: "hgssp", ptcg: "hsp" },

  // ── Soleil & Lune ───────────────────────────────────────────────────────
  "alliance-infaillible":     { tcgdex: "sm10",  ptcg: "sm10" },
  "harmonie-des-esprits":     { tcgdex: "sm11",  ptcg: "sm11" },
  "destinees-occultes":       { tcgdex: "sm115", ptcg: "sm115" },
  "legendes-brillantes":      { tcgdex: "sm3.5", ptcg: "sm35" },
  "majeste-des-dragons":      { tcgdex: "sm7.5", ptcg: "sm75" },
  "promos-soleil-et-lune":    { tcgdex: "smp",   ptcg: "smp" },

  // ── Promos divers ───────────────────────────────────────────────────────
  "promos-xy":                { tcgdex: "xyp",   ptcg: "xyp" },
  "promos-mega-evolution":    { tcgdex: "mep",   ptcg: undefined },
  "promos-epee-et-bouclier":  { tcgdex: "swshp", ptcg: "swshp" },
  "promos-ecarlate-et-violet":{ tcgdex: "svp",   ptcg: "svp" },
  "promos-nintendo":          { tcgdex: "np",    ptcg: "np" },

  // ── Wizards of the Coast (Aquapolis H-variants) ─────────────────────────
  // TCGdex FR couvre les cartes 1–147, les H1–H32 viennent de pokemontcg.io
  "aquapolis":                { tcgdex: "ecard2", ptcg: "ecard2" },
};

// ── API response types ──────────────────────────────────────────────────────
interface TCGdexCard { id: string; localId: string; name: string; image?: string; }
interface TCGdexSet  { id: string; name: string; cards: TCGdexCard[]; }
interface PTCGCard   { id: string; number: string; name: string; images?: { small?: string; large?: string }; }

// ── TCGdex fetcher ──────────────────────────────────────────────────────────
async function fetchTcgdexSet(id: string): Promise<TCGdexCard[]> {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${id}`);
    if (!res.ok) {
      console.warn(`    ⚠ TCGdex ${id} → HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as TCGdexSet;
    return data.cards ?? [];
  } catch (err) {
    console.warn(`    ⚠ TCGdex ${id} network error:`, (err as Error).message);
    return [];
  }
}

// ── pokemontcg.io fetcher (with retry + backoff) ────────────────────────────
// The public v2 API has a per-minute rate limit. When we batch dozens of sets
// we routinely get throttled — retry with exponential backoff instead of
// silently returning 0 results.
async function fetchPtcgSet(id: string): Promise<PTCGCard[]> {
  const all: PTCGCard[] = [];
  let page = 1;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.POKEMON_TCG_IO_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMON_TCG_IO_API_KEY;
  }
  const MAX_RETRIES = 4;

  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${id}&pageSize=250&page=${page}&select=id,number,name,images`;
    let attempt = 0;
    let pageCards: PTCGCard[] | null = null;
    let totalCount = 0;
    let count = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 429 || res.status >= 500) {
          const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s, 16s
          console.warn(`    ↻ PTCG ${id} HTTP ${res.status} — retry in ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
          attempt++;
          continue;
        }
        if (!res.ok) {
          console.warn(`    ⚠ PTCG ${id} → HTTP ${res.status}`);
          return all;
        }
        const json = (await res.json()) as { data: PTCGCard[]; totalCount: number; count: number };
        pageCards = json.data;
        totalCount = json.totalCount;
        count = json.count;
        break;
      } catch (err) {
        const wait = 1000 * Math.pow(2, attempt);
        console.warn(`    ↻ PTCG ${id} network error — retry in ${wait}ms (${(err as Error).message})`);
        await new Promise((r) => setTimeout(r, wait));
        attempt++;
      }
    }

    if (pageCards === null) {
      console.warn(`    ⚠ PTCG ${id} gave up after ${MAX_RETRIES} retries`);
      return all;
    }
    all.push(...pageCards);
    if (all.length >= totalCount || count < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 500));
  }
  return all;
}

// ── URL builders ────────────────────────────────────────────────────────────
function tcgdexUrl(card: TCGdexCard): string | null {
  return card.image ? `${card.image}/high.webp` : null;
}
function ptcgUrl(card: PTCGCard): string | null {
  return card.images?.large ?? card.images?.small ?? null;
}

// ── Number normalization ────────────────────────────────────────────────────
// Collapses the many ways the same card number is written across catalogs:
//   "001" ≡ "1"       (DP catalog leading zeros)
//   "H01" ≡ "H1"      (Aquapolis holo variants)
//   "HGSS01" ≡ "HGSS1" (HGSS promos)
//   " 51 " ≡ "51"     (whitespace)
function normalizeNumber(n: string): string {
  const trimmed = n.trim().toUpperCase();
  // Strip leading zeros at the start AND after any alpha prefix.
  return trimmed.replace(/^(\D*)0+(\d)/, "$1$2");
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log("🔍 Mode dry-run — aucune écriture en DB\n");
  if (FORCE)   console.log("⚠  --force : les imageUrl existantes seront écrasées\n");

  const targets = Object.entries(SERIE_SOURCES).filter(([slug]) =>
    ONLY ? slug === ONLY : true
  );
  if (ONLY && targets.length === 0) {
    console.log(`❌ Aucune série "${ONLY}" dans le mapping.`);
    console.log(`   Disponibles: ${Object.keys(SERIE_SOURCES).join(", ")}`);
    return;
  }

  let totalUpdated = 0;
  let totalTargeted = 0;
  const unmatched: { slug: string; numbers: string[] }[] = [];

  for (const [slug, sources] of targets) {
    const serie = await prisma.serie.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!serie) {
      console.log(`⚠  ${slug} absent en DB — skip`);
      continue;
    }

    // Fetch the cards that need an image
    const dbCards = await prisma.card.findMany({
      where: FORCE
        ? { serieId: serie.id }
        : { serieId: serie.id, OR: [{ imageUrl: null }, { imageUrl: "" }] },
      select: { id: true, number: true, imageUrl: true },
      orderBy: { number: "asc" },
    });

    if (dbCards.length === 0) {
      console.log(`✓  ${serie.name}: aucune carte à traiter`);
      continue;
    }

    totalTargeted += dbCards.length;
    console.log(`\n📦 ${serie.name} — ${dbCards.length} carte(s) à traiter`);

    // TCGdex index (primary)
    const tcgdexByNumber = new Map<string, string>();
    if (sources.tcgdex) {
      const cards = await fetchTcgdexSet(sources.tcgdex);
      for (const c of cards) {
        const url = tcgdexUrl(c);
        if (url) tcgdexByNumber.set(normalizeNumber(c.localId), url);
      }
      console.log(`    → TCGdex (${sources.tcgdex}): ${tcgdexByNumber.size} images`);
    }

    // PTCG index (fallback)
    const ptcgByNumber = new Map<string, string>();
    if (sources.ptcg) {
      const cards = await fetchPtcgSet(sources.ptcg);
      for (const c of cards) {
        const url = ptcgUrl(c);
        if (url) ptcgByNumber.set(normalizeNumber(c.number), url);
      }
      console.log(`    → pokemontcg.io (${sources.ptcg}): ${ptcgByNumber.size} images`);
    }

    // Match & update
    let updated = 0;
    let fromTcgdex = 0;
    let fromPtcg = 0;
    const notFound: string[] = [];

    for (const card of dbCards) {
      const key = normalizeNumber(card.number);
      const tcgUrl  = tcgdexByNumber.get(key);
      const ptUrl   = ptcgByNumber.get(key);
      const newUrl  = tcgUrl ?? ptUrl;

      if (!newUrl) {
        notFound.push(card.number);
        continue;
      }
      if (newUrl === card.imageUrl) continue;

      if (!DRY_RUN) {
        await prisma.card.update({
          where: { id: card.id },
          data: { imageUrl: newUrl },
        });
      }
      updated++;
      if (tcgUrl) fromTcgdex++;
      else        fromPtcg++;
    }

    totalUpdated += updated;
    const fromStr = [
      fromTcgdex ? `${fromTcgdex} TCGdex` : null,
      fromPtcg   ? `${fromPtcg} PTCG`     : null,
    ].filter(Boolean).join(" + ");
    console.log(`    ✓ ${updated}/${dbCards.length} mise(s) à jour${fromStr ? ` (${fromStr})` : ""}${notFound.length ? ` — ${notFound.length} non trouvée(s)` : ""}`);
    if (notFound.length) unmatched.push({ slug, numbers: notFound });

    // Gentle pause between series to stay under pokemontcg.io's rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total: ${totalUpdated}/${totalTargeted} images mises à jour`);

  if (unmatched.length) {
    console.log(`\n⚠  Cartes non retrouvées dans les APIs:`);
    for (const u of unmatched) {
      const sample = u.numbers.slice(0, 10).join(", ");
      const more   = u.numbers.length > 10 ? ` (+${u.numbers.length - 10} autres)` : "";
      console.log(`   • ${u.slug}: ${sample}${more}`);
    }
    console.log(`\n   → ces cartes n'existent peut-être pas dans les APIs sous ce numéro.`);
    console.log(`   → vérifier le mapping set-id ou le format de 'number' en DB.`);
  }

  if (DRY_RUN) console.log(`\n(dry-run : rien écrit en DB)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
