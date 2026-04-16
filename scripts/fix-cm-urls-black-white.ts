/**
 * fix-cm-urls-black-white.ts
 *
 * Rewrites Cardmarket URLs for the Noir & Blanc bloc (BW, 2011–2013).
 *
 * Scope: strictly limited to bloc "Noir et Blanc" — 10 series with real CM URLs
 * (Noir et Blanc, Pouvoirs Émergents, Nobles Victoires, Destinées Futures,
 *  Dragons Exaltés, Explorateurs Obscurs, Frontières Franchies,
 *  Explosion Plasma, Glaciation Plasma, Tempête Plasma).
 *  Promos and Coffre des Dragons have no CM URLs → ignored.
 *
 * Pattern — empirically verified from the CM set listing (click-through on
 * Cardmarket's own product grid, which is the ground truth for URL canonicals):
 *
 *   {Episode}/{Base}[-V{rank}]-{CODE}{num_unpadded}?language=2
 *
 * Transforms vs the current DB URLs:
 *
 * 1. Numbers unpadded: BLW001 → BLW1
 * 2. `?language=2` always present.
 * 3. Base name preserved as-is (BW uses lowercase `-ex`, unlike XY).
 * 4. V-rank recomputed from scratch (DB V-ranks for BW are unreliable):
 *      - Singleton:                    no V-rank
 *      - 2-card non-EX collision:      first=V1, second=no V-rank
 *      - 2-card EX collision:          both no V-rank           (like XY 2-card)
 *      - 3-card non-EX collision:      all strip V-rank         (Trubbish PLS anomaly)
 *      - 4-card non-EX collision:      first=V1, last=V2, middle=no V-rank (Victini NVI)
 *
 * Surprising findings:
 *   - BW 2-card non-EX behaviour diverges from XY: the lower-numbered card
 *     keeps V1, the higher-numbered card aliases. In XY both stripped.
 *   - But BW 2-card EX is same as XY: both strip. Confirmed by Palkia-ex
 *     (PLB #66 + #100): `Palkia-ex-PLB66` and `Palkia-ex-PLB100` both resolve
 *     while `Palkia-ex-V1-PLB66` 404s.
 *   - PLS Trubbish is a 3-card collision but CM only has one product, so all
 *     three game cards alias to `Trubbish-PLS{n}` with no V-rank.
 *   - NVI Victini is a 4-card collision that follows the XY 3-card regular-EX
 *     pattern: endpoints get V1/V2, middle cards alias.
 *
 * Trainer/Supporter 2-card collisions (Iris, Skyla, Colress, Ghetsis, N,
 * Cobalion, Terrakion, Virizion, Thundurus, Tornadus, Cryogonal) are
 * classified as non-EX and follow the first=V1/second=alias rule — same as
 * Reshiram/Zekrom BLW where one printing is basic-art and the other Full Art.
 *
 * Zero API calls — pure DB rewrite.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-black-white.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-black-white.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-black-white.ts --verbose    # print every diff
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// Whitelist of BW CM set codes we have verified anchors for.
// Anything else in the bloc gets reported and skipped.
const KNOWN_CODES = new Set([
  "BLW", "EPO", "NVI", "NXD", "DEX", "DRX", "BCR", "PLB", "PLF", "PLS",
]);

interface Parsed {
  episode:   string;
  base:      string;
  code:      string;
  numDigits: string;
}

function parseOldUrl(url: string): Parsed | null {
  const [pathPart] = url.split("?");
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);
  // Match optional -V{n} suffix before the set code so we can strip it and
  // recompute V-ranks from the collision group structure.
  const m = rest.match(/^(.+?)(?:-V\d+)?-([A-Z]{2,})(\w+)$/);
  if (!m) return null;
  return {
    episode,
    base:      m[1],
    code:      m[2],
    numDigits: m[3],
  };
}

/** Strip leading zeros from a card number, preserving trailing suffixes like "a". */
function unpadNumber(cardNumber: string): string {
  const m = cardNumber.match(/^(\d+)(.*)$/);
  if (!m) return cardNumber;
  const stripped = String(parseInt(m[1], 10));
  return stripped + m[2];
}

interface Row {
  id:        string;
  serieSlug: string;
  number:    string;
  numInt:    number;
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
      serie: { bloc: { name: { contains: "Noir", mode: "insensitive" } } },
    },
    select: {
      id: true, number: true, name: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Noir & Blanc avec URL\n`);

  const rows:         Row[]        = [];
  const unparsed:     typeof cards = [];
  const unknownCodes: Map<string, number> = new Map();

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); continue; }
    if (!KNOWN_CODES.has(p.code)) {
      unknownCodes.set(p.code, (unknownCodes.get(p.code) ?? 0) + 1);
      continue;
    }
    const numMatch = c.number.match(/^(\d+)/);
    const numInt   = numMatch ? parseInt(numMatch[1], 10) : 0;
    rows.push({
      id:        c.id,
      serieSlug: c.serie.slug,
      number:    c.number,
      numInt,
      name:      c.name,
      oldUrl:    c.cardmarketUrl!,
      p,
    });
  }

  if (unparsed.length > 0) {
    console.log(`⚠️  ${unparsed.length} URLs non parsables — ignorées`);
    if (VERBOSE) {
      for (const u of unparsed.slice(0, 20))
        console.log(`   ${u.serie.slug} #${u.number} — ${u.cardmarketUrl}`);
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

  // Group by (serie, base) using the *stripped* base to detect collisions.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.serieSlug}|${r.p.base}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      if (a.numInt !== b.numInt) return a.numInt - b.numInt;
      return a.number.localeCompare(b.number);
    });
  }

  // Compute new URL for each row.
  for (const r of rows) {
    const numStr = unpadNumber(r.number);
    const group  = groups.get(`${r.serieSlug}|${r.p.base}`)!;
    const size   = group.length;
    const idx    = group.findIndex((g) => g.id === r.id);

    const isEx = r.p.base.endsWith("-ex");

    let vRankStr = "";
    if (size === 2) {
      if (!isEx) {
        // Non-EX: first=V1, second=no V-rank
        if (idx === 0) vRankStr = "-V1";
      }
      // EX: both strip V-rank (Palkia-ex rule)
    } else if (size === 3) {
      // All strip V-rank (Trubbish PLS rule)
      // (default empty)
    } else if (size >= 4) {
      // First → V1, last → V2, middle → no V-rank (Victini NVI rule)
      if      (idx === 0)         vRankStr = "-V1";
      else if (idx === size - 1)  vRankStr = "-V2";
    }
    // size 1: no V-rank

    r.newUrl = `${r.p.episode}/${r.p.base}${vRankStr}-${r.p.code}${numStr}?language=2`;
  }

  const updates   = rows.filter((r) => r.newUrl && r.newUrl !== r.oldUrl);
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

  // Anchors — user-confirmed URLs from CM set listing click-throughs.
  const anchors = [
    // Singleton non-EX (Hoppip DRX)
    { serie: "dragons-exaltes",   num: "1",   want: "Dragons-Exalted/Hoppip-DRX1?language=2"                  },
    // 2-card non-EX collision: first=V1, second=strip
    { serie: "noir-et-blanc",     num: "1",   want: "Black-White/Snivy-V1-BLW1?language=2"                    },
    { serie: "noir-et-blanc",     num: "2",   want: "Black-White/Snivy-BLW2?language=2"                       },
    { serie: "noir-et-blanc",     num: "15",  want: "Black-White/Tepig-V1-BLW15?language=2"                   },
    { serie: "noir-et-blanc",     num: "16",  want: "Black-White/Tepig-BLW16?language=2"                      },
    // Reshiram/Zekrom: 2-card groups spanning basic Holo + Legendary Ultra
    { serie: "noir-et-blanc",     num: "26",  want: "Black-White/Reshiram-V1-BLW26?language=2"                },
    { serie: "noir-et-blanc",     num: "113", want: "Black-White/Reshiram-BLW113?language=2"                  },
    { serie: "noir-et-blanc",     num: "47",  want: "Black-White/Zekrom-V1-BLW47?language=2"                  },
    { serie: "noir-et-blanc",     num: "114", want: "Black-White/Zekrom-BLW114?language=2"                    },
    // 3-card Trubbish PLS: all strip V-rank
    { serie: "tempete-plasma",    num: "63",  want: "Plasma-Storm/Trubbish-PLS63?language=2"                  },
    { serie: "tempete-plasma",    num: "64",  want: "Plasma-Storm/Trubbish-PLS64?language=2"                  },
    { serie: "tempete-plasma",    num: "65",  want: "Plasma-Storm/Trubbish-PLS65?language=2"                  },
    // 4-card Victini NVI: first=V1, middle=strip, last=V2
    { serie: "nobles-victoires",  num: "14",  want: "Noble-Victories/Victini-V1-NVI14?language=2"             },
    { serie: "nobles-victoires",  num: "15",  want: "Noble-Victories/Victini-NVI15?language=2"                },
    { serie: "nobles-victoires",  num: "43",  want: "Noble-Victories/Victini-NVI43?language=2"                },
    { serie: "nobles-victoires",  num: "98",  want: "Noble-Victories/Victini-V2-NVI98?language=2"             },
    // 2-card EX (Palkia-ex PLB) — both strip V-rank, confirmed manually
    { serie: "explosion-plasma",  num: "66",  want: "Plasma-Blast/Palkia-ex-PLB66?language=2"                 },
    { serie: "explosion-plasma",  num: "100", want: "Plasma-Blast/Palkia-ex-PLB100?language=2"                },
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

  // Sample 10 diffs covering different series
  const samples: Row[] = [];
  const seenSeries = new Set<string>();
  for (const u of updates) {
    if (!seenSeries.has(u.serieSlug) && samples.length < 10) {
      samples.push(u);
      seenSeries.add(u.serieSlug);
    }
  }
  while (samples.length < 10 && samples.length < updates.length) {
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
