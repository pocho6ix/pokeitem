/**
 * manual-image-urls.ts
 *
 * APPROCHE MANUELLE :
 *
 * 1. Ouvre CardMarket dans ton navigateur
 * 2. Va sur chaque page produit
 * 3. Clic droit sur l'image → "Copier l'adresse de l'image"
 * 4. Colle l'URL dans IMAGE_URLS ci-dessous
 *
 * Tu peux aussi ouvrir l'inspecteur (F12) sur une page listing
 * CardMarket et copier toutes les URLs d'images d'un coup avec :
 *
 * document.querySelectorAll('img[src*="product-images"]')
 *   .forEach(img => console.log(img.alt, '→', img.src))
 */

import * as fs from "fs";
import * as path from "path";

const IMAGE_URLS: Record<string, string> = {
  // ─── Items actuellement en BDD sans image ─────────────────
  // Équilibre Parfait
  "equilibre-parfait-booster": "",        // ← encore manquant — lancer le script sur /Boosters
  "equilibre-parfait-etb": "https://product-images.s3.cardmarket.com/1016/865406/865406.jpg",

  // Héros Transcendants
  "heros-transcendants-etb": "https://product-images.s3.cardmarket.com/1016/860574/860574.jpg",

  // Flammes Fantasmagoriques
  "flammes-fantasmagoriques-etb": "https://product-images.s3.cardmarket.com/1016/846744/846744.jpg",
  "flammes-fantasmagoriques-upc": "https://product-images.s3.cardmarket.com/1015/846718/846718.jpg",

  // Méga-Évolution
  "mega-evolution-etb": "https://product-images.s3.cardmarket.com/1016/834830/834830.jpg",
};

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const outputDir = path.join(process.cwd(), "public", "images", "items");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;

  for (const [slug, url] of Object.entries(IMAGE_URLS)) {
    if (!url) { skipped++; continue; }

    const ext = url.includes(".png") ? ".png" : url.includes(".webp") ? ".webp" : ".jpg";
    const destPath = path.join(outputDir, `${slug}${ext}`);

    if (fs.existsSync(destPath)) {
      console.log(`⏭️  ${slug} — déjà existant`);
      skipped++;
      continue;
    }

    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://www.cardmarket.com/",
          "Origin": "https://www.cardmarket.com",
        },
      });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 1000) {
          fs.writeFileSync(destPath, buffer);

          // Update DB
          const localPath = `/images/items/${slug}${ext}`;
          await prisma.item.updateMany({
            where: { slug },
            data: { imageUrl: localPath },
          });

          console.log(`✅ ${slug}`);
          downloaded++;
        } else {
          console.log(`❌ ${slug} — image trop petite`);
        }
      } else {
        console.log(`❌ ${slug} — HTTP ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ ${slug} — erreur réseau`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Téléchargées: ${downloaded}, ⏭️ Ignorées: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(console.error);
