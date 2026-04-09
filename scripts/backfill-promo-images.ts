/**
 * Backfill images for promo series:
 * - Re-fetches TCGdex set listings
 * - Updates imageUrl for cards that now have images
 * - Also upserts new cards added to TCGdex since last seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROMO_SERIES = [
  { slug: "promos-ecarlate-et-violet",   tcgdexId: "svp" },
  { slug: "energies-ecarlate-et-violet", tcgdexId: "sve" },
  { slug: "promos-epee-et-bouclier",     tcgdexId: "swshp" },
  { slug: "promos-soleil-et-lune",       tcgdexId: "smp" },
  { slug: "promos-xy",                   tcgdexId: "xyp" },
  { slug: "bienvenue-a-kalos",           tcgdexId: "xy0" },
  { slug: "promos-noir-et-blanc",        tcgdexId: "bwp" },
  { slug: "coffre-des-dragons",          tcgdexId: "dv1" },
  { slug: "promos-heartgold-soulsilver", tcgdexId: "hgssp" },
  { slug: "promos-diamant-et-perle",     tcgdexId: "dpp" },
  { slug: "promos-nintendo",             tcgdexId: "np" },
  { slug: "promos-mega-evolution",       tcgdexId: "mep" },
  { slug: "energies-mega-evolution",     tcgdexId: "mee" },
];

async function fetchTcgSet(id: string): Promise<{ id: string; localId: string; name: string; image?: string }[]> {
  const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${id}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.cards ?? [];
}

async function main() {
  for (const { slug, tcgdexId } of PROMO_SERIES) {
    const serie = await prisma.serie.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!serie) { console.log(`⚠ ${slug} not found in DB`); continue; }

    const cards = await fetchTcgSet(tcgdexId);
    if (!cards.length) { console.log(`⚠ ${slug}: TCGdex returned 0 cards`); continue; }

    let updated = 0;
    let newCards = 0;

    for (const c of cards) {
      const imageUrl = c.image ? `${c.image}/low.png` : null;
      const existing = await prisma.card.findUnique({
        where: { serieId_number: { serieId: serie.id, number: c.localId } },
        select: { id: true, imageUrl: true },
      });

      if (existing) {
        if (imageUrl && existing.imageUrl !== imageUrl) {
          await prisma.card.update({
            where: { id: existing.id },
            data: { imageUrl },
          });
          updated++;
        }
      } else {
        // New card added to TCGdex since last seed
        await prisma.card.create({
          data: {
            serieId: serie.id,
            number: c.localId,
            name: c.name ?? "—",
            imageUrl,
            tcgdexId: c.id,
            rarity: "Common",
            isSpecial: false,
          },
        });
        newCards++;
      }
    }

    // Update cardCount
    const total = await prisma.card.count({ where: { serieId: serie.id } });
    await prisma.serie.update({ where: { id: serie.id }, data: { cardCount: total } });

    console.log(`✓ ${serie.name}: ${updated} images maj, ${newCards} nouvelles cartes, total=${total}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
