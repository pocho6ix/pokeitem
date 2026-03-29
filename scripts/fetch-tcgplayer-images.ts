/**
 * fetch-tcgplayer-images.ts
 *
 * Télécharge les images des produits scellés depuis TCGPlayer.
 * Les images sont accessibles sans anti-bot via :
 * https://product-images.tcgplayer.com/fit-in/437x437/{productId}.jpg
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "items");

// ─── Mapping : slug item PokeItem → TCGPlayer productId ─────
// Noms EN TCGPlayer → noms FR PokeItem
const ITEM_IMAGES: Record<string, number> = {
  // ─── Équilibre Parfait (ME03: Perfect Order) ──────────────
  "equilibre-parfait-booster": 672398,
  "equilibre-parfait-etb": 672401,
  "equilibre-parfait-booster-box": 672394,
  "equilibre-parfait-bundle": 672396,
  "equilibre-parfait-blister": 672393,
  "equilibre-parfait-upc": 672401,  // pas de UPC, fallback ETB

  // ─── Héros Transcendants (ME: Ascended Heroes) ────────────
  "heros-transcendants-etb": 668496,
  "heros-transcendants-booster": 672434,
  "heros-transcendants-booster-box": 0,  // pas de booster box pour cette série
  "heros-transcendants-bundle": 668541,
  "heros-transcendants-mini-tin": 668531,
  "heros-transcendants-box-set": 666906,

  // ─── Flammes Fantasmagoriques (ME02: Phantasmal Flames) ───
  "flammes-fantasmagoriques-etb": 654136,
  "flammes-fantasmagoriques-booster": 654144,
  "flammes-fantasmagoriques-booster-box": 654137,
  "flammes-fantasmagoriques-upc": 654135, // Pokemon Center ETB as closest
  "flammes-fantasmagoriques-bundle": 654160,
  "flammes-fantasmagoriques-blister": 654154,

  // ─── Méga-Évolution (ME01: Mega Evolution) ────────────────
  "mega-evolution-etb": 644279,
  "mega-evolution-booster": 644352,
  "mega-evolution-booster-box": 644298,
  "mega-evolution-bundle": 644362,
  "mega-evolution-blister": 644356,
  "mega-evolution-mini-tin": 649395,

  // ─── Rivalités Destinées (SV10: Destined Rivals) ──────────
  "rivalites-destinees-etb": 624676,
  "rivalites-destinees-booster": 624683,
  "rivalites-destinees-booster-box": 624679,
  "rivalites-destinees-bundle": 625670,
  "rivalites-destinees-blister": 625683,
  "rivalites-destinees-upc": 624675, // Pokemon Center ETB

  // ─── Évolutions Prismatiques (SV: Prismatic Evolutions) ───
  "evolutions-prismatiques-etb": 593355,
  "evolutions-prismatiques-booster": 593294,
  "evolutions-prismatiques-bundle": 600518,
  "evolutions-prismatiques-mini-tin": 593462,
  "evolutions-prismatiques-box-set": 622770,
  "evolutions-prismatiques-blister": 609716,
};

async function downloadImage(productId: number, destPath: string): Promise<boolean> {
  try {
    const url = `https://product-images.tcgplayer.com/fit-in/437x437/${productId}.jpg`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get items without images from DB
  const itemsWithoutImage = await prisma.item.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: "" }] },
    include: { serie: true },
  });

  console.log(`\n🔍 ${itemsWithoutImage.length} items sans image en BDD\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // First: download for items in DB that need images
  for (const item of itemsWithoutImage) {
    const productId = ITEM_IMAGES[item.slug];
    if (!productId) {
      console.log(`⚠️  Pas de mapping pour ${item.slug}`);
      skipped++;
      continue;
    }

    const destPath = path.join(OUTPUT_DIR, `${item.slug}.jpg`);
    if (fs.existsSync(destPath)) {
      // File exists but DB not updated
      const localPath = `/images/items/${item.slug}.jpg`;
      await prisma.item.update({ where: { id: item.id }, data: { imageUrl: localPath } });
      console.log(`⏭️  ${item.slug} — fichier existant, BDD mise à jour`);
      skipped++;
      continue;
    }

    console.log(`📥 ${item.slug} (TCGPlayer #${productId})...`);
    const success = await downloadImage(productId, destPath);

    if (success) {
      const localPath = `/images/items/${item.slug}.jpg`;
      await prisma.item.update({ where: { id: item.id }, data: { imageUrl: localPath } });
      console.log(`   ✅ OK`);
      downloaded++;
    } else {
      console.log(`   ❌ Échec`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Also download any mapped images not yet on disk (for future items)
  let preloaded = 0;
  for (const [slug, productId] of Object.entries(ITEM_IMAGES)) {
    if (!productId) continue;
    const destPath = path.join(OUTPUT_DIR, `${slug}.jpg`);
    if (fs.existsSync(destPath)) continue;

    // Only download if not already handled above
    if (itemsWithoutImage.find((i) => i.slug === slug)) continue;

    console.log(`📥 (pré-chargement) ${slug} (TCGPlayer #${productId})...`);
    const success = await downloadImage(productId, destPath);
    if (success) {
      console.log(`   ✅ OK`);
      preloaded++;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Téléchargées (BDD) : ${downloaded}`);
  console.log(`✅ Pré-chargées : ${preloaded}`);
  console.log(`⏭️  Ignorées : ${skipped}`);
  console.log(`❌ Échouées : ${failed}`);
  console.log("═".repeat(50) + "\n");

  await prisma.$disconnect();
}

main().catch(console.error);
