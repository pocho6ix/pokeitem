/**
 * fix-cm-urls-platinum.ts
 *
 * Rewrites Cardmarket URLs for the Platine bloc (Platinum era, 2009).
 *
 * Scope: 3 series — platine-base (Platinum), rivaux-emergeants (Rising-Rivals),
 * vainqueurs-supremes (Supreme-Victors). The arceus series has been removed from
 * the DB (set never released in France) and is not in scope.
 *
 * Pattern — verified on 12 anchor URLs from the CM set listings:
 *
 *   {Episode}/{Name}[-Lv{level}|-LVX][-V{rank}]-{CODE}{num_unpadded}?language=2
 *
 * Key divergences vs DB URLs (all of which are wrong):
 *
 * 1. Level segment added: CM embeds the Pokémon's in-game level (-Lv63-, -Lv46-)
 *    or -LVX- for Level-Up cards. Source: pokemontcg.io `level` field.
 * 2. V-rank removed in almost all cases (level + number already disambiguates).
 *    Only kept when the card appears in GHOST_VRANK_OVERRIDES (manual list of
 *    known exceptions such as Dialga-G #7 → V1).
 * 3. Number unpadded: PL007 → PL7, SV011 → SV11.
 * 4. Casing fixed on trainer/letter suffixes:
 *      -g-   → -G-
 *      -fb-  → -FB-
 *      -c-   → -C-
 *      -gl-  → -GL-
 *      -lvx- → -LVX-
 *      -e4-  → -E4-
 *      Pokémon names title-cased word-by-word (Frost-Rotom, not frost-rotom).
 * 5. `?language=2` appended (forces French display on CM).
 *
 * Source of truth:
 *   - pokemontcg.io API (`name`, `level`, `subtypes`) via the card's tcgdexId.
 *     Covers level data (unavailable in our DB) AND canonical English name.
 *   - Set listing URLs (manual spot-check during dry-run).
 *
 * Ghost V-rank handling:
 *   Some CM products have a V-rank despite no name-level collision visible in our
 *   DB (e.g. Dialga-G #7 has `-V1-` on CM even though Dialga-G Lv.79 is unique
 *   within the Platinum base set). These cases likely come from cross-set CM
 *   product disambiguation (promos / decks / reprints) and are unknowable without
 *   scraping CM directly (blocked by Cloudflare). The script keeps a manual list
 *   — extend it when new ghost cases are discovered via broken URLs.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-platinum.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-platinum.ts --verbose    # print every diff
 *   npx tsx scripts/fix-cm-urls-platinum.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-platinum.ts --trainers   # show trainer diffs
 *
 * API budget:
 *   ~406 pokemontcg.io calls on first run (serialised with 80ms delay).
 *   Zero CM/RapidAPI calls — preserves the daily quota for the history backfill.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma   = new PrismaClient();
const APPLY    = process.argv.includes("--apply");
const VERBOSE  = process.argv.includes("--verbose");
const TRAINERS = process.argv.includes("--trainers");

// Serie slug → canonical CM episode slug
const EPISODE_MAP: Record<string, string> = {
  "platine-base":         "Platinum",
  "rivaux-emergeants":    "Rising-Rivals",
  "vainqueurs-supremes":  "Supreme-Victors",
};

// Serie slug → set code used in the URL number suffix
const SET_CODE: Record<string, string> = {
  "platine-base":        "PL",
  "rivaux-emergeants":   "RR",
  "vainqueurs-supremes": "SV",
};

/**
 * Known ghost V-rank cards — CM adds V-rank despite no visible in-set collision.
 * Key = tcgdexId (pl1-7, pl2-103, etc.). Value = V-rank number (1, 2, 3, 4).
 * Extend as new ghosts are discovered. All other cards get no V-rank.
 */
const GHOST_VRANK_OVERRIDES: Record<string, number> = {
  "pl1-7":   1, // Dialga-G Lv.79 — CM uses -V1- even though unique in the set
  "pl1-104": 1, // Broken Time-Space (Stadium) — same ghost V1 pattern
};

interface PtcgCard {
  name:     string;
  supertype?: string;
  subtypes?: string[];
  level?:   string;
}

const ptcgCache = new Map<string, PtcgCard | null>();

async function fetchPtcg(tcgid: string, maxRetries = 4): Promise<PtcgCard | null> {
  if (ptcgCache.has(tcgid)) return ptcgCache.get(tcgid)!;
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`https://api.pokemontcg.io/v2/cards/${tcgid}`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      if (!res.ok) {
        // 404 etc. — real miss, no retry
        ptcgCache.set(tcgid, null);
        return null;
      }
      const body = await res.json() as { data?: PtcgCard };
      const card = body.data ?? null;
      ptcgCache.set(tcgid, card);
      return card;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  console.log(`   ⚠  ${tcgid}: échec après ${maxRetries} tentatives (${lastErr})`);
  ptcgCache.set(tcgid, null);
  return null;
}

/**
 * Transform a pokemontcg.io `name` into the slug fragment used in CM URLs.
 *   "Giratina"                → "Giratina"
 *   "Dialga G"                → "Dialga-G"
 *   "Giratina LV.X"           → "Giratina-LVX"
 *   "Charon's Choice"         → "Charons-Choice"
 *   "Broken Time-Space"       → "Broken-Time-Space"
 *   "Alakazam E4 LV.X"        → "Alakazam-E4-LVX"
 *   "Poké Ball"               → "Poke-Ball"     (accents → ASCII)
 *   "Pokédex HANDY910is"      → "Pokedex-HANDY910is"
 */
function nameToSlug(name: string): string {
  return name
    .replace(/LV\.X/g, "LVX")
    .replace(/['']/g, "")
    // Strip diacritics: é → e, ñ → n, etc. — CM URLs are ASCII
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function unpadNumber(cardNumber: string): string {
  // "007" → "7", "SH006" → "SH6", "RT01" → "RT1"
  const m = cardNumber.match(/^(\D*)(\d+)(.*)$/);
  if (!m) return cardNumber;
  return m[1] + String(parseInt(m[2], 10)) + m[3];
}

interface Row {
  id:        string;
  serieSlug: string;
  number:    string;
  name:      string;
  category:  string | null;
  tcgdexId:  string | null;
  oldUrl:    string;
  newUrl?:   string;
  skip?:     string; // reason
  warnings:  string[];
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { slug: { in: Object.keys(EPISODE_MAP) } },
    },
    select: {
      id: true, number: true, name: true, category: true,
      tcgdexId: true, cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Platine avec URL`);
  console.log(`   Fetch pokemontcg.io pour récupérer noms + niveaux...`);

  const rows: Row[] = [];
  let ptcgCalls = 0;

  for (const c of cards) {
    const row: Row = {
      id:        c.id,
      serieSlug: c.serie.slug,
      number:    c.number,
      name:      c.name,
      category:  c.category,
      tcgdexId:  c.tcgdexId,
      oldUrl:    c.cardmarketUrl!,
      warnings:  [],
    };

    if (!c.tcgdexId) {
      row.skip = "no tcgdexId";
      rows.push(row);
      continue;
    }

    let ptcg = await fetchPtcg(c.tcgdexId);
    ptcgCalls++;
    if (ptcgCalls % 50 === 0) {
      process.stdout.write(`   ${ptcgCalls}/${cards.length} ptcg calls…\n`);
    }
    await new Promise((r) => setTimeout(r, 120)); // rate-limit courtesy delay

    if (!ptcg || !ptcg.name) {
      // Second-chance retry after a cooldown (429 recovery)
      await new Promise((r) => setTimeout(r, 3000));
      ptcgCache.delete(c.tcgdexId);
      ptcg = await fetchPtcg(c.tcgdexId);
      if (!ptcg || !ptcg.name) {
        row.skip = `pokemontcg.io missing (${c.tcgdexId})`;
        rows.push(row);
        continue;
      }
    }

    const episode = EPISODE_MAP[c.serie.slug];
    const code    = SET_CODE[c.serie.slug];

    // Build base name slug
    const nameSlug = nameToSlug(ptcg.name);

    // Build level segment
    //  - LV.X cards (level === "X" or name contains LV.X): name already has LVX,
    //    no extra -Lv{level}- prefix.
    //  - Pokémon with numeric level: insert -Lv{level}-
    //  - Trainers/Energy (no level): no level segment
    const isLVX = ptcg.level === "X" || /LV\.X/.test(ptcg.name);
    let nameWithLevel: string;
    if (isLVX) {
      nameWithLevel = nameSlug; // already contains -LVX
    } else if (ptcg.level && /^\d+$/.test(ptcg.level)) {
      nameWithLevel = `${nameSlug}-Lv${ptcg.level}`;
    } else {
      nameWithLevel = nameSlug;
      if (ptcg.supertype === "Pokémon") {
        row.warnings.push(`Pokémon without level (ptcg.level=${JSON.stringify(ptcg.level)})`);
      }
    }

    // Build number + set code (no leading zero)
    const numUnpadded = unpadNumber(c.number);
    const codeNum     = `${code}${numUnpadded}`;

    // Ghost V-rank override
    const vRank = GHOST_VRANK_OVERRIDES[c.tcgdexId];
    const vSegment = vRank ? `-V${vRank}` : "";

    row.newUrl = `${episode}/${nameWithLevel}${vSegment}-${codeNum}?language=2`;
    rows.push(row);
  }

  console.log(`   ✓ ${ptcgCalls} pokemontcg.io calls done\n`);

  // ── Report ────────────────────────────────────────────────────────────
  const skipped   = rows.filter((r) => r.skip);
  const writable  = rows.filter((r) => !r.skip && r.newUrl);
  const unchanged = writable.filter((r) => r.newUrl === r.oldUrl);
  const diff      = writable.filter((r) => r.newUrl !== r.oldUrl);

  if (skipped.length > 0) {
    console.log(`⚠️  ${skipped.length} cartes ignorées:`);
    for (const s of skipped) {
      console.log(`   ${s.serieSlug.padEnd(22)} #${s.number.padEnd(6)} ${s.name.padEnd(30)} — ${s.skip}`);
    }
    console.log();
  }

  console.log(`📊 Résumé:`);
  console.log(`   ${writable.length} cartes à rewriter`);
  console.log(`     · ${unchanged.length} inchangées`);
  console.log(`     · ${diff.length} à modifier`);

  // Spot-check: anchor URLs must match
  const ANCHORS: Record<string, string> = {
    "pl1-10":  "Platinum/Giratina-Lv63-PL10?language=2",
    "pl1-124": "Platinum/Giratina-LVX-PL124?language=2",
    "pl1-126": "Platinum/Shaymin-LVX-PL126?language=2",
    "pl1-127": "Platinum/Shaymin-LVX-PL127?language=2",
    "pl1-12":  "Platinum/Palkia-G-Lv78-PL12?language=2",
    "pl1-7":   "Platinum/Dialga-G-Lv79-V1-PL7?language=2",
    "pl1-104": "Platinum/Broken-Time-Space-V1-PL104?language=2",
    "pl1-68":  "Platinum/Carnivine-Lv39-PL68?language=2",
    "pl1-SH6": "Platinum/Vulpix-Lv20-PLSH6?language=2",
    "pl2-RT2": "Rising-Rivals/Frost-Rotom-Lv46-RRRT2?language=2",
    "pl3-20":  "Supreme-Victors/Charizard-G-Lv65-SV20?language=2",
    "pl3-11":  "Supreme-Victors/Staraptor-FB-Lv50-SV11?language=2",
  };

  console.log(`\n🎯 Anchor validation (11 URLs confirmées par l'utilisateur):`);
  let anchorFail = 0;
  for (const [tcgid, expected] of Object.entries(ANCHORS)) {
    const row = rows.find((r) => r.tcgdexId === tcgid);
    if (!row) {
      console.log(`   ✗ ${tcgid.padEnd(10)} MANQUANTE en DB`);
      anchorFail++;
      continue;
    }
    const ok = row.newUrl === expected;
    const sym = ok ? "✓" : "✗";
    console.log(`   ${sym} ${tcgid.padEnd(10)} ${row.newUrl}`);
    if (!ok) {
      console.log(`     expected: ${expected}`);
      anchorFail++;
    }
  }

  if (anchorFail > 0) {
    console.log(`\n❌ ${anchorFail}/${Object.keys(ANCHORS).length} anchors FAIL — ne pas appliquer avant correction.`);
    if (APPLY) {
      console.log(`   Refus d'appliquer.`);
      await prisma.$disconnect();
      process.exit(1);
    }
  } else {
    console.log(`\n✅ ${Object.keys(ANCHORS).length}/${Object.keys(ANCHORS).length} anchors OK`);
  }

  // Show sample diffs
  console.log(`\n📝 Échantillon (premiers 15 diffs):`);
  for (const d of diff.slice(0, 15)) {
    console.log(`   [${d.serieSlug}] #${d.number} ${d.name}`);
    console.log(`     OLD: ${d.oldUrl}`);
    console.log(`     NEW: ${d.newUrl}`);
  }

  // Show trainer diffs separately (higher risk of wrong format)
  const trainerDiffs = diff.filter((r) => r.category === "Dresseur" || r.category === "Énergie");
  console.log(`\n🎫 ${trainerDiffs.length} dresseur/énergie à modifier`);
  if (TRAINERS || VERBOSE) {
    for (const d of trainerDiffs) {
      console.log(`   [${d.serieSlug}] #${d.number} ${d.name}`);
      console.log(`     OLD: ${d.oldUrl}`);
      console.log(`     NEW: ${d.newUrl}`);
    }
  }

  // Warnings
  const withWarnings = rows.filter((r) => r.warnings.length > 0);
  if (withWarnings.length > 0) {
    console.log(`\n⚠️  ${withWarnings.length} cartes avec warnings:`);
    for (const w of withWarnings) {
      console.log(`   [${w.serieSlug}] #${w.number} ${w.name}: ${w.warnings.join(", ")}`);
    }
  }

  if (VERBOSE) {
    console.log(`\n📜 Toutes les modifications (${diff.length}):`);
    for (const d of diff) {
      console.log(`   [${d.serieSlug.padEnd(22)}] #${d.number.padEnd(5)} ${d.name.padEnd(30)}`);
      console.log(`     ${d.oldUrl}`);
      console.log(`  -> ${d.newUrl}`);
    }
  }

  // ── Apply ────────────────────────────────────────────────────────────
  if (APPLY) {
    if (anchorFail > 0) { await prisma.$disconnect(); return; }
    console.log(`\n✏️  Écriture ${diff.length} URLs dans la DB...`);
    let written = 0;
    for (const d of diff) {
      await prisma.card.update({
        where: { id: d.id },
        data:  { cardmarketUrl: d.newUrl },
      });
      written++;
      if (written % 50 === 0) process.stdout.write(`   ${written}/${diff.length}\n`);
    }
    console.log(`   ✓ ${written} URLs écrites`);
  } else {
    console.log(`\n(dry-run — relancer avec --apply pour écrire)`);
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
