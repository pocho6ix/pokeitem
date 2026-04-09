/**
 * fix-energy-images.ts
 *
 * Backfill des images pour les séries énergies qui ne sont pas
 * disponibles sur TCGdex.
 *
 * Sources utilisées :
 *  - SVE (Énergies Écarlate et Violet) : pokemontcg.io set "sve"
 *    → cartes 001-016 uniquement (16/24). Les 017-024 n'ont pas de source connue.
 *
 * Séries sans source d'image disponible (non traitées) :
 *  - MEE (Énergies Méga-Évolution) : absent de TCGdex et pokemontcg.io
 *  - MEP (Promos Méga-Évolution) : promos FR spécifiques, absentes de pokemontcg.io
 *
 * Usage :
 *   npx tsx scripts/fix-energy-images.ts
 *   npx tsx scripts/fix-energy-images.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

// Mapping serie slug → pokemontcg.io set ID
// La clé numérique de notre carte (parseInt) = numéro sur pokemontcg.io
const PTCGIO_SETS: Record<string, { ptcgioId: string; maxNumber: number }> = {
  "energies-ecarlate-et-violet": { ptcgioId: "sve", maxNumber: 16 },
};

async function fetchPtcgioImages(setId: string): Promise<Map<number, string>> {
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&orderBy=number`
  );
  if (!res.ok) {
    console.error(`  ✗ pokemontcg.io ${setId} → HTTP ${res.status}`);
    return new Map();
  }
  const data = (await res.json()) as {
    data: { number: string; images: { small: string; large?: string } }[];
  };

  const map = new Map<number, string>();
  for (const card of data.data) {
    const n = parseInt(card.number, 10);
    if (!isNaN(n) && card.images?.large) {
      map.set(n, card.images.large);
    } else if (!isNaN(n) && card.images?.small) {
      map.set(n, card.images.small);
    }
  }
  return map;
}

async function main() {
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  for (const [serieSlug, { ptcgioId, maxNumber }] of Object.entries(PTCGIO_SETS)) {
    const serie = await prisma.serie.findUnique({
      where: { slug: serieSlug },
      select: { id: true, name: true },
    });
    if (!serie) {
      console.log(`⚠ Série "${serieSlug}" introuvable en DB`);
      continue;
    }

    console.log(`\n📦 ${serie.name} (${serieSlug}) → pokemontcg.io/${ptcgioId}`);

    // Fetch images from pokemontcg.io
    const ptcgioImages = await fetchPtcgioImages(ptcgioId);
    console.log(`   ${ptcgioImages.size} images trouvées sur pokemontcg.io`);

    // Get all cards without images in this serie
    const cards = await prisma.card.findMany({
      where: { serieId: serie.id, imageUrl: null },
      select: { id: true, number: true, name: true },
      orderBy: { number: "asc" },
    });
    console.log(`   ${cards.length} cartes sans image en DB`);

    let updated = 0;
    let skipped = 0;

    for (const card of cards) {
      const cardNum = parseInt(card.number, 10);
      if (isNaN(cardNum) || cardNum > maxNumber) {
        skipped++;
        continue;
      }

      const imageUrl = ptcgioImages.get(cardNum);
      if (!imageUrl) {
        console.log(`   ⚠ ${card.number} ${card.name} → pas d'image sur pokemontcg.io`);
        skipped++;
        continue;
      }

      if (!dryRun) {
        await prisma.card.update({
          where: { id: card.id },
          data: { imageUrl },
        });
      }

      console.log(`   ✓ ${card.number} ${card.name} → ${imageUrl.slice(-30)}`);
      updated++;
    }

    console.log(`\n   ✅ ${updated} images mises à jour, ${skipped} ignorées (hors plage ou sans source)`);
  }

  // Summary of unresolved series
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Séries sans source d'image disponible :
  • MEE (Énergies Méga-Évolution, 8 cartes) — absent de TCGdex et pokemontcg.io
  • MEP (Promos Méga-Évolution, ~27 cartes)  — promos FR sans équivalent sur PTCGIO
  • SVE 017-024 (3ème variante d'énergie)    — hors de la plage pokemontcg.io (max=16)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
