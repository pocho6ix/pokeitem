/**
 * Dry-run : propose un cardmarketUrl pour chaque carte des 13 séries McDo
 * (2011→2024, pas de 2020). Aucune URL en DB à ce jour.
 *
 * Conventions décodées à partir d'URLs Cardmarket réelles fournies par le
 * user :
 *
 *   2013   → McDonalds-Collection-2013                 | MCD13{n}           (unpadded)
 *   2017   → McDonalds-Collection-2017                 | MCD17{n}           (unpadded)
 *   2018   → McDonalds-Collection-2018                 | MCD18{n}  (n≤12)   (unpadded)
 *                                                      | MCD18F{n} (n≥13)
 *   2019   → McDonalds-Collection-2019-2               | V1-MCD19F{n}
 *   2021   → McDonalds-Collection-25th-Anniversary     | V1                 (pas de code numérique !)
 *   2022   → McDonalds-Collection-2022                 | MCD22{n}           (unpadded)
 *   2023   → McDonalds-Match-Battle-2023               | M23{nnn}           (3-digit padded)
 *   2024   → McDonalds-Collection-2024                 | M24{nnn}           (3-digit padded)
 *
 *   2011/2012/2014/2015/2016 : convention non confirmée par URL réelle.
 *   Hypothèse prudente : même pattern que 2013/2017 → MCD{YY}{n} unpadded.
 *   Le dry-run produit ces URLs ; à valider par fetch HTTP avant apply.
 *
 * Numérotation : toutes les URLs utilisent le `number` de notre DB directement
 * (pas de renumération selon TCGdex — la numérotation de notre DB = celle
 * de Cardmarket, vérifié sur les 13 échantillons fournis).
 *
 * Noms EN : résolution FR→EN via `scripts/_fr-en-species.json`, une map
 * autoritative des 1025 espèces Gen 1→9 construite depuis PokéAPI
 * (cf. `scripts/_build-fr-en-species-map.ts`). Les formes régionales
 * ("Sabelette d'Alola" → "Alolan Sandshrew") sont transformées par
 * `extractRegionalForm`.
 *
 * Slugify : même règle que la convention Cardmarket pour Neo/WOTC :
 *   NFD → strip diacritics → drop parentheticals → drop apostrophes →
 *   non-alphanum → dash → squeeze → trim.
 *
 * Output :
 *   - stdout : résumé par série + échantillons + skipped
 *   - JSON   : .dry-run-mcdo-cm-urls.json (utilisé par apply-mcdo-cm-urls.ts)
 *
 * Ne touche PAS à la DB.
 *
 * Usage : npx tsx scripts/dry-run-mcdo-cm-urls.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

// ── Format functions ─────────────────────────────────────────────────────
type Format = (number: string, enSlug: string) => string;

const makeUnpaddedMCD =
  (yy: string): Format =>
  (number, enSlug) => {
    const n = number.replace(/^0+/, "") || "0";
    return `${enSlug}-MCD${yy}${n}`;
  };

const makePaddedM =
  (yy: string): Format =>
  (number, enSlug) => {
    const n = number.replace(/^0+/, "") || "0";
    return `${enSlug}-M${yy}${n.padStart(3, "0")}`;
  };

const mcd18Conditional: Format = (number, enSlug) => {
  const n = Number(number.replace(/^0+/, "") || "0");
  const fFlag = n >= 13 ? "F" : "";
  return `${enSlug}-MCD18${fFlag}${n}`;
};

const mcd19V1F: Format = (number, enSlug) => {
  const n = Number(number.replace(/^0+/, "") || "0");
  return `${enSlug}-V1-MCD19F${n}`;
};

const v1Only: Format = (_number, enSlug) => `${enSlug}-V1`;

// ── Per-serie config ─────────────────────────────────────────────────────
type SerieCfg = {
  episode:  string;
  format:   Format;
  verified: boolean; // true si le pattern a été validé par URL réelle
};

const SERIE_CFG: Record<string, SerieCfg> = {
  "promo-mcdo-2011": { episode: "McDonalds-Collection-2011",             format: makeUnpaddedMCD("11"), verified: false },
  "promo-mcdo-2012": { episode: "McDonalds-Collection-2012",             format: makeUnpaddedMCD("12"), verified: false },
  "promo-mcdo-2013": { episode: "McDonalds-Collection-2013",             format: makeUnpaddedMCD("13"), verified: true  },
  "promo-mcdo-2014": { episode: "McDonalds-Collection-2014",             format: makeUnpaddedMCD("14"), verified: false },
  "promo-mcdo-2015": { episode: "McDonalds-Collection-2015",             format: makeUnpaddedMCD("15"), verified: false },
  "promo-mcdo-2016": { episode: "McDonalds-Collection-2016",             format: makeUnpaddedMCD("16"), verified: false },
  "promo-mcdo-2017": { episode: "McDonalds-Collection-2017",             format: makeUnpaddedMCD("17"), verified: true  },
  "promo-mcdo-2018": { episode: "McDonalds-Collection-2018",             format: mcd18Conditional,      verified: true  },
  "promo-mcdo-2019": { episode: "McDonalds-Collection-2019-2",           format: mcd19V1F,              verified: true  },
  "promo-mcdo-2021": { episode: "McDonalds-Collection-25th-Anniversary", format: v1Only,                verified: true  },
  "promo-mcdo-2022": { episode: "McDonalds-Collection-2022",             format: makeUnpaddedMCD("22"), verified: true  },
  "promo-mcdo-2023": { episode: "McDonalds-Match-Battle-2023",           format: makePaddedM("23"),     verified: true  },
  "promo-mcdo-2024": { episode: "McDonalds-Collection-2024",             format: makePaddedM("24"),     verified: true  },
};

// ── Slugify (même règle que Neo/WOTC) ────────────────────────────────────
function cmSlug(raw: string): string {
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .replace(/\s*\([^)]*\)\s*/g, " ")                    // strip parentheticals
    .replace(/['’]/g, "")                                // drop apostrophes
    .replace(/[^A-Za-z0-9]+/g, "-")                      // non-alphanum → dash
    .replace(/-+/g, "-")                                 // squeeze
    .replace(/^-|-$/g, "");                              // trim
}

// ── Transformation formes régionales FR → EN ─────────────────────────────
// Notre DB : "Sabelette d'Alola" / "Miaouss d'Alola" etc.
// Cardmarket : "Alolan-Sandshrew" / "Alolan-Meowth"
// Rule : "X d'Alola" → prefix "Alolan" + EN species name
function extractRegionalForm(frName: string): { base: string; prefix: string | null } {
  const m = frName.match(/^(.+?)\s+d['’](Alola|Galar|Paldea|Hisui|Kanto|Johto|Hoenn|Sinnoh)$/i);
  if (m) {
    const base = m[1];
    const region = m[2].toLowerCase();
    const PREFIX: Record<string, string> = {
      alola: "Alolan", galar: "Galarian", paldea: "Paldean", hisui: "Hisuian",
      kanto: "Kantonian", johto: "Johtonian", hoenn: "Hoennian", sinnoh: "Sinnohian",
    };
    return { base, prefix: PREFIX[region] ?? null };
  }
  return { base: frName, prefix: null };
}

// ── Authoritative species map (PokéAPI-derived, 1025 entries) ────────────
function loadSpeciesMap(): Map<string, string> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const p = resolve(__dirname, "_fr-en-species.json");
  const raw = readFileSync(p, "utf8");
  const obj = JSON.parse(raw) as Record<string, string>;
  return new Map(Object.entries(obj));
}

// ── Proposal schema ──────────────────────────────────────────────────────
type Proposal = {
  cardId:     string;
  serieSlug:  string;
  number:     string;
  nameFr:     string;
  nameEn:     string;
  nameEnFull: string; // nameEn avec prefix régional si applicable
  newUrl:     string;
  verified:   boolean;
};

type Skipped = {
  cardId:    string;
  serieSlug: string;
  number:    string;
  nameFr:    string;
  reason:    string;
};

async function main() {
  const speciesMap = loadSpeciesMap();
  console.log(`🗺   Loaded FR→EN species map: ${speciesMap.size} entries (PokéAPI-derived).`);

  const proposals: Proposal[] = [];
  const skipped:   Skipped[]   = [];

  for (const [serieSlug, cfg] of Object.entries(SERIE_CFG)) {
    const serie = await prisma.serie.findUnique({
      where: { slug: serieSlug },
      select: { cards: { orderBy: { number: "asc" }, select: { id: true, number: true, name: true, cardmarketUrl: true } } },
    });
    if (!serie) { console.warn(`⚠️  serie not found: ${serieSlug}`); continue; }

    let yearProposals = 0;
    for (const c of serie.cards) {
      if (c.cardmarketUrl) continue; // safety (toutes nulles en théorie)

      const { base, prefix } = extractRegionalForm(c.name);
      const enBase = speciesMap.get(base);
      if (!enBase) {
        skipped.push({ cardId: c.id, serieSlug, number: c.number, nameFr: c.name, reason: `no EN species for "${base}"` });
        continue;
      }

      const enNameFull = prefix ? `${prefix} ${enBase}` : enBase;
      const enSlug     = cmSlug(enNameFull);
      const slugPart   = cfg.format(c.number, enSlug);
      const newUrl     = `${cfg.episode}/${slugPart}?language=2`;

      proposals.push({
        cardId:    c.id,
        serieSlug,
        number:    c.number,
        nameFr:    c.name,
        nameEn:    enBase,
        nameEnFull: enNameFull,
        newUrl,
        verified:  cfg.verified,
      });
      yearProposals++;
    }

    const flag = cfg.verified ? "✓" : "⚠ ";
    console.log(`\n── ${serieSlug} (${serie.cards.length} cards, ${yearProposals} proposed) ${flag}`);
    const samples = proposals.filter((p) => p.serieSlug === serieSlug).slice(0, 4);
    for (const s of samples) {
      console.log(`   #${s.number.padEnd(4)} ${s.nameFr.padEnd(28)} → ${s.nameEnFull.padEnd(22)} → ${s.newUrl}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped: ${skipped.length} (EN species unresolved — vérifier le nom FR dans _fr-en-species.json)`);
    for (const s of skipped.slice(0, 40)) {
      console.log(`   ${s.serieSlug} #${s.number.padEnd(4)} ${s.nameFr} (${s.reason})`);
    }
    if (skipped.length > 40) console.log(`   …and ${skipped.length - 40} more`);
  }

  const unverified = proposals.filter((p) => !p.verified);
  if (unverified.length > 0) {
    console.log(`\n⚠️  ${unverified.length} proposals sur années NON vérifiées par URL réelle (2011/2012/2014/2015/2016).`);
    console.log(`   À valider manuellement en testant 2-3 URLs avant apply.`);
  }

  writeFileSync(".dry-run-mcdo-cm-urls.json", JSON.stringify({ proposals, skipped }, null, 2));
  console.log(`\n✅  ${proposals.length} proposals written to .dry-run-mcdo-cm-urls.json`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
