/**
 * fix-cm-urls-ex.ts
 *
 * Rewrites Cardmarket URLs for the EX bloc (2003-2007). 14 series, ~1,482
 * cards with cardmarketUrl set today.
 *
 * Unlike the Platine / D&P scripts, the EX bloc doesn't need pokemontcg.io
 * level lookups — EX-era cards had no "Lv" marker in CM URLs. The fix is
 * purely a DB rewrite: parse each existing URL and apply the following
 * transformations to match CM's canonical paths.
 *
 *   Rules
 *   -----
 *   1. Episode slug: "Ex-" → "EX-" (applies to all 14 series)
 *   2. CamelCase remap for one specific episode:
 *        Ex-Firered-Leafgreen → EX-FireRed-LeafGreen
 *   3. Lowercase connector in the Magma/Aqua episode:
 *        Ex-Team-Magma-Vs-Team-Aqua → EX-Team-Magma-vs-Team-Aqua
 *   4. Set-code remap (CM uses its own code, not the ptcgo one):
 *        RG → FL  (EX FireRed & LeafGreen)
 *      All other 13 set codes are unchanged.
 *   5. Strip every V-rank segment (-V1-, -V2-, ...). CM never uses them on
 *      EX cards even when the DB does.
 *   6. Unpad the numeric portion: RS029 → RS29, DR090 → DR90, etc. Promo
 *      prefixes (SH#, RT#) stay intact in their own section.
 *   7. Title-case each word in the card base slug, except the trailing
 *      Pokémon-ex marker which MUST stay lowercase "-ex". This fixes
 *      legacy DB rows like "Team-magmas-houndour" → "Team-Magmas-Houndour"
 *      and "Lightning-energy" → "Lightning-Energy".
 *   8. Always append ?language=2.
 *
 * Zero API calls — pure DB rewrite. Idempotent: running twice on an
 * already-fixed row produces the same output so `--apply` is safe to
 * re-run.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-ex.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-ex.ts --verbose    # every diff
 *   npx tsx scripts/fix-cm-urls-ex.ts --apply      # write DB
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// DB episode → canonical CM episode
const EPISODE_MAP: Record<string, string> = {
  "Ex-Ruby-Sapphire":           "EX-Ruby-Sapphire",
  "Ex-Sandstorm":               "EX-Sandstorm",
  "Ex-Dragon":                  "EX-Dragon",
  "Ex-Team-Magma-Vs-Team-Aqua": "EX-Team-Magma-vs-Team-Aqua",
  "Ex-Hidden-Legends":          "EX-Hidden-Legends",
  "Ex-Firered-Leafgreen":       "EX-FireRed-LeafGreen",
  "Ex-Emerald":                 "EX-Emerald",
  "Ex-Unseen-Forces":           "EX-Unseen-Forces",
  "Ex-Deoxys":                  "EX-Deoxys",
  "Ex-Legend-Maker":            "EX-Legend-Maker",
  "Ex-Delta-Species":           "EX-Delta-Species",
  "Ex-Holon-Phantoms":          "EX-Holon-Phantoms",
  "Ex-Crystal-Guardians":       "EX-Crystal-Guardians",
  "Ex-Power-Keepers":           "EX-Power-Keepers",
};

// DB code (from the URL suffix, matching the ptcgo code) → CM code
const CODE_REMAP: Record<string, string> = {
  RG: "FL", // EX FireRed & LeafGreen uses "FL" on CM, not "RG"
};

interface Parsed {
  episode:   string;
  base:      string;   // e.g. "Blastoise-ex", "Grumpig", "Team-magmas-houndour"
  oldVRank:  number | null;
  code:      string;   // e.g. "RG", "EM"
  numDigits: string;   // e.g. "104", "030", "SH6"
  hadLanguage: boolean;
}

/**
 * Parse the existing URL into its canonical pieces. Shape (modulo V-rank):
 *   <Episode>/<Base>-<CODE><NUM>[?language=2]
 * A trailing -V{digits}- sits just before the set code when present.
 */
function parseOldUrl(url: string): Parsed | null {
  const [pathPart, query] = url.split("?");
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);
  // Base[-V#]-CCnum   — CC is 2-3 uppercase letters (includes SH style? no, SH never appears in EX base — but keep permissive)
  const m = rest.match(/^(.+?)(?:-V(\d+))?-([A-Z]{2,3})(\d+[A-Za-z]*)$/);
  if (!m) return null;
  return {
    episode,
    base:        m[1],
    oldVRank:    m[2] ? parseInt(m[2], 10) : null,
    code:        m[3],
    numDigits:   m[4],
    hadLanguage: (query ?? "").includes("language=2"),
  };
}

/**
 * Title-case a hyphen-separated slug. The Pokémon-ex marker at the very end
 * ("-ex") is preserved in lowercase because that's how CM writes it.
 */
function titleCaseSlug(slug: string): string {
  const parts = slug.split("-");
  return parts
    .map((w, i) => {
      if (!w) return w;
      const isLast = i === parts.length - 1;
      // Preserve trailing "-ex" marker as lowercase
      if (isLast && w.toLowerCase() === "ex") return "ex";
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join("-");
}

function unpadNumber(digits: string): string {
  const m = digits.match(/^(\d+)([A-Za-z]*)$/);
  if (!m) return digits;
  return String(parseInt(m[1], 10)) + (m[2] ?? "");
}

interface Row {
  id:       string;
  oldUrl:   string;
  newUrl?:  string;
  skip?:    string;
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { bloc: { slug: "ex" } },
    },
    select: { id: true, cardmarketUrl: true, name: true, number: true, serie: { select: { slug: true } } },
  });

  console.log(`\n📦 ${cards.length} cartes EX avec URL\n`);

  const rows: Row[] = [];
  const unparsed: typeof cards = [];

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); rows.push({ id: c.id, oldUrl: c.cardmarketUrl!, skip: "unparsable" }); continue; }

    const newEpisode = EPISODE_MAP[p.episode] ?? p.episode.replace(/^Ex-/, "EX-");
    const newCode    = CODE_REMAP[p.code]    ?? p.code;
    const newBase    = titleCaseSlug(p.base);
    const newNum     = unpadNumber(p.numDigits);
    const newUrl     = `${newEpisode}/${newBase}-${newCode}${newNum}?language=2`;

    rows.push({ id: c.id, oldUrl: c.cardmarketUrl!, newUrl });
  }

  // ── Report ────────────────────────────────────────────────────────────
  const writable  = rows.filter((r) => !r.skip && r.newUrl);
  const unchanged = writable.filter((r) => r.newUrl === r.oldUrl);
  const diff      = writable.filter((r) => r.newUrl !== r.oldUrl);

  if (unparsed.length > 0) {
    console.log(`⚠️  ${unparsed.length} URLs non parsables — ignorées`);
    for (const u of unparsed.slice(0, 10)) {
      console.log(`   [${u.serie.slug.padEnd(26)}] #${u.number.padEnd(6)} ${u.name.padEnd(25)} ${u.cardmarketUrl}`);
    }
    if (unparsed.length > 10) console.log(`   … et ${unparsed.length - 10} autres`);
    console.log();
  }

  console.log(`📊 Résumé:`);
  console.log(`   ${writable.length} rewritables`);
  console.log(`     · ${unchanged.length} inchangées`);
  console.log(`     · ${diff.length} à modifier`);

  // Anchor validation — the ground-truth URLs confirmed by the user.
  const ANCHORS: Record<string, string> = {
    "ex1-29":  "EX-Ruby-Sapphire/Delcatty-RS29?language=2",
    "ex2-96":  "EX-Sandstorm/Gardevoir-ex-SS96?language=2",
    "ex3-90":  "EX-Dragon/Dragonite-ex-DR90?language=2",
    "ex6-104": "EX-FireRed-LeafGreen/Blastoise-ex-FL104?language=2",
    "ex9-30":  "EX-Emerald/Grumpig-EM30?language=2",
    "ex16-95": "EX-Power-Keepers/Metagross-ex-PK95?language=2",
    "ex4-62":  "EX-Team-Magma-vs-Team-Aqua/Team-Magmas-Houndour-MA62?language=2",
    "ex13-108":"EX-Holon-Phantoms/Lightning-Energy-HP108?language=2",
    "ex13-85": "EX-Holon-Phantoms/Holon-Adventurer-HP85?language=2",
  };

  // Map tcgdexId → id in our result set
  const tcgToRow = new Map<string, string>(); // tcgdexId → proposed newUrl
  const anchorCards = await prisma.card.findMany({
    where: { tcgdexId: { in: Object.keys(ANCHORS) } },
    select: { id: true, tcgdexId: true },
  });
  for (const c of anchorCards) {
    const row = rows.find((r) => r.id === c.id);
    if (row && c.tcgdexId) tcgToRow.set(c.tcgdexId, row.newUrl ?? "");
  }

  console.log(`\n🎯 Anchor validation (${Object.keys(ANCHORS).length} URLs confirmées) :`);
  let fails = 0;
  for (const [tcgid, expected] of Object.entries(ANCHORS)) {
    const got = tcgToRow.get(tcgid);
    if (!got) { console.log(`   ✗ ${tcgid.padEnd(10)} CARTE MANQUANTE en DB`); fails++; continue; }
    const ok = got === expected;
    console.log(`   ${ok ? "✓" : "✗"} ${tcgid.padEnd(10)} ${got}`);
    if (!ok) { console.log(`     expected: ${expected}`); fails++; }
  }
  if (fails > 0) {
    console.log(`\n❌ ${fails}/${Object.keys(ANCHORS).length} anchors FAIL — refus d'appliquer.`);
    if (APPLY) { await prisma.$disconnect(); process.exit(1); }
  } else {
    console.log(`\n✅ ${Object.keys(ANCHORS).length}/${Object.keys(ANCHORS).length} anchors OK`);
  }

  console.log(`\n📝 Échantillon (15 premiers diffs) :`);
  for (const d of diff.slice(0, 15)) {
    console.log(`   OLD: ${d.oldUrl}`);
    console.log(`   NEW: ${d.newUrl}\n`);
  }

  if (VERBOSE) {
    console.log(`\n📜 Toutes les modifications (${diff.length}):`);
    for (const d of diff) {
      console.log(`   ${d.oldUrl}`);
      console.log(`-> ${d.newUrl}\n`);
    }
  }

  if (APPLY) {
    if (fails > 0) { await prisma.$disconnect(); return; }
    console.log(`\n✏️  Écriture ${diff.length} URLs dans la DB...`);
    let written = 0;
    for (const d of diff) {
      await prisma.card.update({ where: { id: d.id }, data: { cardmarketUrl: d.newUrl! } });
      written++;
      if (written % 100 === 0) process.stdout.write(`   ${written}/${diff.length}\n`);
    }
    console.log(`   ✓ ${written} URLs écrites`);
  } else {
    console.log(`\n(dry-run — relancer avec --apply pour écrire)`);
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
