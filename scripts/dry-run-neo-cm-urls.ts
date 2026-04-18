/**
 * Dry-run : propose un cardmarketUrl pour chaque carte des 4 séries Neo
 * + Promos Wizards (Black Star Promos). Ces 5 séries n'ont AUCUNE URL
 * Cardmarket en DB à ce stade.
 *
 * Règles (validées par 7 URLs réelles Cardmarket fournies par le user) :
 *
 *   neo-genesis      → Neo-Genesis                | Pokémon=NG,  Trainer=N1  | ?language=2
 *   neo-discovery    → Neo-Discovery              | Pokémon=NDI, Trainer=N2  | ?language=2
 *   neo-revelation   → Neo-Revelation             | Pokémon=NR,  Trainer=N3  | ?language=2
 *   neo-destiny      → Neo-Destiny                | Pokémon=NDE, Trainer=N4  | ?language=2
 *   promos-wizards   → Wizards-Black-Star-Promos  | WP                       | ?language=2
 *
 *   IMPORTANT : pour les 4 séries Neo, Cardmarket utilise un code
 *   différent pour les Dresseurs que pour les Pokémon !
 *     - Ampharos (neo1 #1, Pokémon) → Neo-Genesis/Ampharos-NG1
 *     - Bill's Teleporter (neo1 #91, Trainer) → Neo-Genesis/Bills-Teleporter-N191
 *     - Thought Wave Machine (neo4 #96, Trainer) → Neo-Destiny/Thought-Wave-Machine-N496
 *
 *   Les cartes Énergie (rares dans Neo) sont supposées suivre le code
 *   Pokémon (NG/NDI/NR/NDE) par défaut — à valider au besoin.
 *
 *   Pas de `V{n}` dans le slug, pas de `&isFirstEd=N` : différent des 6
 *   premiers WOTC (Base/Jungle/Fossil/TR ont ces deux extras).
 *
 * Numéro : unpadded (NG1, N191, NDI10, WP1 — pas NG01/WP01).
 *
 * Nom EN :
 *   - Neo* : fetché une fois par set via TCGdex /v2/en/sets/neoN,
 *     puis mappé par localId (le nombre pur, sans leading zero).
 *   - Promos Wizards : les `name` en DB sont déjà en anglais, on les
 *     slugify directement (pas de dataset TCGdex pour ce set).
 *
 * Catégorie (Pokémon vs Trainer) : fetché via
 *   /v2/en/cards?set=neoN&category=Trainer pour les 4 sets Neo.
 *
 * Slugify : NFD + diacritics strip, parenthèses et leur contenu
 *   supprimés (ex: "Thought Wave Machine (Rocket's Secret Machine)"
 *   → "Thought Wave Machine"), apostrophes supprimées, tout
 *   non-alphanumérique → '-', squeeze multi-dashes, trim dashes.
 *   Ex : "Team Rocket's Meowth" → "Team-Rockets-Meowth"
 *        "Pokémon Center"       → "Pokemon-Center"
 *        "Dark Ampharos"        → "Dark-Ampharos"
 *
 * Output :
 *   - stdout : résumé par série + échantillons
 *   - JSON   : .dry-run-neo-cm-urls.json  (utilisé par le script apply)
 *
 * Ne touche PAS à la DB.
 *
 * Usage : npx tsx scripts/dry-run-neo-cm-urls.ts
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// ── Config par série ────────────────────────────────────────────────────────
type SerieCfg = {
  episode:     string;         // path segment after /Singles/
  code:        string;         // numeric-suffix prefix pour Pokémon/Énergie (NG, NDI, NR, NDE, WP)
  trainerCode: string | null;  // code pour Dresseurs (N1, N2, N3, N4) — null = même code
  tcgdexSet:   string | null;  // TCGdex EN set id, null pour promos
  suffix:      string;         // "?language=2"
};

const SERIE_CFG: Record<string, SerieCfg> = {
  "neo-genesis":    { episode: "Neo-Genesis",               code: "NG",  trainerCode: "N1", tcgdexSet: "neo1", suffix: "?language=2" },
  "neo-discovery":  { episode: "Neo-Discovery",             code: "NDI", trainerCode: "N2", tcgdexSet: "neo2", suffix: "?language=2" },
  "neo-revelation": { episode: "Neo-Revelation",            code: "NR",  trainerCode: "N3", tcgdexSet: "neo3", suffix: "?language=2" },
  "neo-destiny":    { episode: "Neo-Destiny",               code: "NDE", trainerCode: "N4", tcgdexSet: "neo4", suffix: "?language=2" },
  "promos-wizards": { episode: "Wizards-Black-Star-Promos", code: "WP",  trainerCode: null, tcgdexSet: null,   suffix: "?language=2" },
};

// ── Slugify conforme à la convention Cardmarket ────────────────────────────
// Observations sur les URLs Cardmarket existantes :
//   - parenthèses et leur contenu → supprimés (ex: "(Rocket's Secret Machine)")
//   - espaces → '-'
//   - apostrophes / caractères spéciaux → supprimés
//   - diacritiques → version ASCII (Pokémon → Pokemon)
//   - crochets / underscores → '-'
//   - multi-dashes → un seul
function cmSlug(raw: string): string {
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s*\([^)]*\)\s*/g, " ")                  // strip parentheticals
    .replace(/['’]/g, "")                              // drop apostrophes
    .replace(/[^A-Za-z0-9]+/g, "-")                    // non-alphanum → dash
    .replace(/-+/g, "-")                               // squeeze
    .replace(/^-|-$/g, "");                            // trim
}

// ── Fetch EN names from TCGdex (one set at a time) ──────────────────────────
type TcgdexCardLite = { id: string; localId: string; name: string };
type TcgdexSetDetail = { id: string; name: string; cards: TcgdexCardLite[] };

async function fetchEnNames(setId: string): Promise<Map<string, string>> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
  if (!res.ok) throw new Error(`TCGdex /en/sets/${setId} → HTTP ${res.status}`);
  const data = (await res.json()) as TcgdexSetDetail;
  const m = new Map<string, string>();
  for (const c of data.cards ?? []) {
    // localId peut être "1", "01", "001" selon le set — on normalise
    const num = String(c.localId).replace(/^0+/, "") || "0";
    m.set(num, c.name);
  }
  return m;
}

// Fetch set of trainer localIds (normalised, unpadded) for a Neo set.
async function fetchTrainerNumbers(setId: string): Promise<Set<string>> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards?set=${setId}&category=Trainer`);
  if (!res.ok) throw new Error(`TCGdex /en/cards?set=${setId}&category=Trainer → HTTP ${res.status}`);
  const data = (await res.json()) as TcgdexCardLite[];
  const s = new Set<string>();
  for (const c of data) {
    const num = String(c.localId).replace(/^0+/, "") || "0";
    s.add(num);
  }
  return s;
}

// ── Build URL for one card ──────────────────────────────────────────────────
function buildUrl(
  serieSlug: string,
  number: string,
  enName: string,
  isTrainer: boolean,
): string {
  const cfg = SERIE_CFG[serieSlug];
  const num = number.replace(/^0+/, "") || "0";
  const slug = cmSlug(enName);
  const code = isTrainer && cfg.trainerCode ? cfg.trainerCode : cfg.code;
  return `${cfg.episode}/${slug}-${code}${num}${cfg.suffix}`;
}

// ── Main ────────────────────────────────────────────────────────────────────
type Proposal = {
  cardId:    string;
  serieSlug: string;
  number:    string;
  nameFr:    string;
  nameEn:    string;
  isTrainer: boolean;
  newUrl:    string;
};

async function main() {
  const out: Proposal[] = [];
  const skipped: { cardId: string; serieSlug: string; number: string; nameFr: string; reason: string }[] = [];

  for (const [serieSlug, cfg] of Object.entries(SERIE_CFG)) {
    // 1) Resolve EN names + trainer numbers for the series
    let enByNumber: Map<string, string>;
    let trainerNums: Set<string>;
    if (cfg.tcgdexSet) {
      [enByNumber, trainerNums] = await Promise.all([
        fetchEnNames(cfg.tcgdexSet),
        fetchTrainerNumbers(cfg.tcgdexSet),
      ]);
    } else {
      // Promos Wizards: names already EN in DB, no per-card category fetched
      enByNumber = new Map();
      trainerNums = new Set();
    }

    // 2) Fetch DB rows
    const serie = await prisma.serie.findUnique({
      where: { slug: serieSlug },
      select: { cards: { orderBy: { number: "asc" }, select: { id: true, number: true, name: true } } },
    });
    if (!serie) { console.warn(`⚠️  serie not found: ${serieSlug}`); continue; }

    let changed = 0;
    let trainerCount = 0;
    for (const c of serie.cards) {
      const numKey = c.number.replace(/^0+/, "") || "0";
      const enName = cfg.tcgdexSet ? enByNumber.get(numKey) : c.name;
      if (!enName) {
        skipped.push({ cardId: c.id, serieSlug, number: c.number, nameFr: c.name, reason: "no EN name" });
        continue;
      }
      const isTrainer = trainerNums.has(numKey);
      if (isTrainer) trainerCount++;
      const newUrl = buildUrl(serieSlug, c.number, enName, isTrainer);
      out.push({ cardId: c.id, serieSlug, number: c.number, nameFr: c.name, nameEn: enName, isTrainer, newUrl });
      changed++;
    }

    console.log(`\n── ${serieSlug} (${serie.cards.length} cards) ─────────────────────`);
    console.log(`   ${changed} proposed | ${serie.cards.length - changed} skipped | ${trainerCount} trainers`);

    // Show 2 Pokémon samples + 2 Trainer samples
    const seriePros = out.filter((p) => p.serieSlug === serieSlug);
    const pkmnSamples    = seriePros.filter((p) => !p.isTrainer).slice(0, 2);
    const trainerSamples = seriePros.filter((p) =>  p.isTrainer).slice(0, 2);
    for (const s of [...pkmnSamples, ...trainerSamples]) {
      const tag = s.isTrainer ? "TR" : "PK";
      console.log(`   [${tag}] #${s.number.padEnd(4)} ${s.nameFr.padEnd(32)} → ${s.newUrl}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped: ${skipped.length}`);
    for (const s of skipped.slice(0, 10)) {
      console.log(`   ${s.serieSlug} #${s.number} ${s.nameFr} (${s.reason})`);
    }
    if (skipped.length > 10) console.log(`   …and ${skipped.length - 10} more`);
  }

  writeFileSync(".dry-run-neo-cm-urls.json", JSON.stringify({ proposals: out, skipped }, null, 2));
  console.log(`\n✅  ${out.length} proposals written to .dry-run-neo-cm-urls.json`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
