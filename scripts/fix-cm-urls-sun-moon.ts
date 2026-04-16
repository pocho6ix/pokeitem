/**
 * fix-cm-urls-sun-moon.ts
 *
 * Rewrites Cardmarket URLs for cards in the "Soleil et Lune" bloc.
 *
 * All S&M sets (SUM GRI BUS SLG CIN UPR FLI CES DRM LOT TEU DEO UNB UNM HIF
 * CEC) follow the same "full" unpadded pattern, empirically verified by the
 * user on 5+ anchor URLs:
 *
 *   {Episode}/{Name}[-V{rank}]-{CODE}{num_unpadded}
 *
 * - V-rank on every collision (non-V cards included — confirmed by testing
 *   Sun-Moon/Ilima-V1-SUM121 working while Sun-Moon/Ilima-SUM121 fails).
 * - Numbers unpadded (SUM1 not SUM001).
 * - Variant markers (-gx, -ex, -tag-team) stay lowercase — CM redirects
 *   from lowercase to canonical.
 *
 * Scope is strict on the "Soleil" bloc, so nothing else is touched.
 *
 * Zero API calls — pure DB rewrite.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-sun-moon.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-sun-moon.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-sun-moon.ts --verbose    # print every diff
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// All known S&M CM set codes. Anything else found in the bloc is reported
// and skipped (e.g. promo codes we haven't tested).
const KNOWN_CODES = new Set([
  "SUM", "GRI", "BUS", "SLG", "CIN", "UPR", "FLI", "CES",
  "DRM", "LOT", "TEU", "DEO", "UNB", "UNM", "HIF", "CEC",
]);

interface Parsed {
  episode:   string;
  base:      string;
  vRankPart: string;
  code:      string;
  numDigits: string;
  hasLang:   boolean;
}

function parseOldUrl(url: string): Parsed | null {
  const [pathPart, queryPart] = url.split("?");
  const hasLang = queryPart === "language=2";
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);
  const m = rest.match(/^(.+?)(-V\d+)?-([A-Z]{2,})(\w+)$/);
  if (!m) return null;
  return {
    episode,
    base:      m[1],
    vRankPart: m[2] ?? "",
    code:      m[3],
    numDigits: m[4],
    hasLang,
  };
}

/** Unpad a DB card number for URLs that require unpadded digits. */
function unpaddedNum(cardNumber: string, fallback: string): string {
  const n = parseInt(cardNumber, 10);
  return Number.isNaN(n) ? fallback : String(n);
}

interface Row {
  id:        string;
  serieSlug: string;
  number:    string;
  name:      string;
  oldUrl:    string;
  p:         Parsed;
  newUrl?:   string;
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { bloc: { name: { contains: "Soleil", mode: "insensitive" } } },
    },
    select: {
      id: true, number: true, name: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Soleil & Lune avec URL\n`);

  const rows:         Row[] = [];
  const unparsed:     typeof cards = [];
  const unknownCodes: Map<string, number> = new Map();

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); continue; }
    if (!KNOWN_CODES.has(p.code)) {
      unknownCodes.set(p.code, (unknownCodes.get(p.code) ?? 0) + 1);
      continue;
    }
    rows.push({
      id:        c.id,
      serieSlug: c.serie.slug,
      number:    c.number,
      name:      c.name,
      oldUrl:    c.cardmarketUrl!,
      p,
    });
  }

  if (unparsed.length > 0) {
    console.log(`⚠️  ${unparsed.length} URLs non parsables — ignorées`);
    if (VERBOSE) {
      for (const u of unparsed.slice(0, 20)) console.log(`   ${u.serie.slug} #${u.number} — ${u.cardmarketUrl}`);
      if (unparsed.length > 20) console.log(`   …(+${unparsed.length - 20})`);
    }
  }
  if (unknownCodes.size > 0) {
    console.log(`⚠️  Codes CM non classifiés — ignorés :`);
    for (const [code, n] of [...unknownCodes.entries()].sort()) {
      console.log(`   ${code.padEnd(10)} ${String(n).padStart(5)} cartes`);
    }
  }
  console.log();

  // Compute new URLs — one pattern for the whole bloc.
  // V-rank is already correct in the DB (source of truth for collisions),
  // we just unpad the number and keep everything else.
  for (const r of rows) {
    const numStr = unpaddedNum(r.number, r.p.numDigits);
    const q = r.p.hasLang ? "?language=2" : "";
    r.newUrl = `${r.p.episode}/${r.p.base}${r.p.vRankPart}-${r.p.code}${numStr}${q}`;
  }

  const updates = rows.filter((r) => r.newUrl && r.newUrl !== r.oldUrl);
  const unchanged = rows.length - updates.length;

  // Per-series report
  const perSerie = new Map<string, { total: number; changed: number }>();
  for (const r of rows) {
    const t = perSerie.get(r.serieSlug) ?? { total: 0, changed: 0 };
    t.total++;
    perSerie.set(r.serieSlug, t);
  }
  for (const u of updates) perSerie.get(u.serieSlug)!.changed++;

  console.log("Série                          Total  À corriger");
  console.log("─".repeat(54));
  for (const [slug, t] of [...perSerie.entries()].sort()) {
    console.log(`  ${slug.padEnd(30)}  ${String(t.total).padStart(5)}  ${String(t.changed).padStart(9)}`);
  }
  console.log("─".repeat(54));
  console.log(`  ${"TOTAL".padEnd(30)}  ${String(rows.length).padStart(5)}  ${String(updates.length).padStart(9)}`);
  console.log(`\n${unchanged} URLs déjà correctes, ${updates.length} à modifier\n`);

  // Anchors — user-confirmed URLs.
  const anchors = [
    { serie: "soleil-et-lune",     num: "1",    want: "Sun-Moon/Caterpie-SUM1?language=2"                       },
    { serie: "soleil-et-lune",     num: "12",   want: "Sun-Moon/Decidueye-gx-SUM12?language=2"                  },
    { serie: "soleil-et-lune",     num: "121",  want: "Sun-Moon/Ilima-V1-SUM121?language=2"                     },
    { serie: "gardiens-ascendants",num: "1",    want: "Guardians-Rising/Bellsprout-GRI1?language=2"             },
    { serie: "gardiens-ascendants",num: "45",   want: "Guardians-Rising/Vikavolt-gx-V1-GRI45?language=2"        },
    { serie: "ultra-prisme",       num: "1",    want: "Ultra-Prism/Exeggcute-UPR1?language=2"                   },
    { serie: "tonnerre-perdu",     num: "1",    want: "Lost-Thunder/Tangela-LOT1?language=2"                    },
    { serie: "eclipse-cosmique",   num: "1",    want: "Cosmic-Eclipse/Venusaur-snivy-gx-V1-CEC1?language=2"     },
    { serie: "eclipse-cosmique",   num: "210",  want: "Cosmic-Eclipse/Venusaur-snivy-gx-V2-CEC210?language=2"   },
  ];
  console.log("Cartes d'ancrage (tes exemples confirmés manuellement) :");
  let anchorOk = 0, anchorFail = 0;
  for (const a of anchors) {
    const row = rows.find((r) => r.serieSlug === a.serie && r.number === a.num);
    if (!row) {
      console.log(`  ⚠️  ${a.serie} #${a.num} — carte absente`);
      continue;
    }
    const match = row.newUrl === a.want;
    if (match) anchorOk++; else anchorFail++;
    const icon = match ? "✅" : "❌";
    console.log(`  ${icon} ${a.serie} #${a.num} ${row.name}`);
    if (!match) {
      console.log(`      attendu : ${a.want}`);
      console.log(`      produit : ${row.newUrl}`);
      console.log(`      actuel  : ${row.oldUrl}`);
    }
  }
  console.log(`\n${anchorOk}/${anchors.length} ancrages OK · ${anchorFail} mismatch\n`);

  // Sample 15 diffs covering different series
  const samples: Row[] = [];
  const seenSeries = new Set<string>();
  for (const u of updates) {
    if (!seenSeries.has(u.serieSlug) && samples.length < 15) {
      samples.push(u);
      seenSeries.add(u.serieSlug);
    }
  }
  while (samples.length < 15 && samples.length < updates.length) {
    samples.push(updates[samples.length]);
  }
  console.log("Échantillon (diversifié par série) :");
  for (const u of samples) {
    console.log(`  ${u.serieSlug.padEnd(22)} #${u.number} ${u.name}`);
    console.log(`    − ${u.oldUrl}`);
    console.log(`    + ${u.newUrl}`);
  }

  if (VERBOSE && updates.length > samples.length) {
    console.log(`\n─── Toutes les corrections ─────────────────────────────────\n`);
    for (const u of updates) {
      console.log(`  ${u.serieSlug.padEnd(22)} #${u.number} ${u.name}`);
      console.log(`    − ${u.oldUrl}`);
      console.log(`    + ${u.newUrl}`);
    }
  }

  if (!APPLY) {
    console.log(`\n(dry-run : rien écrit. Relance avec --apply pour appliquer.)`);
    await prisma.$disconnect();
    return;
  }

  if (anchorFail > 0) {
    console.error(`\n❌ ${anchorFail} ancrages échouent. Abandon — les règles ont divergé. Lance en dry-run et vérifie.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n💾 Écriture DB…`);
  let written = 0;
  for (const u of updates) {
    await prisma.card.update({
      where: { id: u.id },
      data:  { cardmarketUrl: u.newUrl },
    });
    written++;
    if (written % 500 === 0) process.stdout.write(`  ${written}/${updates.length}\n`);
  }
  console.log(`✅ ${written} URLs mises à jour`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
