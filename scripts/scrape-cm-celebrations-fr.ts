/**
 * Scrape Cardmarket FR-language lowest NM prices for the Celebrations set.
 *
 * For each card, we visit the product page with `?language=2` (French language
 * filter) and parse the "De" value from the metadata `<dl>` — this is the
 * lowest available price across FR-language offers only.
 *
 * We reuse the listing page to build CM-code → product-slug mapping, then
 * resolve each DB card via DB_TO_CM_CODE and visit its product page.
 *
 * Targets the 26 Classic Collection reprints + the #24 "Recherches
 * Professorales" variant, since the other 24 regular Celebrations cards are
 * already updated via the Cardmarket RapidAPI `lowest_near_mint_FR` field.
 *
 * Usage:
 *   npx tsx scripts/scrape-cm-celebrations-fr.ts --dry-run
 *   npx tsx scripts/scrape-cm-celebrations-fr.ts
 */

import { PrismaClient } from "@prisma/client";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import * as fs from "fs";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const LISTING_URL =
  "https://www.cardmarket.com/fr/Pokemon/Products/Singles/Celebrations?perSite=50";
const PRODUCT_URL = (slug: string) =>
  `https://www.cardmarket.com/fr/Pokemon/Products/Singles/Celebrations/${slug}?language=2`;

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// DB card number → CM subset code inside parentheses on the listing page.
// Reused from scrape-cm-celebrations-classic.ts.
const DB_TO_CM_CODE: Record<string, string> = {
  "24": "CEL 024",
  "26": "CEL BS 2",
  "27": "CEL BS 4",
  "28": "CEL BS 15",
  "29": "CEL BS 73",
  "30": "CEL TR 8",
  "31": "CEL TR 15",
  "32": "CEL GC 15",
  "33": "CEL WP 24",
  "34": "CEL NG 20",
  "35": "CEL NR 66",
  "36": "CEL MA 9",
  "37": "CEL TRR 86",
  "38": "CEL LM 88",
  "39": "CEL DF 93",
  "40": "CEL POP5 17",
  "41": "CEL GE 15",
  "42": "CEL RR 109",
  "43": "CEL SV 145",
  "44": "CEL HS 107",
  "45": "CEL BLW 113",
  "46": "CEL BLW 114",
  "47": "CEL NXD 54",
  "48": "CEL XY 97",
  "49": "CEL ROS 76",
  "50": "CEL GRI 60",
};

/** Wait for Cloudflare challenge to resolve, polling for a selector. */
async function waitForCloudflare(page: Page, selector: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const count = await page.$$eval(selector, (els) => els.length);
      if (count > 0) return true;
    } catch {
      // Frame detached mid-CF — keep polling
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Parse the listing page HTML → { cmCode → slug } map. */
function parseListingSlugs(html: string): Map<string, string> {
  const slugs = new Map<string, string>();
  const rowRe =
    /href="\/fr\/Pokemon\/Products\/Singles\/Celebrations\/([^"?]+)"[\s\S]*?<h2[^>]*>[\s\S]*?&nbsp;([^<]+?)<\/h2>/g;
  const seen = new Set<string>();
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const slug = m[1];
    const codeMatch = m[2].match(/\(([^)]+)\)\s*$/);
    if (!codeMatch) continue;
    const cmCode = codeMatch[1].trim();
    slugs.set(cmCode, slug);
  }
  return slugs;
}

/** Parse a product page HTML for FR-language lowest NM price. */
function parseFrLowestPrice(html: string): { deFr: number | null; tendance: number | null } {
  // Metadata <dl>: <dt>De</dt><dd>25,00 €</dd>
  const deRe = /<dt[^>]*>\s*De\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/;
  const tendanceRe =
    /<dt[^>]*>\s*Tendance des prix\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/;
  const deMatch = html.match(deRe);
  const tendanceMatch = html.match(tendanceRe);
  return {
    deFr: deMatch ? Number(deMatch[1].replace(",", ".")) : null,
    tendance: tendanceMatch ? Number(tendanceMatch[1].replace(",", ".")) : null,
  };
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" });
  return page;
}

async function visitProduct(
  page: Page,
  slug: string
): Promise<{ deFr: number | null; tendance: number | null; ok: boolean; html?: string }> {
  const url = PRODUCT_URL(slug);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (e) {
    console.log(`     ⚠ goto failed: ${(e as Error).message}`);
    return { deFr: null, tendance: null, ok: false };
  }

  // Wait for CF / product page to settle — look for <dl> with metadata
  const ready = await waitForCloudflare(page, "dt", 60_000);
  if (!ready) {
    console.log(`     ⚠ page did not render (CF?) for ${slug}`);
    return { deFr: null, tendance: null, ok: false };
  }

  const html = await page.content();
  const parsed = parseFrLowestPrice(html);
  return { ...parsed, ok: true, html };
}

/** Visit a product with automatic page recreation on detached-frame errors. */
async function visitProductRobust(
  browser: Browser,
  pageRef: { current: Page },
  slug: string,
  maxRetries = 2
): Promise<{ deFr: number | null; tendance: number | null; ok: boolean; html?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await visitProduct(pageRef.current, slug);
    if (result.ok) return result;
    if (attempt < maxRetries) {
      console.log(`     ↺ retry ${attempt + 1}/${maxRetries} — fresh page`);
      try {
        await pageRef.current.close();
      } catch {}
      pageRef.current = await setupPage(browser);
      // Warm CF by visiting listing first
      try {
        await pageRef.current.goto(LISTING_URL, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await waitForCloudflare(
          pageRef.current,
          "a[href*='/fr/Pokemon/Products/Singles/Celebrations/']",
          60_000
        );
      } catch {}
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  return { deFr: null, tendance: null, ok: false };
}

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: "celebrations" },
      number: { in: Object.keys(DB_TO_CM_CODE) },
    },
    select: { id: true, number: true, name: true, priceFr: true },
    orderBy: { number: "asc" },
  });
  console.log(`📦 ${cards.length} cartes Celebrations ciblées (Classic Collection + #24)\n`);

  if (cards.length === 0) {
    await prisma.$disconnect();
    return;
  }

  console.log("🌐 Lancement de Chrome…");
  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
  });

  const pageRef = { current: await setupPage(browser) };

  try {
    // ── Pass 1: listing page → cmCode → slug map ───────────────────────
    console.log(`🌐 Listing → ${LISTING_URL}`);
    await pageRef.current.goto(LISTING_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    console.log("⏳ Attente Cloudflare / listing…");
    const listingReady = await waitForCloudflare(
      pageRef.current,
      "a[href*='/fr/Pokemon/Products/Singles/Celebrations/']"
    );
    if (!listingReady) {
      console.log("   ⚠ listing non rendu — abort");
      await browser.close();
      await prisma.$disconnect();
      return;
    }

    // Dismiss cookie banner if present
    try {
      await pageRef.current.click("button#CookiesAgreement, button[onclick*='acceptCookie']", {
        delay: 50,
      });
      await new Promise((r) => setTimeout(r, 500));
    } catch {}

    const listingHtml = await pageRef.current.content();
    const cmCodeToSlug = parseListingSlugs(listingHtml);
    console.log(`📋 ${cmCodeToSlug.size} slugs parsés depuis le listing`);

    // ── Pass 2: per-card product page with ?language=2 ─────────────────
    type Update = {
      cardId: string;
      dbNumber: string;
      dbName: string;
      priceFr: number;
      source: string;
      slug: string;
    };
    const updates: Update[] = [];
    const skipped: Array<{ number: string; name: string; reason: string }> = [];

    console.log(`\n💶 Scraping FR-lowest par carte…`);
    for (const c of cards) {
      const cmCode = DB_TO_CM_CODE[c.number];
      const slug = cmCodeToSlug.get(cmCode);
      if (!slug) {
        skipped.push({ number: c.number, name: c.name, reason: `no slug for ${cmCode}` });
        continue;
      }

      process.stdout.write(`   #${c.number.padStart(3)} ${c.name.padEnd(38).slice(0, 38)} [${slug}]`);
      const { deFr, tendance, ok, html } = await visitProductRobust(browser, pageRef, slug);

      if (!ok) {
        console.log(`  ⚠ failed`);
        skipped.push({ number: c.number, name: c.name, reason: "fetch failed" });
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }

      // Prefer "De" (lowest available) → fallback "Tendance" (price trend) if 0/missing.
      const priceFr = deFr && deFr > 0 ? deFr : tendance && tendance > 0 ? tendance : null;
      const source = deFr && deFr > 0 ? "De" : tendance && tendance > 0 ? "Tendance" : "∅";

      if (priceFr === null) {
        console.log(`  ⚠ no FR price (De=${deFr} Tendance=${tendance})`);
        // Dump HTML for inspection
        if (html) {
          fs.writeFileSync(`/tmp/cm-fr-${slug}.html`, html);
        }
        skipped.push({ number: c.number, name: c.name, reason: "no FR offers" });
      } else {
        console.log(`  → ${priceFr.toFixed(2)}€ (${source})`);
        updates.push({
          cardId: c.id,
          dbNumber: c.number,
          dbName: c.name,
          priceFr,
          source,
          slug,
        });
      }

      // Light throttle between pages — CM is cached behind CF, be polite.
      await new Promise((r) => setTimeout(r, 1_200));
    }

    console.log(`\n✅ ${updates.length} cartes avec prix FR`);
    if (skipped.length > 0) {
      console.log(`\n⚠ ${skipped.length} ignorées:`);
      for (const s of skipped) {
        console.log(`   #${s.number.padStart(3)} ${s.name} — ${s.reason}`);
      }
    }

    if (DRY_RUN) {
      console.log("\n(dry-run : rien écrit en DB)");
    } else if (updates.length > 0) {
      console.log("\n💾 Écriture DB…");
      const now = new Date();
      const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      for (const u of updates) {
        await prisma.card.update({
          where: { id: u.cardId },
          data: { priceFr: u.priceFr, priceFrUpdatedAt: now },
        });
        await prisma.cardPriceHistory.upsert({
          where: { cardId_recordedAt: { cardId: u.cardId, recordedAt } },
          create: {
            cardId: u.cardId,
            price: u.priceFr,
            priceFr: u.priceFr,
            source: "cardmarket-scrape-fr",
            recordedAt,
          },
          update: { priceFr: u.priceFr },
        });
      }
      console.log(`✅ ${updates.length} cartes mises à jour`);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
