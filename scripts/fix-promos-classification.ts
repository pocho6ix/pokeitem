/**
 * Reclassify Promos Nintendo / Promos Wizards to match reference catalogs
 * (Pokécardex, Bulbapedia):
 *
 *   • Promos Nintendo  (2003–2007)  → bloc EX
 *   • Promos Wizards   (1999–2003)  → bloc WOTC
 *
 * Until now PokéItem grouped `promos-nintendo` under the WOTC bloc (with the
 * wrong logo) and had no `promos-wizards` serie at all. This script fixes the
 * existing record and creates the missing one so the collection UI matches
 * the rest of the ecosystem.
 *
 * Running the script is safe to repeat: the Serie update is idempotent and
 * the promos-wizards upsert is keyed on slug.
 *
 * Usage:
 *   npx tsx scripts/fix-promos-classification.ts --dry-run
 *   npx tsx scripts/fix-promos-classification.ts
 *
 * After the classification is fixed you can still run:
 *   npx tsx scripts/seed-promos.ts --set=basep
 * to pull the actual Wizards Black Star Promos cards from TCGdex.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const [ex, wotc] = await Promise.all([
    prisma.bloc.findUnique({ where: { slug: "ex" } }),
    prisma.bloc.findUnique({ where: { slug: "wotc" } }),
  ]);
  if (!ex || !wotc) {
    throw new Error("Blocs 'ex' et/ou 'wotc' introuvables en DB.");
  }

  // ── 1. Move promos-nintendo → EX ──────────────────────────────────────
  const nintendo = await prisma.serie.findUnique({
    where: { slug: "promos-nintendo" },
    select: { id: true, name: true, blocId: true, imageUrl: true, order: true, bloc: { select: { slug: true } } },
  });

  if (!nintendo) {
    console.log("ℹ promos-nintendo absent en DB — skip (il sera créé par seed-promos).");
  } else {
    const needsMove   = nintendo.blocId !== ex.id;
    const needsImage  = nintendo.imageUrl !== "/images/series/promos-nintendo.png";
    const needsOrder  = nintendo.order !== 20;
    console.log(`📦 promos-nintendo  bloc: ${nintendo.bloc.slug} → ex  image: ${needsImage ? "updated" : "ok"}  order: ${nintendo.order} → 20`);
    if (!DRY_RUN && (needsMove || needsImage || needsOrder)) {
      await prisma.serie.update({
        where: { id: nintendo.id },
        data: {
          blocId:   ex.id,
          imageUrl: "/images/series/promos-nintendo.png",
          order:    20,
        },
      });
    }
  }

  // ── 2. Create promos-wizards in WOTC ─────────────────────────────────
  const wizards = await prisma.serie.findUnique({ where: { slug: "promos-wizards" } });
  if (wizards) {
    console.log("📦 promos-wizards   déjà présent en DB — skip (relance seed-promos si besoin).");
  } else {
    console.log("📦 promos-wizards   création (bloc wotc, 0 cartes — seed-promos --set=basep pour importer).");
    if (!DRY_RUN) {
      await prisma.serie.create({
        data: {
          blocId:       wotc.id,
          slug:         "promos-wizards",
          name:         "Promos Wizards",
          nameEn:       "Wizards Black Star Promos",
          abbreviation: "WP",
          imageUrl:     "/images/series/promos_wizards_of_the_coast.webp",
          releaseDate:  new Date("1999-07-01"),
          order:        20,
          cardCount:    0,
        },
      });
    }
  }

  if (DRY_RUN) console.log("\n(dry-run : rien écrit en DB)");
  else        console.log("\n✅ classification corrigée");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
