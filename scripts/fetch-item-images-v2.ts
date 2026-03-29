/**
 * fetch-item-images-v2.ts
 *
 * Multi-source image fetcher for items:
 * 1. Hardcoded known URLs
 * 2. CardMarket (existing URL)
 * 3. CardMarket (constructed URL)
 * 4. PokéCardex
 * 5. Pokelite
 */

import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

// ─── Config ─────────────────────────────────────────────────
const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "items");
const DELAY_MS = 2000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9",
  "Cache-Control": "no-cache",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https:${url}`;
    const response = await fetch(fullUrl, {
      headers: HEADERS,
      redirect: "follow",
    });

    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 2000) return false;

    fs.writeFileSync(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

// ─── SOURCE 1 : PokéCardex ─────────────────────────────────
async function fetchFromPokecardex(
  serieCode: string,
  itemType: string
): Promise<string | null> {
  try {
    const codes = [
      serieCode,
      serieCode.replace(".", ""),
      serieCode.toLowerCase(),
    ];

    for (const code of codes) {
      const url = `https://www.pokecardex.com/serie/${code}`;
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      const images: string[] = [];

      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        const alt = ($(el).attr("alt") || "").toLowerCase();

        const isProduct =
          alt.includes("display") ||
          alt.includes("booster") ||
          alt.includes("coffret") ||
          alt.includes("elite") ||
          alt.includes("etb") ||
          alt.includes("tin") ||
          alt.includes("box") ||
          alt.includes("bundle") ||
          alt.includes("blister") ||
          alt.includes("tripack") ||
          alt.includes("duopack") ||
          alt.includes("deck") ||
          src.includes("product") ||
          src.includes("sealed");

        if (src && isProduct) {
          const fullSrc = src.startsWith("http")
            ? src
            : `https://www.pokecardex.com${src}`;
          images.push(fullSrc);
        }
      });

      if (images.length > 0) return images[0];
    }
  } catch {}
  return null;
}

// ─── SOURCE 2 : Pokelite ────────────────────────────────────
async function fetchFromPokelite(searchTerm: string): Promise<string | null> {
  try {
    const url = `https://www.pokelite.fr/recherche?controller=search&s=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const $img = $(".product-thumbnail img, .product-image img, .thumbnail img").first();
    const src = $img.attr("src") || $img.attr("data-src");

    if (src && src.includes("http")) return src;
  } catch {}
  return null;
}

// ─── SOURCE 3 : CardMarket FR ───────────────────────────────
async function fetchFromCardMarket(
  productSlug: string,
  category: string
): Promise<string | null> {
  try {
    const categoryMap: Record<string, string> = {
      BOOSTER: "Boosters",
      BOOSTER_BOX: "Booster-Boxes",
      ETB: "Elite-Trainer-Boxes",
      BOX_SET: "Box-Sets",
      UPC: "Box-Sets",
      TIN: "Tins",
      BLISTER: "Blisters",
      THEME_DECK: "Theme-Decks",
      BUNDLE: "Bundles",
      TRAINER_KIT: "Trainer-Kits",
    };

    const cat = categoryMap[category] || "Box-Sets";
    const url = `https://www.cardmarket.com/fr/Pokemon/Products/${cat}/${productSlug}`;

    const response = await fetch(url, {
      headers: {
        ...HEADERS,
        "Cookie": "language=fr; country=FR",
        "Referer": "https://www.cardmarket.com/fr/Pokemon",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const selectors = [
      'img[src*="product-images"]',
      'img[src*="s3.cardmarket"]',
      'img[data-src*="product-images"]',
      ".product-image img",
      ".image-wrapper img",
      'main img[alt*="Pokemon"]',
      'main img[alt*="Pokémon"]',
    ];

    for (const sel of selectors) {
      const $img = $(sel).first();
      const src = $img.attr("src") || $img.attr("data-src");
      if (src && src.includes("http") && !src.includes("avatar") && !src.includes("flag")) {
        return src;
      }
    }

    const regex = /(https?:\/\/[^"'\s]+product-images[^"'\s]+\.(?:jpg|png|webp))/gi;
    const matches = html.match(regex);
    if (matches) return matches[0];
  } catch {}
  return null;
}

// ─── SOURCE 4 : URLs hardcodées ─────────────────────────────
interface KnownImage {
  serieSlug: string;
  type: string;
  url: string;
}

const KNOWN_IMAGES: KnownImage[] = [
  { serieSlug: "equilibre-parfait", type: "ETB",
    url: "https://www.pokecardex.com/assets/images/products/ME03_ETB.png" },
  { serieSlug: "equilibre-parfait", type: "BOOSTER_BOX",
    url: "https://www.pokecardex.com/assets/images/products/ME03_Display.png" },
  { serieSlug: "heros-transcendants", type: "ETB",
    url: "https://www.pokecardex.com/assets/images/products/ME25_ETB.png" },
  { serieSlug: "heros-transcendants", type: "BOOSTER_BOX",
    url: "https://www.pokecardex.com/assets/images/products/ME25_Display.png" },
];

function getKnownImage(serieSlug: string, type: string): string | null {
  const match = KNOWN_IMAGES.find(
    (k) => k.serieSlug === serieSlug && k.type === type
  );
  return match?.url || null;
}

// ─── MAIN ───────────────────────────────────────────────────
async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const items = await prisma.item.findMany({
    where: {
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    include: {
      serie: { include: { bloc: true } },
    },
    orderBy: [{ serie: { releaseDate: "desc" } }, { type: "asc" }],
  });

  console.log(`\n🔍 ${items.length} items sans image à traiter\n`);

  let downloaded = 0;
  let failed = 0;

  for (const item of items) {
    const serieAbbr = item.serie?.abbreviation || "";
    const serieSlug = item.serie?.slug || "";
    const serieName = item.serie?.name || "";

    console.log(`\n📦 ${serieName} — ${item.name} (${item.type})`);

    let imageUrl: string | null = null;

    // Source 1 : URLs hardcodées
    if (!imageUrl) {
      imageUrl = getKnownImage(serieSlug, item.type);
      if (imageUrl) console.log("   📌 Source: URL connue");
    }

    // Source 2 : CardMarket (si cardmarketUrl existe)
    if (!imageUrl && item.cardmarketUrl) {
      console.log("   🔄 Essai CardMarket...");
      const cmSlug = item.cardmarketUrl.split("/").pop() || "";
      imageUrl = await fetchFromCardMarket(cmSlug, item.type);
      if (imageUrl) console.log("   📌 Source: CardMarket");
      await sleep(DELAY_MS);
    }

    // Source 3 : CardMarket (URL construite)
    if (!imageUrl) {
      console.log("   🔄 Essai CardMarket (URL construite)...");
      const slug = item.name
        .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e")
        .replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u")
        .replace(/ç/g, "c").replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim().replace(/\s+/g, "-");
      imageUrl = await fetchFromCardMarket(slug, item.type);
      if (imageUrl) console.log("   📌 Source: CardMarket (construit)");
      await sleep(DELAY_MS);
    }

    // Source 4 : PokéCardex
    if (!imageUrl && serieAbbr) {
      console.log("   🔄 Essai PokéCardex...");
      imageUrl = await fetchFromPokecardex(serieAbbr, item.type);
      if (imageUrl) console.log("   📌 Source: PokéCardex");
      await sleep(DELAY_MS);
    }

    // Source 5 : Pokelite
    if (!imageUrl) {
      console.log("   🔄 Essai Pokelite...");
      const searchTerm = `${serieName} ${item.type.replace(/_/g, " ")}`;
      imageUrl = await fetchFromPokelite(searchTerm);
      if (imageUrl) console.log("   📌 Source: Pokelite");
      await sleep(DELAY_MS);
    }

    // Télécharger
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
        console.log(`   ✅ Sauvegardé : ${item.slug}${ext}`);
        downloaded++;
      } else {
        console.log(`   ❌ Échec téléchargement de ${imageUrl}`);
        failed++;
      }
    } else {
      console.log(`   ❌ Aucune source n'a fonctionné`);
      failed++;
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Images téléchargées : ${downloaded}`);
  console.log(`❌ Échouées : ${failed}`);
  console.log(`📦 Total traité : ${items.length}`);
  console.log("═".repeat(50) + "\n");

  await prisma.$disconnect();
}

main().catch(console.error);
