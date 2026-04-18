/**
 * Dry-run : propose un imageUrl Pokellector (full size, pas .thumb) pour
 * chaque carte des séries McDonald's dont les images actuelles sont
 * cassées ou absentes.
 *
 * Sources :
 *   - 2013 (null en DB)           → /McDonalds-Collection-2013-Expansion/
 *   - 2014 (404 pokemontcg.io)    → /McDonalds-Collection-2014-Expansion/
 *   - 2015 (404 pokemontcg.io)    → /McDonalds-Collection-2015-Expansion/
 *   - 2017 (404 pokemontcg.io)    → /McDonalds-Collection-2017-Expansion/
 *   - 2018 #1-12 (404)            → /McDonalds-Collection-2018-Expansion/ (EN 12 cartes)
 *
 * Pokellector CDN : https://den-cards.pokellector.com/{folder}/{Name}.{CODE}.{num}.{hash}.png
 * On retire le suffixe `.thumb` (la version full size remplace).
 *
 * Mapping par numéro de carte. Les noms FR en DB peuvent différer des
 * noms EN Pokellector (Bulbizarre vs Bulbasaur) — on match uniquement
 * sur le numéro.
 *
 * Output : .dry-run-mcdo-images.json + stdout résumé.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

type PokellectorSet = {
  serieSlug: string;
  url:       string;          // Pokellector expansion page
  onlyFirst?: number;         // if set: only replace cards numbered ≤ this (2018 #1-12)
};

const SETS: PokellectorSet[] = [
  { serieSlug: "promo-mcdo-2013", url: "https://www.pokellector.com/McDonalds-Collection-2013-Expansion/" },
  { serieSlug: "promo-mcdo-2014", url: "https://www.pokellector.com/McDonalds-Collection-2014-Expansion/" },
  { serieSlug: "promo-mcdo-2015", url: "https://www.pokellector.com/McDonalds-Collection-2015-Expansion/" },
  { serieSlug: "promo-mcdo-2017", url: "https://www.pokellector.com/McDonalds-Collection-2017-Expansion/" },
  { serieSlug: "promo-mcdo-2018", url: "https://www.pokellector.com/McDonalds-Collection-2018-Expansion/", onlyFirst: 12 },
];

async function scrapePokellectorSet(setUrl: string): Promise<Map<string, string>> {
  const res = await fetch(setUrl, {
    headers: { "User-Agent": "Mozilla/5.0 pokeitem-scraper/1.0" },
  });
  if (!res.ok) throw new Error(`${setUrl} → HTTP ${res.status}`);
  const html = await res.text();

  // Pattern (2 variants) :
  //   New : https://den-cards.pokellector.com/{folder}/{Name}.{CODE}.{N}.{hash}.thumb.png
  //   Old : https://den-cards.pokellector.com/{folder}/{Name}.{CODE}.{N}.thumb.png   (pas de hash)
  // On capture le préfixe sans `.thumb`, et on reconstruit `.png`.
  const matches = html.matchAll(
    /(https?:\/\/den-cards\.pokellector\.com\/\d+\/[^"']+?\.([A-Z0-9]+)\.(\d+)(?:\.\d+)?)\.thumb\.png/g,
  );
  const byNum = new Map<string, string>();
  for (const m of matches) {
    const full = `${m[1]}.png`;           // without .thumb
    const num  = m[3];
    if (!byNum.has(num)) byNum.set(num, full);
  }
  return byNum;
}

type Proposal = {
  cardId:    string;
  serieSlug: string;
  number:    string;
  nameFr:    string;
  currentUrl: string | null;
  newUrl:     string;
};

async function main() {
  const proposals: Proposal[] = [];
  const skipped:   { serieSlug: string; number: string; nameFr: string; reason: string }[] = [];

  for (const cfg of SETS) {
    const imgByNum = await scrapePokellectorSet(cfg.url);
    const serie = await prisma.serie.findUnique({
      where: { slug: cfg.serieSlug },
      select: { cards: { orderBy: { number: "asc" }, select: { id: true, number: true, name: true, imageUrl: true } } },
    });
    if (!serie) { console.warn(`⚠️  ${cfg.serieSlug} not found`); continue; }

    let changed = 0;
    for (const c of serie.cards) {
      const numInt = parseInt(c.number.replace(/^0+/, "") || "0", 10);
      if (cfg.onlyFirst && numInt > cfg.onlyFirst) continue;
      const key = String(numInt);
      const newUrl = imgByNum.get(key);
      if (!newUrl) {
        skipped.push({ serieSlug: cfg.serieSlug, number: c.number, nameFr: c.name, reason: "no pokellector match" });
        continue;
      }
      if (c.imageUrl === newUrl) continue; // already correct
      proposals.push({
        cardId:     c.id,
        serieSlug:  cfg.serieSlug,
        number:     c.number,
        nameFr:     c.name,
        currentUrl: c.imageUrl,
        newUrl,
      });
      changed++;
    }
    console.log(`── ${cfg.serieSlug}: scraped ${imgByNum.size} URLs, ${changed} proposals`);
  }

  if (skipped.length) {
    console.log(`\n⚠️  ${skipped.length} skipped:`);
    for (const s of skipped) console.log(`   ${s.serieSlug} #${s.number} ${s.nameFr} (${s.reason})`);
  }

  // Sample output
  console.log("\n── Sample proposals ──");
  for (const p of proposals.slice(0, 8)) {
    console.log(`  ${p.serieSlug} #${p.number.padEnd(3)} ${p.nameFr.padEnd(20)}`);
    console.log(`    was: ${p.currentUrl ?? "(null)"}`);
    console.log(`    new: ${p.newUrl}`);
  }

  writeFileSync(".dry-run-mcdo-images.json", JSON.stringify({ proposals, skipped }, null, 2));
  console.log(`\n✅  ${proposals.length} proposals written to .dry-run-mcdo-images.json`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
