/**
 * fix-cm-urls-sword-shield.ts
 *
 * Rewrites Cardmarket URLs for cards in the "Épée et Bouclier" bloc to match
 * Cardmarket's real canonical format. Rules vary by set and were derived
 * empirically — the user manually tested ~30 URLs to pin down the patterns.
 *
 * Four patterns
 * -------------
 *
 * 1. "full"    — RCL DAA CPA VIV  (2020 late/mid)
 *              — BRS ASR LOR PGO SIT CRZ (2022+ padded)
 *    Canonical: {Episode}/{Name}[-V{rank}]-{CODE}{num}
 *    - Code and number are always present.
 *    - V-rank suffix on any slug collision (non-V included).
 *    - Number is unpadded for RCL/DAA/CPA/VIV, padded to 3 for BRS+.
 *    - Confirmed: Eldegoss-V-V1-RCL19, Scoop-Up-Net-V1-RCL165, Butterfree-V-V1-DAA1,
 *      Rose-V1-DAA168, Venusaur-V-CPA1, Weedle-VIV1, Scyther-V1-ASR004,
 *      Beedrill-V-V1-ASR001, Oddish-LOR001, Serperior-V-V1-SIT007,
 *      Leafeon-V-CRZ013, Exeggcute-BRS001.
 *
 * 2. "ssh"     — SSH only
 *    Canonical: {Episode}/{Name}[-V{rank if V-variant collision}]-{CODE}{num_unpadded}
 *    - Code+num is always present (even for uniques, e.g. Celebi-V-SSH1).
 *    - V-rank added ONLY on V/VMAX/VSTAR collision (Snorlax-VMAX-V1-SSH142).
 *    - Non-V collisions disambiguate via the card number alone
 *      (Grookey-SSH10, Krabby-SSH42).
 *
 * 3. "bst"     — BST only
 *    Canonical: unique     → {Episode}/{Name}
 *               collision  → {Episode}/{Name}[-V{r if V-variant}]-{CODE}{num_unpadded}
 *    - Like SSH but uniques drop to a bare name (Bellsprout, Mawile).
 *    - Non-V collision: Bruno-BST121 (no V-rank).
 *    - V-variant collision: Stoutland-V-V1-BST117 (V-rank).
 *
 * 4. "compact" — SHF SHFSV CRE EVS FST CEL  (2021 sets except BST)
 *    Canonical: unique     → {Episode}/{Name}
 *               collision  → {Episode}/{Name}-V{rank}
 *    - No code or number in the URL when there's a collision — disambiguation
 *      is V-rank ONLY, even for non-V cards and supporters.
 *    - Confirmed: Weedle, Bellsprout, Pinsir, Ho-oh (uniques);
 *      Caitlin-V1, Raihan-V1, Dancer-V1, Mew-V1, Metagross-V-V1 (collisions).
 *    - SHF + SHFSV share the base-slug group: regular numeric cards sort
 *      before SV-numbered shiny vault cards. V-rank assigned 1-based after
 *      sort (e.g. #14 Gossifleur → V1, #SV010 Gossifleur → V2).
 *
 * Unknown set codes (promos, *TG, *GG galleries) are skipped — we don't touch
 * URLs we haven't tested.
 *
 * Zero API calls — pure DB rewrite.
 *
 * Usage:
 *   npx tsx scripts/fix-cm-urls-sword-shield.ts              # dry-run
 *   npx tsx scripts/fix-cm-urls-sword-shield.ts --apply      # write DB
 *   npx tsx scripts/fix-cm-urls-sword-shield.ts --verbose    # print every diff
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// ── Set code classification ──────────────────────────────────────────────────

type Pattern = "full" | "ssh" | "bst" | "compact" | "passthrough";

const SET_PATTERN: Record<string, Pattern> = {
  // Hybrids
  SSH: "ssh",
  BST: "bst",
  // Compact (2021 except BST)
  SHF: "compact", SHFSV: "compact", CRE: "compact",
  EVS: "compact", FST: "compact", CEL: "compact",
  // Full / unpadded (2020 late)
  RCL: "full", DAA: "full", CPA: "full", VIV: "full",
  // Full / padded-3 (2022+)
  BRS: "full", ASR: "full", LOR: "full",
  PGO: "full", SIT: "full", CRZ: "full",
  // Trainer Gallery / Galarian Gallery subsets — URL format is untested.
  // These cards participate in collision grouping (so base-set siblings get
  // the correct V-rank) but their own URLs are left untouched.
  ASRTG: "passthrough", BRSTG: "passthrough", LORTG: "passthrough",
  SITTG: "passthrough", CRZGG: "passthrough",
};

/** Sets whose "full" pattern uses 3-digit padded card numbers. */
const PADDED_FULL = new Set(["BRS", "ASR", "LOR", "PGO", "SIT", "CRZ"]);

// ── URL parsing ──────────────────────────────────────────────────────────────

interface Parsed {
  episode:   string;
  base:      string;
  vRankPart: string; // "-V1" / "-V2" / ... or "" when absent
  code:      string;
  numDigits: string; // "001" / "100" — as it appears in the old URL
  hasLang:   boolean;
}

function parseOldUrl(url: string): Parsed | null {
  const [pathPart, queryPart] = url.split("?");
  const hasLang = queryPart === "language=2";
  const slash = pathPart.indexOf("/");
  if (slash < 0) return null;
  const episode = pathPart.slice(0, slash);
  const rest    = pathPart.slice(slash + 1);

  // base (lazy) + optional "-V\d+" + required "-{CODE}{digits}$"
  // CODE = 2+ uppercase letters so "-v-"/"-vmax-" stays inside the base.
  const m = rest.match(/^(.+?)(-V\d+)?-([A-Z]{2,})(\d+)$/);
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

/** Uppercase the trailing Pokémon variant marker. */
function normalizeBase(base: string): string {
  return base.replace(/-(vmax|vstar|vunion|v)$/i, (_, m) => `-${m.toUpperCase()}`);
}

/** True when the base ends with a V/VMAX/VSTAR/VUNION variant marker. */
function hasVariantMarker(normBase: string): boolean {
  return /-(VMAX|VSTAR|VUNION|V)$/.test(normBase);
}

/** Regular numeric numbers sort before SV-prefixed, ascending. */
function sortKey(num: string): number {
  if (/^\d+$/.test(num)) return parseInt(num, 10);
  const sv = num.match(/^SV(\d+)$/);
  if (sv) return 100_000 + parseInt(sv[1], 10);
  return 999_999;
}

/** Unpad a DB card number for URLs that require unpadded digits. */
function unpaddedNum(cardNumber: string, fallback: string): string {
  const n = parseInt(cardNumber, 10);
  return Number.isNaN(n) ? fallback : String(n);
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface Row {
  id:        string;
  serieId:   string;
  serieSlug: string;
  number:    string;
  name:      string;
  oldUrl:    string;
  p:         Parsed;
  pattern:   Pattern;
  newUrl?:   string;
}

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");

  const cards = await prisma.card.findMany({
    where: {
      cardmarketUrl: { not: null },
      serie: { bloc: { name: { contains: "Épée", mode: "insensitive" } } },
    },
    select: {
      id: true, number: true, name: true, cardmarketUrl: true,
      serie: { select: { id: true, slug: true, name: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Épée & Bouclier avec URL\n`);

  const rows:         Row[] = [];
  const unparsed:     typeof cards = [];
  const unknownCodes: Map<string, number> = new Map();
  const skippedByCode: Map<string, typeof cards[0][]> = new Map();

  for (const c of cards) {
    const p = parseOldUrl(c.cardmarketUrl!);
    if (!p) { unparsed.push(c); continue; }

    const pattern = SET_PATTERN[p.code];
    if (!pattern) {
      unknownCodes.set(p.code, (unknownCodes.get(p.code) ?? 0) + 1);
      if (!skippedByCode.has(p.code)) skippedByCode.set(p.code, []);
      skippedByCode.get(p.code)!.push(c);
      continue;
    }

    rows.push({
      id:        c.id,
      serieId:   c.serie.id,
      serieSlug: c.serie.slug,
      number:    c.number,
      name:      c.name,
      oldUrl:    c.cardmarketUrl!,
      p,
      pattern,
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
      console.log(`   ${code.padEnd(8)} ${String(n).padStart(5)} cartes`);
    }
  }
  console.log();

  // ── Group by (serieId, normalizedBase.toLowerCase()) ─────────────────────
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.serieId}::${normalizeBase(r.p.base).toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  // ── Compute new URLs ─────────────────────────────────────────────────────
  for (const group of groups.values()) {
    // Sort order matters for V-rank assignment: regular (numeric) first, then
    // SV-numbered shiny vault, then TG/GG with alphanumeric numbers. Same
    // sort used for all patterns.
    group.sort((a, b) => sortKey(a.number) - sortKey(b.number));
    const size = group.length;
    const normBase0 = normalizeBase(group[0].p.base);
    const isVGroup  = hasVariantMarker(normBase0);
    // Pattern is a property of the CM set code. Groups can mix:
    //   - SHF + SHFSV (both "compact")
    //   - LOR + LORTG, ASR + ASRTG, etc ("full" + "passthrough")
    // For the rewrite rule, use the first non-passthrough card's pattern.
    const rewriteCard = group.find((r) => r.pattern !== "passthrough");
    if (!rewriteCard) continue;
    const pattern = rewriteCard.pattern;

    // Passthrough rows (TG/GG subsets) stay unchanged — they occupy an index
    // slot so base-set siblings get the correct V-rank, but no newUrl is set.

    if (pattern === "compact") {
      // Unique → bare name. Collision → V-rank only (no code, no num),
      // regardless of whether the base is a V-variant.
      group.forEach((r, i) => {
        if (r.pattern === "passthrough") return;
        const normBase = normalizeBase(r.p.base);
        const q = r.p.hasLang ? "?language=2" : "";
        const vPart = size > 1 ? `-V${i + 1}` : "";
        r.newUrl = `${r.p.episode}/${normBase}${vPart}${q}`;
      });
      continue;
    }

    if (pattern === "full") {
      // Always code+num. V-rank on any collision. Padding depends on set code.
      group.forEach((r, i) => {
        if (r.pattern === "passthrough") return;
        const normBase = normalizeBase(r.p.base);
        const numStr = PADDED_FULL.has(r.p.code)
          ? String(parseInt(r.number, 10) || 0).padStart(3, "0")
          : unpaddedNum(r.number, r.p.numDigits);
        const vRank = size > 1 ? `-V${i + 1}` : "";
        const q = r.p.hasLang ? "?language=2" : "";
        r.newUrl = `${r.p.episode}/${normBase}${vRank}-${r.p.code}${numStr}${q}`;
      });
      continue;
    }

    if (pattern === "ssh") {
      // Always code+num (even for uniques). V-rank only when the base is a
      // V-variant AND the group has a collision. Non-V collisions
      // disambiguate via card number alone.
      group.forEach((r, i) => {
        if (r.pattern === "passthrough") return;
        const normBase = normalizeBase(r.p.base);
        const numStr = unpaddedNum(r.number, r.p.numDigits);
        const vRank = (isVGroup && size > 1) ? `-V${i + 1}` : "";
        const q = r.p.hasLang ? "?language=2" : "";
        r.newUrl = `${r.p.episode}/${normBase}${vRank}-${r.p.code}${numStr}${q}`;
      });
      continue;
    }

    if (pattern === "bst") {
      // Unique → bare name. Collision → code+num, with V-rank only on
      // V-variant collisions (like ssh).
      group.forEach((r, i) => {
        if (r.pattern === "passthrough") return;
        const normBase = normalizeBase(r.p.base);
        const q = r.p.hasLang ? "?language=2" : "";
        if (size === 1) {
          r.newUrl = `${r.p.episode}/${normBase}${q}`;
        } else {
          const numStr = unpaddedNum(r.number, r.p.numDigits);
          const vRank = isVGroup ? `-V${i + 1}` : "";
          r.newUrl = `${r.p.episode}/${normBase}${vRank}-${r.p.code}${numStr}${q}`;
        }
      });
      continue;
    }
  }

  // ── Build update list ────────────────────────────────────────────────────
  const updates = rows.filter((r) => r.newUrl && r.newUrl !== r.oldUrl);
  const unchanged = rows.length - updates.length;

  // ── Report ───────────────────────────────────────────────────────────────
  const perSerie = new Map<string, { total: number; changed: number; pattern: Pattern }>();
  for (const r of rows) {
    const t = perSerie.get(r.serieSlug) ?? { total: 0, changed: 0, pattern: r.pattern };
    t.total++;
    perSerie.set(r.serieSlug, t);
  }
  for (const u of updates) {
    perSerie.get(u.serieSlug)!.changed++;
  }

  console.log("Série                          Pattern   Total  À corriger");
  console.log("─".repeat(64));
  for (const [slug, t] of [...perSerie.entries()].sort()) {
    console.log(
      `  ${slug.padEnd(30)}  ${t.pattern.padEnd(7)}  ${String(t.total).padStart(5)}  ${String(t.changed).padStart(9)}`,
    );
  }
  console.log("─".repeat(64));
  console.log(`  ${"TOTAL".padEnd(30)}  ${" ".repeat(7)}  ${String(rows.length).padStart(5)}  ${String(updates.length).padStart(9)}`);
  console.log(`\n${unchanged} URLs déjà correctes, ${updates.length} à modifier\n`);

  // User-confirmed anchor cards (each URL individually opened on CM)
  const anchors = [
    // SHF / SHFSV (compact, mixed)
    { serie: "destinees-radieuses",  num: "14",     want: "Shining-Fates/Gossifleur-V1?language=2"            },
    { serie: "destinees-radieuses",  num: "SV010",  want: "Shining-Fates/Gossifleur-V2?language=2"            },
    { serie: "destinees-radieuses",  num: "SV105",  want: "Shining-Fates/Rillaboom-V?language=2"              },
    { serie: "destinees-radieuses",  num: "SV110",  want: "Shining-Fates/Lapras-V?language=2"                 },
    { serie: "destinees-radieuses",  num: "10",     want: "Shining-Fates/Dhelmise-VMAX?language=2"            },
    { serie: "destinees-radieuses",  num: "1",      want: "Shining-Fates/Yanma?language=2"                    },
    // SSH (ssh pattern)
    { serie: "epee-et-bouclier",     num: "1",      want: "Sword-Shield/Celebi-V-SSH1?language=2"             },
    { serie: "epee-et-bouclier",     num: "10",     want: "Sword-Shield/Grookey-SSH10?language=2"             },
    { serie: "epee-et-bouclier",     num: "42",     want: "Sword-Shield/Krabby-SSH42?language=2"              },
    { serie: "epee-et-bouclier",     num: "142",    want: "Sword-Shield/Snorlax-VMAX-V1-SSH142?language=2"    },
    // BST (bst pattern)
    { serie: "styles-de-combat",     num: "1",      want: "Battle-Styles/Bellsprout?language=2"               },
    { serie: "styles-de-combat",     num: "100",    want: "Battle-Styles/Mawile?language=2"                   },
    { serie: "styles-de-combat",     num: "121",    want: "Battle-Styles/Bruno-BST121?language=2"             },
    { serie: "styles-de-combat",     num: "117",    want: "Battle-Styles/Stoutland-V-V1-BST117?language=2"    },
    // CRE / EVS / FST / CEL (compact)
    { serie: "regne-de-glace",       num: "1",      want: "Chilling-Reign/Weedle?language=2"                  },
    { serie: "regne-de-glace",       num: "132",    want: "Chilling-Reign/Caitlin-V1?language=2"              },
    { serie: "regne-de-glace",       num: "112",    want: "Chilling-Reign/Metagross-V-V1?language=2"          },
    { serie: "evolution-celeste",    num: "1",      want: "Evolving-Skies/Pinsir?language=2"                  },
    { serie: "evolution-celeste",    num: "152",    want: "Evolving-Skies/Raihan-V1?language=2"               },
    { serie: "poing-de-fusion",      num: "1",      want: "Fusion-Strike/Caterpie?language=2"                 },
    { serie: "poing-de-fusion",      num: "232",    want: "Fusion-Strike/Dancer-V1?language=2"                },
    { serie: "celebrations",         num: "1",      want: "Celebrations/Ho-oh?language=2"                     },
    { serie: "celebrations",         num: "11",     want: "Celebrations/Mew-V1?language=2"                    },
    // RCL / DAA (full unpadded)
    { serie: "clash-des-rebelles",   num: "1",      want: "Rebel-Clash/Caterpie-RCL1?language=2"              },
    { serie: "clash-des-rebelles",   num: "19",     want: "Rebel-Clash/Eldegoss-V-V1-RCL19?language=2"        },
    { serie: "clash-des-rebelles",   num: "165",    want: "Rebel-Clash/Scoop-up-net-V1-RCL165?language=2"     },
    { serie: "tenebres-embrasees",   num: "1",      want: "Darkness-Ablaze/Butterfree-V-V1-DAA1?language=2"   },
    { serie: "tenebres-embrasees",   num: "168",    want: "Darkness-Ablaze/Rose-V1-DAA168?language=2"         },
    // ASR / LOR / SIT / CRZ / BRS (full padded)
    { serie: "stars-etincelantes",   num: "001",    want: "Brilliant-Stars/Exeggcute-BRS001?language=2"       },
    { serie: "astres-radieux",       num: "001",    want: "Astral-Radiance/Beedrill-V-V1-ASR001?language=2"   },
    { serie: "astres-radieux",       num: "004",    want: "Astral-Radiance/Scyther-V1-ASR004?language=2"      },
    { serie: "origine-perdue",       num: "001",    want: "Lost-Origin/Oddish-LOR001?language=2"              },
    { serie: "tempete-argentee",     num: "007",    want: "Silver-Tempest/Serperior-V-V1-SIT007?language=2"   },
    { serie: "zenith-supreme",       num: "013",    want: "Crown-Zenith/Leafeon-V-CRZ013?language=2"          },
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

  // Sample 20 diffs covering different (pattern, series)
  const samples: Row[] = [];
  const seenKeys = new Set<string>();
  for (const u of updates) {
    const k = `${u.pattern}::${u.serieSlug}`;
    if (!seenKeys.has(k) && samples.length < 20) {
      samples.push(u);
      seenKeys.add(k);
    }
  }
  while (samples.length < 20 && samples.length < updates.length) {
    samples.push(updates[samples.length]);
  }
  console.log("Échantillon (diversifié par groupe) :");
  for (const u of samples) {
    console.log(`  [${u.pattern.padEnd(6)}] ${u.serieSlug} #${u.number} ${u.name}`);
    console.log(`    − ${u.oldUrl}`);
    console.log(`    + ${u.newUrl}`);
  }

  if (VERBOSE && updates.length > samples.length) {
    console.log(`\n─── Toutes les corrections ─────────────────────────────────\n`);
    for (const u of updates) {
      console.log(`  [${u.pattern.padEnd(6)}] ${u.serieSlug} #${u.number} ${u.name}`);
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
