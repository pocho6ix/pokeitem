/**
 * fix-cm-urls-xy.ts
 *
 * Rewrites Cardmarket URLs for the XY bloc (2014–2016).
 *
 * Scope: strictly limited to bloc "XY" — 16 series from XY base to Evolutions.
 *
 * Pattern — empirically verified on ~25 anchor URLs:
 *
 *   {Episode}/{TransformedBase}[-V{rank}]-{CODE}{num_unpadded}?language=2
 *
 * Transforms vs the current DB URLs:
 *
 * 1. Numbers unpadded: FLF011 → FLF11
 * 2. EX marker uppercased: `-ex` → `-EX`
 * 3. Mega prefix flattened:
 *      `M-venusaur-ex` → `MVenusaur-EX`
 *    (drop the hyphen, capitalise the name, uppercase EX)
 * 4. `?language=2` always present.
 * 5. V-rank recomputed from scratch (DB V-ranks for XY are unreliable):
 *      - Singleton in group:  no V-rank
 *      - 2-card collision:    no V-rank (both EX and non-EX)
 *      - 3+ non-EX collision: no V-rank
 *      - 3+ Mega-EX collision: linear V1/V2/V3/V4 by card number
 *      - 3+ regular-EX collision: first=V1, last=V2, middle cards=no V-rank
 *
 * The 3-card regular-EX rule is the most surprising finding. Example:
 *   FLF Charizard-EX exists at #11, #12, #100. CM has:
 *     #11  → Charizard-EX-V1-FLF11
 *     #12  → Charizard-EX-FLF12        (no V-rank — "middle" card)
 *     #100 → Charizard-EX-V2-FLF100
 *   whereas FLF M-Charizard-EX (4 cards: #13, #69, #107, #108) is linear V1/V2/V3/V4.
 *
 * Zero API calls — pure DB rewrite.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-xy.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-xy.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-xy.ts --verbose    # print every diff
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

interface Parsed {
  episode:   string;
  base:      string;
  vRank:     number | null;
  code:      string;
  numDigits: string;
}

function parseOldUrl(url: string): Parsed | null {
  const [pathPart] = url.split("?");
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);
  const m = rest.match(/^(.+?)(?:-V(\d+))?-([A-Z]{2,})(\w+)$/);
  if (!m) return null;
  return {
    episode,
    base:      m[1],
    vRank:     m[2] ? parseInt(m[2], 10) : null,
    code:      m[3],
    numDigits: m[4],
  };
}

/** Strip leading zeros from a card number, preserving trailing suffixes like "a". */
function unpadNumber(cardNumber: string): string {
  const stripped = cardNumber.replace(/^0+/, "");
  return stripped === "" ? cardNumber : stripped;
}

type CardType = "non-ex" | "regular-ex" | "mega-ex";

function classify(base: string): CardType {
  if (base.startsWith("M-") && base.endsWith("-ex")) return "mega-ex";
  if (base.endsWith("-ex")) return "regular-ex";
  return "non-ex";
}

/** DB base → CM canonical base (EX uppercased, Mega flattened). */
function transformBase(base: string, type: CardType): string {
  if (type === "non-ex")     return base;
  if (type === "regular-ex") return base.slice(0, -3) + "-EX";
  // mega-ex: "M-charizard-ex" → "MCharizard-EX"
  const nameLower = base.slice(2, -3);
  const nameCap   = nameLower.charAt(0).toUpperCase() + nameLower.slice(1);
  return `M${nameCap}-EX`;
}

interface Row {
  id:        string;
  serieSlug: string;
  number:    string;
  numInt:    number;
  name:      string;
  oldUrl:    string;
  p:         Parsed;
  type:      CardType;
  newUrl?:   string;
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { bloc: { name: "XY" } },
    },
    select: {
      id: true, number: true, name: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes XY avec URL\n`);

  const rows:     Row[]        = [];
  const unparsed: typeof cards = [];

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); continue; }
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
      type:      classify(p.base),
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

  // Group by (serie, base) to detect collisions. Sort groups by card number.
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
    const numStr          = unpadNumber(r.number);
    const transformedBase = transformBase(r.p.base, r.type);
    const group           = groups.get(`${r.serieSlug}|${r.p.base}`)!;
    const size            = group.length;
    const idx             = group.findIndex((g) => g.id === r.id);

    let vRankStr = "";
    if (size >= 3) {
      if (r.type === "mega-ex") {
        // Linear V1/V2/V3/V4 by sorted position
        vRankStr = `-V${idx + 1}`;
      } else if (r.type === "regular-ex") {
        // First → V1, last → V2, middle → no V-rank
        if      (idx === 0)         vRankStr = "-V1";
        else if (idx === size - 1)  vRankStr = "-V2";
      }
      // non-EX with 3+ cards: no V-rank (default)
    }
    // size 1 or 2: no V-rank for any type

    r.newUrl = `${r.p.episode}/${transformedBase}${vRankStr}-${r.p.code}${numStr}?language=2`;
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

  // Anchors — user-confirmed URLs from CM set listing clicks
  const anchors = [
    // Singleton non-EX
    { serie: "etincelles-xy",      num: "1",   want: "Flashfire/Caterpie-FLF1?language=2"                   },
    { serie: "double-danger",      num: "1",   want: "Double-Crisis/Team-magmas-numel-DCR1?language=2"      },
    // 2-card non-EX collision
    { serie: "etincelles-xy",      num: "18",  want: "Flashfire/Litleo-FLF18?language=2"                    },
    { serie: "etincelles-xy",      num: "19",  want: "Flashfire/Litleo-FLF19?language=2"                    },
    { serie: "impact-des-destins", num: "10",  want: "Fates-Collide/Fennekin-FCO10?language=2"              },
    { serie: "impact-des-destins", num: "11",  want: "Fates-Collide/Fennekin-FCO11?language=2"              },
    // 2-card regular-EX collision
    { serie: "etincelles-xy",      num: "35",  want: "Flashfire/Magnezone-EX-FLF35?language=2"              },
    { serie: "etincelles-xy",      num: "101", want: "Flashfire/Magnezone-EX-FLF101?language=2"             },
    // 3-card regular-EX collision (first/middle/last)
    { serie: "etincelles-xy",      num: "11",  want: "Flashfire/Charizard-EX-V1-FLF11?language=2"           },
    { serie: "etincelles-xy",      num: "12",  want: "Flashfire/Charizard-EX-FLF12?language=2"              },
    { serie: "etincelles-xy",      num: "100", want: "Flashfire/Charizard-EX-V2-FLF100?language=2"          },
    // 4-card Mega-EX collision (linear V1..V4)
    { serie: "etincelles-xy",      num: "13",  want: "Flashfire/MCharizard-EX-V1-FLF13?language=2"          },
    { serie: "etincelles-xy",      num: "69",  want: "Flashfire/MCharizard-EX-V2-FLF69?language=2"          },
    { serie: "etincelles-xy",      num: "107", want: "Flashfire/MCharizard-EX-V3-FLF107?language=2"         },
    { serie: "etincelles-xy",      num: "108", want: "Flashfire/MCharizard-EX-V4-FLF108?language=2"         },
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

  // Sample 16 diffs covering different series
  const samples: Row[] = [];
  const seenSeries = new Set<string>();
  for (const u of updates) {
    if (!seenSeries.has(u.serieSlug) && samples.length < 16) {
      samples.push(u);
      seenSeries.add(u.serieSlug);
    }
  }
  while (samples.length < 16 && samples.length < updates.length) {
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
