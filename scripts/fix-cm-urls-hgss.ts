/**
 * fix-cm-urls-hgss.ts
 *
 * Rewrites Cardmarket URLs for the HeartGold & SoulSilver bloc (2010–2011).
 *
 * Scope: 4 series with real CM URLs — heartgold-soulsilver-base, dechainement
 * (Unleashed), indomptable (Undaunted), triomphe (Triumphant). Promos have no
 * URLs so they're ignored.
 *
 * Pattern — empirically verified on 9 anchor URLs from the CM set listings:
 *
 *   {Episode}/{Base}[-V{rank}]-{CODE}{num_unpadded}?language=2
 *
 * Transforms vs the current DB URLs:
 *
 * 1. Episode casing fixed (this is the big one for HGSS):
 *      Heartgold-Soulsilver → HeartGold-SoulSilver
 *      Hs-Unleashed         → Unleashed
 *      Hs-Undaunted         → Undaunted
 *      Hs-Triumphant        → Triumphant
 * 2. Numbers unpadded: HS014 → HS14.
 * 3. `?language=2` always present.
 * 4. V-rank recomputed per card type:
 *      - LEGEND 2-card pair (top+bottom halves): first=V1, last=V2
 *      - Regular 2-card collision (non-LEGEND): both strip V-rank (XY rule)
 *      - Singleton: strip any DB V-rank
 *    HGSS has no 3+ card collision groups.
 * 5. LEGEND base name rewritten from lowercase to canonical casing:
 *      ho-oh-legend          → Ho-Oh-LEGEND
 *      lugia-legend          → Lugia-LEGEND
 *      entei-raikou-legend   → Entei-Raikou-LEGEND  (…and similar doubles)
 *
 * Known divergences (flagged, not auto-fixed):
 *
 * - **Data corruption**: 39 cards in `dechainement`/`triomphe` have URLs whose
 *   Pokémon name doesn't match the card name (seeding bug — e.g.
 *   "Xatu" in dechainement pointing to "Venomoth-TM011"). Detected via the
 *   episode mismatch heuristic. These are skipped from rewrite.
 *
 * - **Pichu HS28**: DB singleton but CM canonical is `Pichu-V1-HS28` (a ghost
 *   V2 product exists on CM that has no DB counterpart). `Pichu-HS28` alone
 *   404s. Script produces `Pichu-HS28` and the card will remain broken until
 *   manually fixed.
 *
 * - **Alph lithographs** (HSONE, ULTWO, UDTHREE, TMFOUR): non-numeric card
 *   numbers break the standard URL regex. Skipped from rewrite.
 *
 * - **Other ghost V-rank singletons**: 11 cards have V1/V2 in their DB URL
 *   despite being singletons in the DB. Listed at the end of the dry-run so
 *   the user can spot-check them.
 *
 * Zero API calls — pure DB rewrite.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-hgss.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-hgss.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-hgss.ts --verbose    # print every diff
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// DB episode → canonical CM episode
const EPISODE_MAP: Record<string, string> = {
  "Heartgold-Soulsilver": "HeartGold-SoulSilver",
  "Hs-Unleashed":         "Unleashed",
  "Hs-Undaunted":         "Undaunted",
  "Hs-Triumphant":        "Triumphant",
};

// Serie slug → expected DB episodes (for detecting the 39 anomaly cards)
const EXPECTED_EPISODES: Record<string, string[]> = {
  "heartgold-soulsilver-base": ["Heartgold-Soulsilver"],
  "dechainement":              ["Hs-Unleashed"],
  "indomptable":               ["Hs-Undaunted"],
  "triomphe":                  ["Hs-Triumphant"],
};

interface Parsed {
  episode:   string;
  base:      string;
  oldVRank:  number | null;
  code:      string;
  numDigits: string;
}

function parseOldUrl(url: string): Parsed | null {
  const [pathPart] = url.split("?");
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);
  const m = rest.match(/^(.+?)(?:-V(\d+))?-([A-Z]{2,})(\d+[a-z]*)$/);
  if (!m) return null;
  return {
    episode,
    base:      m[1],
    oldVRank:  m[2] ? parseInt(m[2], 10) : null,
    code:      m[3],
    numDigits: m[4],
  };
}

function unpadNumber(cardNumber: string): string {
  const m = cardNumber.match(/^(\d+)(.*)$/);
  if (!m) return cardNumber;
  return String(parseInt(m[1], 10)) + m[2];
}

/**
 * Rewrite a LEGEND base from lowercase DB form to canonical CM form.
 * Examples:
 *   ho-oh-legend        → Ho-Oh-LEGEND
 *   lugia-legend        → Lugia-LEGEND
 *   entei-raikou-legend → Entei-Raikou-LEGEND
 */
function transformLegendBase(base: string): string {
  if (!/-legend$/i.test(base)) return base;
  const prefix = base.replace(/-legend$/i, "");
  const parts = prefix.split("-").map((p) =>
    p.length === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  );
  return parts.join("-") + "-LEGEND";
}

interface Row {
  id:        string;
  serieSlug: string;
  number:    string;
  numInt:    number;
  name:      string;
  oldUrl:    string;
  p:         Parsed;
  isLegend:  boolean;
  newUrl?:   string;
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { bloc: { name: "HeartGold SoulSilver" } },
    },
    select: {
      id: true, number: true, name: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes HGSS avec URL\n`);

  const rows:      Row[]        = [];
  const unparsed:  typeof cards = [];
  const anomalies: typeof cards = [];

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); continue; }

    // Anomaly detection: episode in URL doesn't match the serie's expected episode
    const expected = EXPECTED_EPISODES[c.serie.slug];
    if (expected && !expected.includes(p.episode)) {
      anomalies.push(c);
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
      isLegend:  /-legend$/i.test(p.base),
    });
  }

  if (unparsed.length > 0) {
    console.log(`⚠️  ${unparsed.length} URLs non parsables — ignorées (probablement Alph Lithograph)`);
    for (const u of unparsed) {
      console.log(`   ${u.serie.slug.padEnd(30)} #${u.number.padEnd(6)} ${u.name.padEnd(25)} ${u.cardmarketUrl}`);
    }
  }
  if (anomalies.length > 0) {
    console.log(`\n⚠️  ${anomalies.length} URLs anomalie (épisode URL ≠ série DB) — NON modifiées`);
    if (VERBOSE) {
      for (const a of anomalies.slice(0, 10)) {
        console.log(`   ${a.serie.slug.padEnd(22)} #${a.number.padEnd(5)} ${a.name.padEnd(25)} ${a.cardmarketUrl}`);
      }
      if (anomalies.length > 10) console.log(`   …(+${anomalies.length - 10})`);
    }
  }
  console.log();

  // Group by (serie, base) using the *stripped* base (no V-rank) to detect collisions.
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
    const newEpisode = EPISODE_MAP[r.p.episode] ?? r.p.episode;
    const newBase    = r.isLegend ? transformLegendBase(r.p.base) : r.p.base;
    const numStr     = unpadNumber(r.p.numDigits);
    const group      = groups.get(`${r.serieSlug}|${r.p.base}`)!;
    const size       = group.length;
    const idx        = group.findIndex((g) => g.id === r.id);

    let vRankStr = "";
    if (size === 2) {
      if (r.isLegend) {
        // LEGEND pair: first → V1, last → V2
        vRankStr = idx === 0 ? "-V1" : "-V2";
      }
      // Non-LEGEND 2-card: both strip V-rank (XY rule)
    } else if (size === 1) {
      // Singleton: preserve the DB's V-rank (may be a ghost pointing to a CM
      // product the DB doesn't see — stripping it often 404s).
      if (r.p.oldVRank !== null) vRankStr = `-V${r.p.oldVRank}`;
    }

    // Hardcoded override for Pichu HS28: DB has no V-rank but CM canonical is
    // `Pichu-V1-HS28` (a ghost V2 product exists on CM).
    if (r.serieSlug === "heartgold-soulsilver-base" && r.number === "28" && r.name === "Pichu") {
      vRankStr = "-V1";
    }

    r.newUrl = `${newEpisode}/${newBase}${vRankStr}-${r.p.code}${numStr}?language=2`;
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

  // Anchors — user-confirmed URLs from the CM set listings.
  const anchors = [
    // HS base: 2-card non-EX (Ampharos regular + Prime)
    { serie: "heartgold-soulsilver-base", num: "14",  want: "HeartGold-SoulSilver/Ampharos-HS14?language=2"           },
    { serie: "heartgold-soulsilver-base", num: "105", want: "HeartGold-SoulSilver/Ampharos-HS105?language=2"          },
    // HS base: LEGEND pair (Ho-Oh top/bottom)
    { serie: "heartgold-soulsilver-base", num: "111", want: "HeartGold-SoulSilver/Ho-Oh-LEGEND-V1-HS111?language=2"   },
    { serie: "heartgold-soulsilver-base", num: "112", want: "HeartGold-SoulSilver/Ho-Oh-LEGEND-V2-HS112?language=2"   },
    // Unleashed: singleton
    { serie: "dechainement",              num: "43",  want: "Unleashed/Aipom-UL43?language=2"                         },
    // Undaunted: 2-card non-EX (Eevee pair)
    { serie: "indomptable",               num: "47",  want: "Undaunted/Eevee-UD47?language=2"                         },
    { serie: "indomptable",               num: "48",  want: "Undaunted/Eevee-UD48?language=2"                         },
    // Triumphant: singleton
    { serie: "triomphe",                  num: "91",  want: "Triumphant/Absol-TM91?language=2"                        },
    // HS base: ghost singleton (Pichu HS28, CM canonical forces V1)
    { serie: "heartgold-soulsilver-base", num: "28",  want: "HeartGold-SoulSilver/Pichu-V1-HS28?language=2"            },
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

  // Sample 6 diffs covering different series
  const samples: Row[] = [];
  const seenSeries = new Set<string>();
  for (const u of updates) {
    if (!seenSeries.has(u.serieSlug) && samples.length < 6) {
      samples.push(u);
      seenSeries.add(u.serieSlug);
    }
  }
  while (samples.length < 6 && samples.length < updates.length) {
    samples.push(updates[samples.length]);
  }
  console.log("Échantillon (diversifié par série) :");
  for (const u of samples) {
    console.log(`  ${u.serieSlug.padEnd(26)} #${u.number.padEnd(5)} ${u.name}`);
    console.log(`    − ${u.oldUrl}`);
    console.log(`    + ${u.newUrl}`);
  }

  if (VERBOSE && updates.length > samples.length) {
    console.log(`\n─── Toutes les corrections ─────────────────────────────────\n`);
    for (const u of updates) {
      console.log(`  ${u.serieSlug.padEnd(26)} #${u.number.padEnd(5)} ${u.name}`);
      console.log(`    − ${u.oldUrl}`);
      console.log(`    + ${u.newUrl}`);
    }
  }

  // Ghost V-rank singletons: DB URL has V-rank even though the card is a
  // singleton in its collision group. These are preserved as-is (the V-rank
  // usually points to a real CM product the DB doesn't see).
  console.log("\nℹ️  Singletons avec V-rank préservé (V-rank DB gardé tel quel) :");
  let ghostCount = 0;
  for (const [, g] of groups) {
    if (g.length !== 1) continue;
    if (g[0].p.oldVRank !== null) {
      ghostCount++;
      console.log(`  ${g[0].serieSlug.padEnd(26)} #${g[0].number.padEnd(5)} ${g[0].name.padEnd(25)} → ${g[0].newUrl}`);
    }
  }
  console.log(`  (total : ${ghostCount} — Pichu HS28 est hardcodé en V1 séparément)`);

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
    if (written % 200 === 0) process.stdout.write(`  ${written}/${updates.length}\n`);
  }
  console.log(`✅ ${written} URLs mises à jour`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
