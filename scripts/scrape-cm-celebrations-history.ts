/**
 * Scrape Cardmarket 30-day price history ("Prix de vente moyen" chart) for
 * the 26 Celebrations cards that the CM API doesn't expose (Classic
 * Collection reprints + #24 variant).
 *
 * Each product page embeds two inline Chart.js blocks:
 *   - 30-day chart: labels = DD.MM.YYYY × 30, data = avg sale prices × 30
 *   - 7-day chart: same structure, 14 entries
 *
 * We extract the first (30-day) block and upsert each day into
 * `cardPriceHistory` with source = "cardmarket-chart-fr".
 *
 * Resumable: HTML is cached to /tmp/cm-history-{slug}.html. If the cache
 * exists and is parseable, the network fetch is skipped — re-run the script
 * after CF cools down to finish any failed cards.
 *
 * Usage:
 *   npx tsx scripts/scrape-cm-celebrations-history.ts --dry-run
 *   npx tsx scripts/scrape-cm-celebrations-history.ts
 *   npx tsx scripts/scrape-cm-celebrations-history.ts --force  # re-fetch even if cached
 */

import { PrismaClient } from "@prisma/client";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import * as fs from "fs";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LISTING_URL =
  "https://www.cardmarket.com/fr/Pokemon/Products/Singles/Celebrations?perSite=50";
const PRODUCT_URL = (slug: string) =>
  `https://www.cardmarket.com/fr/Pokemon/Products/Singles/Celebrations/${slug}?language=2`;
const CACHE_DIR = "/tmp";
const CACHE_PATH = (slug: string) => `${CACHE_DIR}/cm-history-${slug}.html`;

// Target set: same 26 cards as backfill-celebrations-fr-manual.ts
const DB_TO_SLUG: Record<string, string> = {
  "24": "Professors-Research-Professor-Oak-V2-CEL024",
  "26": "Blastoise",
  "27": "Charizard-V1-CELBS-4",
  "28": "Venusaur",
  "29": "Imposter-Professor-Oak",
  "30": "Dark-Gyarados",
  "31": "Here-Comes-Team-Rocket",
  "32": "Rockets-Zapdos",
  "33": "s-Pikachu",
  "34": "Cleffa",
  "35": "Shining-Magikarp",
  "36": "Team-Magmas-Groudon",
  "37": "Rockets-Admin",
  "38": "Mew-ex",
  "39": "Gardevoir-ex-Delta-Species",
  "40": "Umbreon-Gold-Star-CELPOP5-17",
  "41": "Claydol-Lv45",
  "42": "Luxray-GL-LVX-CELRR-109",
  "43": "Garchomp-C-LVX-CELSV-145",
  "44": "Donphan-CELHS-107",
  "45": "Reshiram-V2",
  "46": "Zekrom-V2",
  "47": "Mewtwo-EX",
  "48": "Xerneas-EX",
  "49": "MRayquaza-EX",
  "50": "Tapu-Lele-GX",
};

type Point = { date: Date; price: number };

/** Parse a product page HTML → 30-day price history (or null if chart missing). */
function parseHistory(html: string): Point[] | null {
  // Find all inline <script> blocks, pick the one with a "labels":[...] + data array
  // (30-day chart). The 30-day block appears before the 7-day block.
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const body = m[1];
    if (!body.includes("Chart") || !body.includes("labels")) continue;
    // Extract labels and data arrays
    const labelsMatch = body.match(/"labels"\s*:\s*\[([^\]]+)\]/);
    const dataMatch = body.match(/"data"\s*:\s*\[([^\]]+)\]/);
    if (!labelsMatch || !dataMatch) continue;

    const labels = labelsMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""));
    const data = dataMatch[1].split(",").map((s) => Number(s.trim()));
    if (labels.length < 15 || labels.length !== data.length) continue;

    const points: Point[] = [];
    for (let i = 0; i < labels.length; i++) {
      // Label format: DD.MM.YYYY
      const [dd, mm, yyyy] = labels[i].split(".").map(Number);
      if (!dd || !mm || !yyyy) continue;
      const date = new Date(yyyy, mm - 1, dd);
      const price = data[i];
      if (!Number.isFinite(price) || price <= 0) continue;
      points.push({ date, price });
    }

    if (points.length >= 15) return points; // first valid block wins (30-day)
  }
  return null;
}

async function waitForSelector(page: Page, selector: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const count = await page.$$eval(selector, (els) => els.length);
      if (count > 0) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" });
  return page;
}

async function warmCloudflare(page: Page) {
  await page.goto(LISTING_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForSelector(page, "a[href*='/fr/Pokemon/Products/Singles/Celebrations/']", 90_000);
  try {
    await page.click("button#CookiesAgreement, button[onclick*='acceptCookie']", { delay: 50 });
  } catch {}
}

async function fetchProductHtml(
  browser: Browser,
  pageRef: { current: Page },
  slug: string,
  maxRetries = 2
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await pageRef.current.goto(PRODUCT_URL(slug), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      // Wait for either <dt> (metadata) or <canvas> (chart)
      const ready = await waitForSelector(pageRef.current, "dt, canvas", 60_000);
      if (!ready) throw new Error("CF timeout");
      const html = await pageRef.current.content();
      return html;
    } catch (e) {
      console.log(`     ⚠ attempt ${attempt + 1} failed: ${(e as Error).message}`);
      if (attempt < maxRetries) {
        try {
          await pageRef.current.close();
        } catch {}
        pageRef.current = await setupPage(browser);
        try {
          await warmCloudflare(pageRef.current);
        } catch {}
        await new Promise((r) => setTimeout(r, 3_000));
      }
    }
  }
  return null;
}

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: "celebrations" },
      number: { in: Object.keys(DB_TO_SLUG) },
    },
    select: { id: true, number: true, name: true },
    orderBy: { number: "asc" },
  });
  console.log(`📦 ${cards.length} cartes Celebrations ciblées\n`);

  // Pass 1: use cached HTMLs when possible, parse, collect todo list
  type Todo = { card: (typeof cards)[number]; slug: string };
  const todos: Todo[] = [];
  const results: Array<{ card: (typeof cards)[number]; slug: string; points: Point[] }> = [];

  for (const c of cards) {
    const slug = DB_TO_SLUG[c.number];
    const cachePath = CACHE_PATH(slug);
    if (!FORCE && fs.existsSync(cachePath)) {
      const html = fs.readFileSync(cachePath, "utf8");
      const points = parseHistory(html);
      if (points && points.length > 0) {
        console.log(`   ✓ cache  #${c.number.padStart(3)} ${c.name.padEnd(32).slice(0, 32)} [${slug}] → ${points.length} pts`);
        results.push({ card: c, slug, points });
        continue;
      }
    }
    todos.push({ card: c, slug });
  }

  console.log(
    `\n📊 ${results.length} cartes déjà en cache, ${todos.length} à fetcher via CM`
  );

  // Pass 2: fetch missing ones via Puppeteer
  let browser: Browser | null = null;
  let pageRef: { current: Page } | null = null;
  if (todos.length > 0) {
    console.log("\n🌐 Lancement de Chrome…");
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false,
      defaultViewport: { width: 1400, height: 900 },
      args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
    });
    pageRef = { current: await setupPage(browser) };
    console.log("⏳ Warmup Cloudflare via listing…");
    try {
      await warmCloudflare(pageRef.current);
    } catch (e) {
      console.log(`   ⚠ warmup échoué: ${(e as Error).message}`);
    }

    for (const { card: c, slug } of todos) {
      process.stdout.write(
        `   #${c.number.padStart(3)} ${c.name.padEnd(32).slice(0, 32)} [${slug}]`
      );
      const html = await fetchProductHtml(browser, pageRef, slug);
      if (!html) {
        console.log(`  ⚠ fetch failed`);
        await new Promise((r) => setTimeout(r, 3_000));
        continue;
      }
      fs.writeFileSync(CACHE_PATH(slug), html);
      const points = parseHistory(html);
      if (!points || points.length === 0) {
        console.log(`  ⚠ no chart data in HTML (dumped to ${CACHE_PATH(slug)})`);
        continue;
      }
      console.log(`  → ${points.length} pts (${points[0].date.toISOString().slice(0,10)}…${points[points.length-1].date.toISOString().slice(0,10)})`);
      results.push({ card: c, slug, points });
      await new Promise((r) => setTimeout(r, 2_500));
    }

    await browser.close();
  }

  // Pass 3: write to DB
  console.log(`\n📥 ${results.length} cartes avec historique prêt`);
  const totalPoints = results.reduce((s, r) => s + r.points.length, 0);
  console.log(`   Total: ${totalPoints} points à upserter`);

  if (DRY_RUN) {
    console.log("\n(dry-run : rien écrit en DB)");
    await prisma.$disconnect();
    return;
  }

  if (results.length > 0) {
    console.log("\n💾 Écriture DB…");
    let inserted = 0;
    for (const { card: c, points } of results) {
      for (const p of points) {
        await prisma.cardPriceHistory.upsert({
          where: { cardId_recordedAt: { cardId: c.id, recordedAt: p.date } },
          create: {
            cardId: c.id,
            price: p.price,
            priceFr: p.price,
            source: "cardmarket-chart-fr",
            recordedAt: p.date,
          },
          update: { priceFr: p.price, price: p.price, source: "cardmarket-chart-fr" },
        });
        inserted++;
      }
    }
    console.log(`✅ ${inserted} points insérés (${results.length} cartes)`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
