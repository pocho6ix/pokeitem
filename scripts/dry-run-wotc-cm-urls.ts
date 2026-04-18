/**
 * Dry-run : propose un cardmarketUrl corrigé pour chaque carte Wizards
 * des 6 séries déjà validées (Base, Jungle, Fossile, Team Rocket,
 * Expedition, Aquapolis).
 *
 * Règles (validées par le user sur 11 URLs réelles Cardmarket) :
 *
 *   set-de-base  → Base-Set           | V1 | ?language=2&isFirstEd=N
 *   jungle       → Jungle             | V1 | ?language=2&isFirstEd=N
 *   fossile      → Fossil             | V1 | ?language=2&isFirstEd=N
 *   team-rocket  → Team-Rocket        | V1 | ?language=2&isFirstEd=N
 *   expedition   → Expedition-Base-Set| V1 | ?language=2
 *   aquapolis    → Aquapolis          | V2 | ?language=2
 *
 *   aquapolis #Hxx → URL de la carte même-nom (non-H) + &isReverseHolo=Y
 *                    (mapping confirmé 1:1 par name-match, 32/32)
 *
 * Numéro : unpadded (BS4, JU10, AQ1, pas BS004/JU010/AQ001).
 * Nom EN : extrait depuis la cardmarketUrl actuelle.
 *
 * Output :
 *   - stdout : résumé par série + échantillons changed/unchanged/errors
 *   - JSON   : .dry-run-wotc-cm-urls.json (réutilisable par le script apply)
 *
 * Ne touche PAS à la DB.
 *
 * Usage : npx tsx scripts/dry-run-wotc-cm-urls.ts
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// ── Config par série ────────────────────────────────────────────────────────
type SerieCfg = {
  episode: string;
  code:    string;
  v:       string;   // "V1" | "V2"
  suffix:  string;   // "?language=2" ou "?language=2&isFirstEd=N"
};

const SERIE_CFG: Record<string, SerieCfg> = {
  "set-de-base": { episode: "Base-Set",            code: "BS", v: "V1", suffix: "?language=2&isFirstEd=N" },
  "jungle":      { episode: "Jungle",              code: "JU", v: "V1", suffix: "?language=2&isFirstEd=N" },
  "fossile":     { episode: "Fossil",              code: "FO", v: "V1", suffix: "?language=2&isFirstEd=N" },
  "team-rocket": { episode: "Team-Rocket",         code: "TR", v: "V1", suffix: "?language=2&isFirstEd=N" },
  "expedition":  { episode: "Expedition-Base-Set", code: "EX", v: "V1", suffix: "?language=2" },
  "aquapolis":   { episode: "Aquapolis",           code: "AQ", v: "V2", suffix: "?language=2" },
};

// ── Parseur : extrait le nom EN de l'URL actuelle ──────────────────────────
function extractEnName(currentUrl: string): string | null {
  const [path] = currentUrl.split("?");
  const slash = path.indexOf("/");
  if (slash < 0) return null;
  const rest = path.slice(slash + 1);
  // Essai du plus spécifique au plus permissif.
  // 1. name-V{n}-CODE+digits[+H]
  let m = rest.match(/^(.+?)-V\d+-[A-Z]{1,4}\d+[A-Z]*\d*$/);
  if (m) return m[1];
  // 2. name-CODE+digits[+H]
  m = rest.match(/^(.+?)-[A-Z]{1,4}\d+[A-Z]*\d*$/);
  if (m) return m[1];
  // 3. name-V{n}
  m = rest.match(/^(.+?)-V\d+$/);
  if (m) return m[1];
  // 4. bare-name
  return rest || null;
}

// ── Construction de l'URL cible pour une carte régulière (non-H) ───────────
function buildUrl(serieSlug: string, number: string, enName: string): string | null {
  const cfg = SERIE_CFG[serieSlug];
  if (!cfg) return null;
  // Unpad : "001" → "1", "H01" → impossible ici (H géré séparément)
  const num = number.replace(/^0+/, "") || "0";
  return `${cfg.episode}/${enName}-${cfg.v}-${cfg.code}${num}${cfg.suffix}`;
}

// ── Aquapolis a/b dual-artwork commons (4 paires, 8 cartes) ─────────────────
// Pattern distinct : PAS de V{n}, la lettre reste dans le code (AQ50a, AQ50b…),
// nom EN non récupérable depuis la DB (pas d'URL actuelle) donc hardcodé ici.
// Confirmé manuellement sur Cardmarket.
const AQUAPOLIS_AB_NAMES: Record<string, string> = {
  "Akwakwak":  "Golduck",
  "Soporifik": "Drowzee",
  "M.Mime":    "Mr-Mime",
  "Porygon":   "Porygon",
};

function isAbVariant(number: string): boolean {
  return /^\d+[a-z]$/.test(number);
}
function buildAbUrl(serieSlug: string, number: string, nameFr: string): string | null {
  if (serieSlug !== "aquapolis") return null;
  const enName = AQUAPOLIS_AB_NAMES[nameFr];
  if (!enName) return null;
  return `Aquapolis/${enName}-AQ${number}?language=2`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: { in: Object.keys(SERIE_CFG) } },
    },
    select: {
      id: true,
      number: true,
      name: true,
      cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  console.log(`\n📦 ${cards.length} cartes Wizards à traiter (6 séries validées)\n`);

  type Row = {
    serieSlug: string;
    number:    string;
    name:      string;
    current:   string | null;
    proposed:  string | null;
    status:    "changed" | "unchanged" | "no-current-url" | "no-en-name" | "h-no-base" | "other";
    note?:     string;
  };
  const rows: Row[] = [];

  // Trois types de cartes :
  //   - a/b-variants : Aquapolis commons à double artwork (numéro = "50a"…)
  //   - H-variants   : Aquapolis "reverse holo" (numéro = "H01"…) → pass 2, dépend des URLs pass 1
  //   - regular      : tout le reste → pass 1
  const regulars  = cards.filter((c) => !/^H\d+/i.test(c.number) && !isAbVariant(c.number));
  const abVariants = cards.filter((c) => isAbVariant(c.number));
  const hVariants = cards.filter((c) => /^H\d+/i.test(c.number));

  // Index par (serie, nameFR) pour name-match des H-variants → URL proposée
  const baseByName = new Map<string, string>(); // key = `${serieSlug}::${nameFR}` → proposedUrl

  for (const c of regulars) {
    const cfg = SERIE_CFG[c.serie.slug];
    if (!cfg) continue;
    if (!c.cardmarketUrl) {
      rows.push({
        serieSlug: c.serie.slug, number: c.number, name: c.name,
        current: null, proposed: null, status: "no-current-url",
      });
      continue;
    }
    const enName = extractEnName(c.cardmarketUrl);
    if (!enName) {
      rows.push({
        serieSlug: c.serie.slug, number: c.number, name: c.name,
        current: c.cardmarketUrl, proposed: null, status: "no-en-name",
        note: "regex parse failed",
      });
      continue;
    }
    const proposed = buildUrl(c.serie.slug, c.number, enName);
    const status = !proposed ? "other"
                 : proposed === c.cardmarketUrl ? "unchanged" : "changed";
    rows.push({
      serieSlug: c.serie.slug, number: c.number, name: c.name,
      current: c.cardmarketUrl, proposed, status,
    });
    baseByName.set(`${c.serie.slug}::${c.name}`, proposed!);
  }

  // Pass 1b : a/b-variants (pattern propre, nom EN hardcodé)
  for (const c of abVariants) {
    const proposed = buildAbUrl(c.serie.slug, c.number, c.name);
    if (!proposed) {
      rows.push({
        serieSlug: c.serie.slug, number: c.number, name: c.name,
        current: c.cardmarketUrl, proposed: null, status: "no-en-name",
        note: "a/b variant : nom EN non mappé (ajoute-le dans AQUAPOLIS_AB_NAMES)",
      });
      continue;
    }
    const status = proposed === c.cardmarketUrl ? "unchanged" : "changed";
    rows.push({
      serieSlug: c.serie.slug, number: c.number, name: c.name,
      current: c.cardmarketUrl, proposed, status,
    });
  }

  // Pass 2 : H-variants → réutiliser l'URL base puis ajouter &isReverseHolo=Y
  for (const c of hVariants) {
    const cfg = SERIE_CFG[c.serie.slug];
    if (!cfg) continue;
    const baseUrl = baseByName.get(`${c.serie.slug}::${c.name}`);
    if (!baseUrl) {
      rows.push({
        serieSlug: c.serie.slug, number: c.number, name: c.name,
        current: c.cardmarketUrl, proposed: null, status: "h-no-base",
        note: "pas de carte même-nom trouvée (ou base sans URL)",
      });
      continue;
    }
    // Base a la forme "Aquapolis/Ampharos-V2-AQ1?language=2" → append &isReverseHolo=Y
    const proposed = baseUrl.includes("?")
      ? `${baseUrl}&isReverseHolo=Y`
      : `${baseUrl}?isReverseHolo=Y`;
    const status = !c.cardmarketUrl ? "changed"
                 : proposed === c.cardmarketUrl ? "unchanged" : "changed";
    rows.push({
      serieSlug: c.serie.slug, number: c.number, name: c.name,
      current: c.cardmarketUrl, proposed, status,
    });
  }

  // ── Stats par série ────────────────────────────────────────────────────
  const stats = new Map<string, Record<Row["status"], number>>();
  for (const r of rows) {
    const s = stats.get(r.serieSlug) ?? {
      changed: 0, unchanged: 0, "no-current-url": 0, "no-en-name": 0, "h-no-base": 0, other: 0,
    };
    s[r.status]++;
    stats.set(r.serieSlug, s);
  }

  console.log("Série            changed  unchanged  no-URL  parse-err  H-no-base  other");
  console.log("─".repeat(80));
  for (const [slug, s] of [...stats.entries()].sort()) {
    console.log(
      `  ${slug.padEnd(15)}` +
      `${String(s.changed).padStart(8)}` +
      `${String(s.unchanged).padStart(11)}` +
      `${String(s["no-current-url"]).padStart(8)}` +
      `${String(s["no-en-name"]).padStart(11)}` +
      `${String(s["h-no-base"]).padStart(11)}` +
      `${String(s.other).padStart(7)}`
    );
  }

  // ── Échantillons ──────────────────────────────────────────────────────
  const printSample = (title: string, filter: (r: Row) => boolean, max = 6) => {
    const list = rows.filter(filter);
    if (!list.length) return;
    console.log(`\n── ${title} (${list.length}) ────────────────────────────────────`);
    for (const r of list.slice(0, max)) {
      console.log(`\n  ${r.serieSlug} #${r.number} ${r.name}`);
      console.log(`    current : ${r.current ?? "(null)"}`);
      console.log(`    proposed: ${r.proposed ?? "(null)"}`);
      if (r.note) console.log(`    note    : ${r.note}`);
    }
    if (list.length > max) console.log(`\n  … ${list.length - max} autres`);
  };

  printSample("Changed (changement proposé)", (r) => r.status === "changed");
  printSample("Unchanged (déjà OK)",          (r) => r.status === "unchanged", 3);
  printSample("⚠️  Parse error",              (r) => r.status === "no-en-name");
  printSample("⚠️  No current URL",           (r) => r.status === "no-current-url");
  printSample("⚠️  H-variant sans base",      (r) => r.status === "h-no-base");

  // ── Dump JSON pour le script apply ────────────────────────────────────
  const payload = {
    generatedAt: new Date().toISOString(),
    cfg: SERIE_CFG,
    totals: {
      cards: rows.length,
      changed:   rows.filter((r) => r.status === "changed").length,
      unchanged: rows.filter((r) => r.status === "unchanged").length,
      errors:    rows.filter((r) => r.status !== "changed" && r.status !== "unchanged").length,
    },
    rows,
  };
  writeFileSync(".dry-run-wotc-cm-urls.json", JSON.stringify(payload, null, 2));
  console.log(`\n✅ Dump écrit dans .dry-run-wotc-cm-urls.json (${rows.length} lignes)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
