/**
 * fix-series-data.ts
 *
 * Corrections de données :
 *   1. Supprime "Méga Donjon" (SL10.5 / Detective Pikachu) — n'existe pas en FR
 *   2. Sépare "Foudre Noire / Flamme Blanche" en deux séries distinctes
 *      et réassigne les cartes sv10.5w → "flamme-blanche"
 *   3. Met à jour cardCount de chaque série avec le vrai nombre de cartes en DB
 *
 * Usage : npx tsx scripts/fix-series-data.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  // ── 1. Supprimer Méga Donjon ──────────────────────────────────────────────
  const megaDonjon = await prisma.serie.findUnique({ where: { slug: "mega-donjon" } });
  if (megaDonjon) {
    // Supprimer les cartes liées d'abord
    const deletedCards = await prisma.card.deleteMany({ where: { serieId: megaDonjon.id } });
    await prisma.serie.delete({ where: { id: megaDonjon.id } });
    console.log(`✅ Méga Donjon supprimé (${deletedCards.count} cartes)`);
  } else {
    console.log("ℹ️  Méga Donjon introuvable, rien à supprimer");
  }

  // ── 2. Séparer Foudre Noire et Flamme Blanche ────────────────────────────
  const combined = await prisma.serie.findUnique({ where: { slug: "foudre-noire-flamme-blanche" } });
  if (combined) {
    // Récupérer le bloc Écarlate & Violet
    const bloc = await prisma.bloc.findUnique({ where: { slug: "ecarlate-violet" } });
    if (!bloc) throw new Error("Bloc ecarlate-violet introuvable");

    // 2a. Renommer l'entrée existante → Foudre Noire (sv10.5b)
    await prisma.serie.update({
      where: { id: combined.id },
      data: {
        name:         "Foudre Noire",
        nameEn:       "Black Lightning",
        slug:         "foudre-noire",
        abbreviation: "EV10.5b",
        imageUrl:     "/images/series/foudre-noire.png",
      },
    });
    console.log("✅ Série renommée → Foudre Noire");

    // 2b. Créer la nouvelle série Flamme Blanche (sv10.5w)
    const flammeBlanche = await prisma.serie.upsert({
      where: { slug: "flamme-blanche" },
      create: {
        blocId:       bloc.id,
        name:         "Flamme Blanche",
        nameEn:       "White Flame",
        slug:         "flamme-blanche",
        abbreviation: "EV10.5w",
        imageUrl:     "/images/series/flamme-blanche.png",
        releaseDate:  new Date("2025-07-01"),
        order:        0,
      },
      update: {},
    });
    console.log(`✅ Série créée → Flamme Blanche (id: ${flammeBlanche.id})`);

    // 2c. Réassigner les cartes sv10.5w vers Flamme Blanche
    //     TCGdex IDs pour ce set commencent par "sv10.5w-"
    const foudreNoireSerie = await prisma.serie.findUnique({ where: { slug: "foudre-noire" } });
    if (!foudreNoireSerie) throw new Error("Foudre Noire série introuvable après rename");

    const sv10w = await prisma.card.findMany({
      where: { serieId: foudreNoireSerie.id, tcgdexId: { startsWith: "sv10.5w" } },
      select: { id: true },
    });

    if (sv10w.length > 0) {
      await prisma.card.updateMany({
        where: { id: { in: sv10w.map((c) => c.id) } },
        data: { serieId: flammeBlanche.id },
      });
      console.log(`✅ ${sv10w.length} cartes Flamme Blanche réassignées`);
    } else {
      console.log("ℹ️  Aucune carte sv10.5w trouvée (pas encore seedées ?)");
    }
  } else {
    console.log("ℹ️  'Foudre Noire / Flamme Blanche' introuvable, peut-être déjà séparées");
  }

  // ── 3. Synchroniser cardCount avec le vrai nombre de cartes en DB ─────────
  const allSeries = await prisma.serie.findMany({ select: { id: true, name: true } });
  let updated = 0;
  for (const serie of allSeries) {
    const count = await prisma.card.count({ where: { serieId: serie.id } });
    await prisma.serie.update({ where: { id: serie.id }, data: { cardCount: count } });
    if (count > 0) updated++;
  }
  console.log(`✅ cardCount synchronisé pour ${updated}/${allSeries.length} séries`);

  console.log("\n🎉 Migration terminée");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
