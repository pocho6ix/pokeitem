/**
 * seed-first-edition-sets.ts
 *
 * Idempotent seeder that materialises the four WOTC "Édition 1" series
 * already declared in src/data/series.ts:
 *
 *   set-de-base-1ed · jungle-1ed · fossile-1ed · team-rocket-1ed
 *
 * For each pair (Unlimited → 1ED):
 *   1. Ensure the 1ED Serie row exists (upsert by slug). Name / abbr /
 *      imageUrl / releaseDate / order are pulled from the static catalogue.
 *   2. For every Card in the Unlimited Serie, create a twin Card in the
 *      1ED Serie with isFirstEdition=true. The twin carries the same
 *      number / name / rarity / imageUrl / types / category / trainerType /
 *      energyType / isSpecial, plus a fresh cuid() and an adjusted
 *      tcgdexId suffix ("-1ed") so tcgdex lookups don't collide.
 *
 * Safety
 * ------
 * - Uses upsert on (serieId, number) to re-runs cleanly: no duplicates if
 *   the script is executed twice.
 * - `cardmarketUrl` / `cardmarketId` / price fields are deliberately NOT
 *   copied — CM has separate listings for 1ED variants and wiring those
 *   URLs will be a follow-up pass (the user flagged it).
 * - Existing UserCards stay intact (they point at the Unlimited card rows).
 *
 * Usage:
 *   npx tsx scripts/seed-first-edition-sets.ts              # dry-run
 *   npx tsx scripts/seed-first-edition-sets.ts --apply      # write DB
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { SERIES } from "@/data/series";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const APPLY  = process.argv.includes("--apply");

// (Unlimited slug → Édition 1 slug)
const PAIRS: Array<{ unlimited: string; firstEd: string }> = [
  { unlimited: "set-de-base", firstEd: "set-de-base-1ed" },
  { unlimited: "jungle",      firstEd: "jungle-1ed"      },
  { unlimited: "fossile",     firstEd: "fossile-1ed"     },
  { unlimited: "team-rocket", firstEd: "team-rocket-1ed" },
];

async function main() {
  console.log(APPLY ? "✏️  APPLY mode — will write DB" : "🔍 DRY RUN (use --apply to write)");
  console.log();

  const bloc = await prisma.bloc.findUnique({ where: { slug: "wotc" }, select: { id: true } });
  if (!bloc) {
    console.error("❌ Bloc 'wotc' introuvable en DB.");
    process.exit(1);
  }

  let seriesCreated = 0;
  let seriesExisting = 0;
  let cardsCreated   = 0;
  let cardsSkipped   = 0;

  for (const pair of PAIRS) {
    const staticSerie = SERIES.find((s) => s.slug === pair.firstEd);
    if (!staticSerie) {
      console.error(`❌ Static serie '${pair.firstEd}' introuvable dans src/data/series.ts`);
      process.exit(1);
    }

    // 1. Ensure the 1ED Serie row exists
    const existingSerie = await prisma.serie.findUnique({ where: { slug: pair.firstEd } });
    let firstEdSerieId: string;

    if (existingSerie) {
      firstEdSerieId = existingSerie.id;
      seriesExisting++;
      console.log(`  [serie] ${pair.firstEd} déjà présente (id=${firstEdSerieId})`);
    } else if (APPLY) {
      const created = await prisma.serie.create({
        data: {
          blocId:       bloc.id,
          name:         staticSerie.name,
          nameEn:       staticSerie.nameEn ?? null,
          slug:         staticSerie.slug,
          abbreviation: staticSerie.abbreviation ?? null,
          imageUrl:     staticSerie.imageUrl ?? null,
          releaseDate:  staticSerie.releaseDate ? new Date(staticSerie.releaseDate) : null,
          order:        staticSerie.order ?? 0,
        },
      });
      firstEdSerieId = created.id;
      seriesCreated++;
      console.log(`  [serie] ${pair.firstEd} CRÉÉE (id=${firstEdSerieId})`);
    } else {
      // Dry-run: pretend the id is "dryrun-<slug>" for the logs
      firstEdSerieId = `dryrun-${pair.firstEd}`;
      seriesCreated++;
      console.log(`  [serie] ${pair.firstEd} serait CRÉÉE`);
    }

    // 2. Load Unlimited cards + existing 1ED cards to dedupe
    const unlimitedSerie = await prisma.serie.findUnique({
      where: { slug: pair.unlimited },
      select: { id: true },
    });
    if (!unlimitedSerie) {
      console.error(`❌ Unlimited serie '${pair.unlimited}' introuvable en DB`);
      process.exit(1);
    }

    const [unlimitedCards, existingFirstEdCards] = await Promise.all([
      prisma.card.findMany({
        where:  { serieId: unlimitedSerie.id },
        select: {
          number: true, name: true, rarity: true, imageUrl: true,
          tcgdexId: true, types: true, category: true,
          trainerType: true, energyType: true, isSpecial: true,
        },
        orderBy: { number: "asc" },
      }),
      APPLY
        ? prisma.card.findMany({ where: { serieId: firstEdSerieId }, select: { number: true } })
        : Promise.resolve([]),
    ]);
    const existingNumbers = new Set(existingFirstEdCards.map((c) => c.number));

    let localCreated = 0;
    let localSkipped = 0;
    for (const u of unlimitedCards) {
      if (existingNumbers.has(u.number)) { localSkipped++; continue; }
      if (APPLY) {
        await prisma.card.create({
          data: {
            serieId:        firstEdSerieId,
            number:         u.number,
            name:           u.name,
            rarity:         u.rarity,
            imageUrl:       u.imageUrl,
            tcgdexId:       u.tcgdexId ? `${u.tcgdexId}-1ed` : null,
            types:          u.types,
            category:       u.category,
            trainerType:    u.trainerType,
            energyType:     u.energyType,
            isSpecial:      u.isSpecial,
            isFirstEdition: true,
            // cardmarketUrl / cardmarketId / price fields intentionally
            // left blank — 1ED listings on CM are separate products and
            // will be wired in a follow-up pass.
          },
        });
      }
      localCreated++;
    }
    cardsCreated += localCreated;
    cardsSkipped += localSkipped;
    console.log(`  [cards] ${pair.firstEd}: ${localCreated} à créer · ${localSkipped} déjà présentes`);
    console.log();
  }

  console.log("📊 Résumé:");
  console.log(`   Séries créées:   ${seriesCreated}`);
  console.log(`   Séries existantes: ${seriesExisting}`);
  console.log(`   Cartes créées:   ${cardsCreated}`);
  console.log(`   Cartes ignorées (déjà présentes): ${cardsSkipped}`);
  console.log(APPLY ? "\n✅ Terminé." : "\n(dry-run — relancer avec --apply pour écrire)");

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
