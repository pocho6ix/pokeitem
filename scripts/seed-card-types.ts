/**
 * seed-card-types.ts
 *
 * Fetches card types from TCGdex and stores them in the database.
 * Usage: npx tsx scripts/seed-card-types.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TCGDEX_MAPPING: Record<string, string> = {
  // Écarlate & Violet
  "ecarlate-violet":         "sv01",
  "evolutions-a-paldea":     "sv02",
  "flammes-obsidiennes":     "sv03",
  "faille-paradoxe":         "sv04",
  "destinees-de-paldea":     "sv04.5",
  "forces-temporelles":      "sv05",
  "mascarade-crepusculaire": "sv06",
  "fable-nebuleuse":         "sv06.5",
  "couronne-stellaire":      "sv07",
  "etincelles-deferlantes":  "sv08",
  "evolutions-prismatiques": "sv08.5",
  "aventures-ensemble":      "sv09",
  "rivalites-destinees":     "sv10",
  "foudre-noire":            "sv10.5b",
  "flamme-blanche":          "sv10.5w",
  // Méga-Évolution
  "flammes-fantasmagoriques":"me02",
  "equilibre-parfait":       "me03",
  // Legacy
  "set-de-base":             "base1",
  "heartgold-soulsilver":    "hgss1",
  // Épée & Bouclier
  "destinees-radieuses":     "swsh4.5",
  "styles-de-combat":        "swsh5",
  "regne-de-glace":          "swsh6",
  "evolution-celeste":       "swsh7",
  "poing-de-fusion":         "swsh8",
  "stars-etincelantes":      "swsh9",
  "astres-radieux":          "swsh10",
  "pokemon-go":              "swsh10.5",
  "origine-perdue":          "swsh11",
  "tempete-argentee":        "swsh12",
  "zenith-supreme":          "swsh12.5",
};

interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  types?: string[];
}

async function fetchSetCards(tcgdexSetId: string): Promise<TCGdexCard[]> {
  const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${tcgdexSetId}`);
  if (!res.ok) {
    console.error(`  Failed to fetch set ${tcgdexSetId}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const cardIds: { id: string }[] = data.cards ?? [];

  const cards: TCGdexCard[] = [];
  for (const { id } of cardIds) {
    const cardRes = await fetch(`https://api.tcgdex.net/v2/fr/cards/${id}`);
    if (!cardRes.ok) continue;
    const card = await cardRes.json();
    cards.push({ id: card.id, localId: card.localId, name: card.name, types: card.types });
  }
  return cards;
}

async function main() {
  const series = await prisma.serie.findMany({ select: { id: true, slug: true } });
  let totalUpdated = 0;

  for (const serie of series) {
    const tcgdexSetId = TCGDEX_MAPPING[serie.slug];
    if (!tcgdexSetId) {
      console.log(`Skipping ${serie.slug} (no TCGdex mapping)`);
      continue;
    }

    console.log(`\nProcessing ${serie.slug} (${tcgdexSetId})...`);
    let tcgCards: TCGdexCard[];
    try {
      tcgCards = await fetchSetCards(tcgdexSetId);
    } catch (e) {
      console.error(`  Error fetching ${serie.slug}: ${e}`);
      continue;
    }
    console.log(`  Fetched ${tcgCards.length} cards from TCGdex`);

    for (const tc of tcgCards) {
      if (!tc.types || tc.types.length === 0) continue;

      const updated = await prisma.card.updateMany({
        where: { serieId: serie.id, number: tc.localId },
        data: { types: tc.types },
      });
      if (updated.count > 0) totalUpdated += updated.count;
    }

    console.log(`  Updated types for cards in ${serie.slug}`);
  }

  console.log(`\nDone. Updated ${totalUpdated} cards total.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
