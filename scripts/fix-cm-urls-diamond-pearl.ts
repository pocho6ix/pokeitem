/**
 * fix-cm-urls-diamond-pearl.ts
 *
 * Rewrites Cardmarket URLs for the Diamant & Perle bloc (Diamond & Pearl era,
 * 2007–2009). Scope: 7 series (promos excluded — they have no CM URLs).
 *
 *   aube-majestueuse       → Majestic-Dawn        (MD)
 *   diamant-et-perle       → Diamond-Pearl        (DP)
 *   eveil-des-legendes     → Legends-Awakened     (LA)
 *   grands-envols          → Great-Encounters     (GE)
 *   merveilles-secretes    → Secret-Wonders       (SW)
 *   tempete-dp             → Stormfront           (STF ← exception: not SF!)
 *   tresors-mysterieux     → Mysterious-Treasures (MT)
 *
 * Pattern — verified on 12 anchor URLs from CM set listings:
 *
 *   {Episode}/{Name}-Lv{level}-{CODE}{num_unpadded}?language=2
 *   {Episode}/{Name}-(lvx|LVX)-{CODE}{num_unpadded}?language=2
 *
 * Key rewrites vs DB URLs:
 *
 * 1. Level segment added (source: pokemontcg.io `level` field). Disambiguates
 *    what V1/V2/V3 used to disambiguate in the old scrape.
 * 2. All V-ranks stripped: CM does NOT use V-rank on Diamant & Perle cards —
 *    level + set number is unique enough.
 * 3. Number unpadded: LA006 → LA6, DP005 → DP5.
 * 4. Stormfront's set code is **STF**, not SF (the DB scrape got this wrong).
 * 5. LVX casing:
 *      - diamant-et-perle  → lowercase `-lvx-`  (Empoleon-lvx-DP120)
 *      - all other D&P sets → uppercase `-LVX-` (Leafeon-LVX-MD99, Dusknoir-LVX-STF96)
 * 6. Unown bracket letters (`Unown [I]`, `Unown [!]` from pokemontcg.io) are
 *    dropped from the slug — CM uses level-based disambiguation for Unowns
 *    (Unown-Lv16-LA42, not Unown-I-LA42).
 * 7. `?language=2` always appended.
 *
 * Ghost V-rank handling: none known in D&P (every anchor confirmed no V-rank).
 * If one is discovered post-apply, add to GHOST_VRANK_OVERRIDES like Platine.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-diamond-pearl.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-diamond-pearl.ts --verbose    # every diff
 *   npx tsx scripts/fix-cm-urls-diamond-pearl.ts --trainers   # trainer diffs
 *   npx tsx scripts/fix-cm-urls-diamond-pearl.ts --apply      # write DB
 *
 * API budget: ~844 pokemontcg.io calls (serialised, 120ms delay). Zero CM calls.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma   = new PrismaClient();
const APPLY    = process.argv.includes("--apply");
const VERBOSE  = process.argv.includes("--verbose");
const TRAINERS = process.argv.includes("--trainers");

const EPISODE_MAP: Record<string, string> = {
  "aube-majestueuse":    "Majestic-Dawn",
  "diamant-et-perle":    "Diamond-Pearl",
  "eveil-des-legendes":  "Legends-Awakened",
  "grands-envols":       "Great-Encounters",
  "merveilles-secretes": "Secret-Wonders",
  "tempete-dp":          "Stormfront",
  "tresors-mysterieux":  "Mysterious-Treasures",
};

const SET_CODE: Record<string, string> = {
  "aube-majestueuse":    "MD",
  "diamant-et-perle":    "DP",
  "eveil-des-legendes":  "LA",
  "grands-envols":       "GE",
  "merveilles-secretes": "SW",
  "tempete-dp":          "STF",
  "tresors-mysterieux":  "MT",
};

// Which series use lowercase `-lvx-` instead of uppercase `-LVX-`
const LVX_LOWERCASE = new Set<string>(["diamant-et-perle"]);

// Manual overrides for ghost V-ranks. Seeded empty; extend if a post-apply
// check reveals broken URLs that need a V-rank restored.
const GHOST_VRANK_OVERRIDES: Record<string, number> = {};

// Stormfront anomaly: three "Poké X +" trainer cards use the legacy SF code
// instead of STF (likely because CM scraped them from a pre-STF batch and
// never migrated). All other Stormfront cards use STF.
const SET_CODE_OVERRIDE: Record<string, string> = {
  "dp7-88": "SF", // Poké Blower + (Poke-Blower-SF88)
  "dp7-89": "SF", // Poké Drawer + (Poke-Drawer-SF89)
  "dp7-90": "SF", // Poké Healer + (inferred from the pattern)
};

interface PtcgCard {
  name:       string;
  supertype?: string;
  subtypes?:  string[];
  level?:     string;
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
 * Transform pokemontcg.io `name` into the URL slug fragment:
 *   "Infernape"         → "Infernape"
 *   "Empoleon LV.X"     → "Empoleon-LVX"
 *   "Unown [I]"         → "Unown"        (letter dropped — level disambiguates)
 *   "Charon's Choice"   → "Charons-Choice"
 *   "Poké Ball"         → "Poke-Ball"
 */
function nameToSlug(name: string): string {
  return name
    .replace(/\s*\[.\]\s*/g, "")            // "Unown [I]" → "Unown"
    .replace(/\s*\+\s*/g, " ")              // "Poké Blower +" → "Poke Blower" (CM strips +)
    .replace(/LV\.X/g, "LVX")
    .replace(/['']/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unpadNumber(cardNumber: string): string {
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
  skip?:     string;
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

  console.log(`\n📦 ${cards.length} cartes D&P avec URL`);
  console.log(`   Fetch pokemontcg.io pour niveau + nom canonique…`);

  const rows: Row[] = [];
  let ptcgCalls = 0;

  for (const c of cards) {
    const row: Row = {
      id: c.id, serieSlug: c.serie.slug, number: c.number, name: c.name,
      category: c.category, tcgdexId: c.tcgdexId, oldUrl: c.cardmarketUrl!,
      warnings: [],
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
    await new Promise((r) => setTimeout(r, 120));

    if (!ptcg || !ptcg.name) {
      // Second-chance retry after cooldown (429 recovery)
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
    const code    = SET_CODE_OVERRIDE[c.tcgdexId] ?? SET_CODE[c.serie.slug];
    const lvxLower = LVX_LOWERCASE.has(c.serie.slug);

    let nameSlug = nameToSlug(ptcg.name);
    if (lvxLower && nameSlug.endsWith("-LVX")) {
      nameSlug = nameSlug.slice(0, -4) + "-lvx";
    }

    const isLVX = ptcg.level === "X" || /LV\.X/.test(ptcg.name);
    let nameWithLevel: string;
    if (isLVX) {
      nameWithLevel = nameSlug;
    } else if (ptcg.level && /^\d+$/.test(ptcg.level)) {
      nameWithLevel = `${nameSlug}-Lv${ptcg.level}`;
    } else {
      nameWithLevel = nameSlug;
      if (ptcg.supertype === "Pokémon") {
        row.warnings.push(`Pokémon without level (ptcg.level=${JSON.stringify(ptcg.level)})`);
      }
    }

    const codeNum = `${code}${unpadNumber(c.number)}`;
    const vRank   = GHOST_VRANK_OVERRIDES[c.tcgdexId];
    const vSeg    = vRank ? `-V${vRank}` : "";

    row.newUrl = `${episode}/${nameWithLevel}${vSeg}-${codeNum}?language=2`;
    rows.push(row);
  }

  console.log(`   ✓ ${ptcgCalls} pokemontcg.io calls done\n`);

  const skipped  = rows.filter((r) => r.skip);
  const writable = rows.filter((r) => !r.skip && r.newUrl);
  const diff     = writable.filter((r) => r.newUrl !== r.oldUrl);

  if (skipped.length > 0) {
    console.log(`⚠️  ${skipped.length} cartes ignorées:`);
    for (const s of skipped) {
      console.log(`   ${s.serieSlug.padEnd(22)} #${s.number.padEnd(6)} ${s.name.padEnd(30)} — ${s.skip}`);
    }
    console.log();
  }

  console.log(`📊 Résumé:`);
  console.log(`   ${writable.length} cartes à rewriter`);
  console.log(`     · ${diff.length} à modifier`);

  const ANCHORS: Record<string, string> = {
    "dp1-5":    "Diamond-Pearl/Infernape-Lv40-DP5?language=2",
    "dp1-120":  "Diamond-Pearl/Empoleon-lvx-DP120?language=2",
    "dp2-12":   "Mysterious-Treasures/Magmortar-Lv48-MT12?language=2",
    "dp3-23":   "Secret-Wonders/Banette-Lv42-SW23?language=2",
    "dp4-3":    "Great-Encounters/Darkrai-Lv38-GE3?language=2",
    "dp5-5":    "Majestic-Dawn/Glaceon-Lv44-MD5?language=2",
    "dp5-99":   "Majestic-Dawn/Leafeon-LVX-MD99?language=2",
    "dp6-6":    "Legends-Awakened/Heatran-Lv47-LA6?language=2",
    "dp6-42":   "Legends-Awakened/Unown-Lv16-LA42?language=2",
    "dp7-1":    "Stormfront/Dusknoir-Lv48-STF1?language=2",
    "dp7-59":   "Stormfront/Duskull-Lv12-STF59?language=2",
    "dp7-96":   "Stormfront/Dusknoir-LVX-STF96?language=2",
    "dp7-88":   "Stormfront/Poke-Blower-SF88?language=2",
    "dp7-89":   "Stormfront/Poke-Drawer-SF89?language=2",
  };

  console.log(`\n🎯 Anchor validation (12 URLs confirmées) :`);
  let fails = 0;
  for (const [tcgid, expected] of Object.entries(ANCHORS)) {
    const r = rows.find((x) => x.tcgdexId === tcgid);
    if (!r) { console.log(`   ✗ ${tcgid.padEnd(10)} MANQUANTE en DB`); fails++; continue; }
    const ok = r.newUrl === expected;
    console.log(`   ${ok ? "✓" : "✗"} ${tcgid.padEnd(10)} ${r.newUrl}`);
    if (!ok) { console.log(`     expected: ${expected}`); fails++; }
  }
  if (fails > 0) {
    console.log(`\n❌ ${fails}/${Object.keys(ANCHORS).length} anchors FAIL — refus d'appliquer`);
    if (APPLY) { await prisma.$disconnect(); process.exit(1); }
  } else {
    console.log(`\n✅ ${Object.keys(ANCHORS).length}/${Object.keys(ANCHORS).length} anchors OK`);
  }

  console.log(`\n📝 Échantillon (15 premiers diffs) :`);
  for (const d of diff.slice(0, 15)) {
    console.log(`   [${d.serieSlug}] #${d.number} ${d.name}`);
    console.log(`     OLD: ${d.oldUrl}`);
    console.log(`     NEW: ${d.newUrl}`);
  }

  const trainerDiffs = diff.filter((r) => r.category === "Dresseur" || r.category === "Énergie");
  console.log(`\n🎫 ${trainerDiffs.length} dresseur/énergie à modifier`);
  if (TRAINERS || VERBOSE) {
    for (const d of trainerDiffs) {
      console.log(`   [${d.serieSlug}] #${d.number} ${d.name}`);
      console.log(`     OLD: ${d.oldUrl}`);
      console.log(`     NEW: ${d.newUrl}`);
    }
  }

  const withWarn = rows.filter((r) => r.warnings.length > 0);
  if (withWarn.length > 0) {
    console.log(`\n⚠️  ${withWarn.length} cartes avec warnings:`);
    for (const w of withWarn) {
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

  if (APPLY) {
    if (fails > 0) { await prisma.$disconnect(); return; }
    console.log(`\n✏️  Écriture ${diff.length} URLs dans la DB...`);
    let written = 0;
    for (const d of diff) {
      await prisma.card.update({ where: { id: d.id }, data: { cardmarketUrl: d.newUrl! } });
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
