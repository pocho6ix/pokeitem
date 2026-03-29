/**
 * SCRIPT : scrape-item-images.ts
 *
 * Scrape product images from CardMarket for items in DB that don't have images.
 * Uses the "by item" approach: for each item without an image, search CardMarket.
 *
 * Usage: npx tsx scripts/scrape-item-images.ts
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = "https://www.cardmarket.com";
const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "items");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

const CATEGORY_MAP: Record<string, string> = {
  BOOSTER: "Boosters",
  BOOSTER_BOX: "Booster-Boxes",
  ETB: "Elite-Trainer-Boxes",
  BOX_SET: "Box-Sets",
  UPC: "Box-Sets",
  TIN: "Tins",
  MINI_TIN: "Tins",
  POKEBALL_TIN: "Tins",
  BLISTER: "Blisters",
  DUOPACK: "Blisters",
  TRIPACK: "Blisters",
  THEME_DECK: "Theme-Decks",
  BUNDLE: "Bundles",
  TRAINER_KIT: "Trainer-Kits",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(
  imageUrl: string,
  destPath: string
): Promise<boolean> {
  try {
    const fullUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `${BASE_URL}${imageUrl}`;

    const response = await fetch(fullUrl, { headers: HEADERS });
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1024) return false;

    fs.writeFileSync(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function getProductImageUrl(
  pageUrl: string
): Promise<string | null> {
  try {
    const url = pageUrl.startsWith("http") ? pageUrl : `${BASE_URL}${pageUrl}`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try multiple selectors
    const selectors = [
      ".product-image img",
      ".image-wrapper img",
      'img.is-front[src*="cardmarket"]',
      'img[src*="product-images"]',
      'img[src*="s3.cardmarket"]',
      'main img[src*="cardmarket"]',
      ".col-12 .col-auto img",
      'img[data-src*="product-images"]',
      'img[data-src*="s3.cardmarket"]',
    ];

    for (const selector of selectors) {
      const $img = $(selector).first();
      if ($img.length) {
        const src = $img.attr("src") || $img.attr("data-src") || "";
        if (src && (src.includes("cardmarket") || src.includes("product"))) {
          return src;
        }
      }
    }

    // Regex fallback
    const imageRegex =
      /https?:\/\/[^"'\s]+(?:product-images|s3\.cardmarket)[^"'\s]+\.(?:jpg|png|webp)/gi;
    const matches = html.match(imageRegex);
    if (matches && matches.length > 0) {
      return matches[0];
    }

    return null;
  } catch {
    return null;
  }
}

async function searchCardMarket(
  query: string
): Promise<string | null> {
  try {
    const searchUrl = `${BASE_URL}/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, { headers: HEADERS });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find first product image in search results
    const $img = $('img[src*="product-images"], img[src*="s3.cardmarket"], img[data-src*="product-images"]').first();
    if ($img.length) {
      const src = $img.attr("src") || $img.attr("data-src") || "";
      if (src && src.includes("product")) return src;
    }

    // Try to get the first product link and fetch its image
    const $link = $('a[href*="/Products/"]').first();
    if ($link.length) {
      const href = $link.attr("href");
      if (href) {
        await sleep(1500);
        return getProductImageUrl(href);
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("🖼️  Scraping des images d'items depuis CardMarket\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all items without images
  const itemsWithoutImage = await prisma.item.findMany({
    where: {
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    include: {
      serie: { include: { bloc: true } },
    },
  });

  console.log(`🔍 ${itemsWithoutImage.length} items sans image\n`);

  let totalDownloaded = 0;
  let totalFailed = 0;

  for (const item of itemsWithoutImage) {
    console.log(`📦 ${item.name} (${item.type})`);

    // Check if image already exists locally
    const existingFiles = [`${item.slug}.jpg`, `${item.slug}.png`, `${item.slug}.webp`];
    const hasLocal = existingFiles.some((f) =>
      fs.existsSync(path.join(OUTPUT_DIR, f))
    );
    if (hasLocal) {
      console.log("  ⏭️  Image locale déjà présente");
      continue;
    }

    let imageUrl: string | null = null;

    // Option 1: use existing cardmarketUrl
    if (item.cardmarketUrl) {
      console.log("  🔗 Utilisation du cardmarketUrl existant...");
      imageUrl = await getProductImageUrl(item.cardmarketUrl);
      await sleep(1500);
    }

    // Option 2: build URL from item name + category
    if (!imageUrl) {
      const category = CATEGORY_MAP[item.type] || "Box-Sets";
      const serieName = item.serie?.nameEn || item.serie?.name || "";
      const cmSlug = item.name
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      const tryUrl = `/fr/Pokemon/Products/${category}/${cmSlug}`;
      console.log(`  🔍 Essai URL directe : ${tryUrl}`);
      imageUrl = await getProductImageUrl(tryUrl);
      await sleep(1500);

      // Option 3: search by name
      if (!imageUrl) {
        const searchQuery = `${serieName} ${item.type.replace(/_/g, " ")}`;
        console.log(`  🔍 Recherche : "${searchQuery}"`);
        imageUrl = await searchCardMarket(searchQuery);
        await sleep(1500);
      }
    }

    if (imageUrl) {
      let ext = ".jpg";
      if (imageUrl.includes(".png")) ext = ".png";
      if (imageUrl.includes(".webp")) ext = ".webp";

      const destPath = path.join(OUTPUT_DIR, `${item.slug}${ext}`);
      const success = await downloadImage(imageUrl, destPath);

      if (success) {
        const localPath = `/images/items/${item.slug}${ext}`;
        await prisma.item.update({
          where: { id: item.id },
          data: { imageUrl: localPath },
        });
        console.log(`  ✅ Sauvegardé : ${item.slug}${ext}`);
        totalDownloaded++;
      } else {
        console.log("  ❌ Échec téléchargement");
        totalFailed++;
      }
    } else {
      console.log("  ⚠️ Aucune image trouvée");
      totalFailed++;
    }

    await sleep(2000);
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Téléchargées : ${totalDownloaded}`);
  console.log(`❌ Échouées : ${totalFailed}`);
  console.log("═".repeat(50));

  await prisma.$disconnect();
}

main().catch(console.error);
