/**
 * Scrape Cardmarket FR prices for "Celebrations: Classic Collection" reprints.
 *
 * The Cardmarket RapidAPI returns `prices: null` for the 25 Classic Collection
 * cards (see tcgid `cel25c-*_A`), so we fetch them directly from cardmarket.com
 * via a real Chrome instance (needed to pass the Cloudflare managed challenge).
 *
 * Usage:
 *   npx tsx scripts/scrape-cm-celebrations-classic.ts --dry-run
 *   npx tsx scripts/scrape-cm-celebrations-classic.ts
 */

import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer-core";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// `perSite=50` → avoid pagination (default is 30). We do NOT filter by sellerCountry=5
// because FR-only filtering hides cards without any French seller and we still want
// at least a EU-wide lowest NM as a fallback.
const EXPANSION_URL =
  "https://www.cardmarket.com/fr/Pokemon/Products/Singles/Celebrations?perSite=50";

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// DB card number → CM subset code inside parentheses (e.g. "CEL BS 2").
// Built by inspecting the Celebrations Singles page on cardmarket.com.
// Regular Celebrations set uses numeric codes (CEL 001..CEL 024); the Classic
// Collection reprints use letter-prefixed codes (BS, TR, WP, MA, NG, GE, TRR,
// SV, BLW, RR, LM, DF, POP5, HS, NXD, XY, ROS, GRI, NR).
const DB_TO_CM_CODE: Record<string, string> = {
  "24": "CEL 024",           // Recherches Professorales (variante #24)
  "26": "CEL BS 2",          // Tortank (Blastoise, Base Set)
  "27": "CEL BS 4",          // Dracaufeu (Charizard, Base Set)
  "28": "CEL BS 15",         // Florizarre (Venusaur, Base Set)
  "29": "CEL BS 73",         // Faux Professeur Chen (Imposter Professor Oak)
  "30": "CEL TR 8",          // Léviator obscur (Dark Gyarados, Team Rocket)
  "31": "CEL TR 15",         // Et voilà les Team Rocket ! (Here Comes Team Rocket)
  "32": "CEL GC 15",         // Électhor de Rocket (Rocket's Zapdos)
  "33": "CEL WP 24",         // Pikachu de ___ (____'s Pikachu)
  "34": "CEL NG 20",         // Mélo (Cleffa, Neo Genesis)
  "35": "CEL NR 66",         // Magicarpe Brillant (Shining Magikarp)
  "36": "CEL MA 9",          // Groudon de Team Magma (Team Magma's Groudon)
  "37": "CEL TRR 86",        // Admin Rocket (Rocket's Admin.)
  "38": "CEL LM 88",         // Mew ex
  "39": "CEL DF 93",         // Gardevoir ex δ
  "40": "CEL POP5 17",       // Noctali ☆ (Umbreon Gold Star)
  "41": "CEL GE 15",         // Kaorine (Cynthia)
  "42": "CEL RR 109",        // Luxray GL NIV.X
  "43": "CEL SV 145",        // Carchacrok C NIV.X
  "44": "CEL HS 107",        // Donphan
  "45": "CEL BLW 113",       // Reshiram (Classic Collection Black & White)
  "46": "CEL BLW 114",       // Zekrom (Classic Collection Black & White)
  "47": "CEL NXD 54",        // Mewtwo-EX (Next Destinies)
  "48": "CEL XY 97",         // Xerneas-EX (XY)
  "49": "CEL ROS 76",        // M-Rayquaza-EX (Roaring Skies)
  "50": "CEL GRI 60",        // Tokopiyon-GX (Tapu Lele-GX, Guardians Rising)
};

async function main() {
  const cards = await prisma.card.findMany({
    where: {
      serie: { slug: "celebrations" },
      OR: [{ priceFr: null }, { priceFr: { lte: 0 } }],
    },
    select: { id: true, number: true, name: true },
    orderBy: { number: "asc" },
  });
  console.log(`📦 ${cards.length} cartes Celebrations sans prix FR en DB\n`);

  if (cards.length === 0) {
    await prisma.$disconnect();
    return;
  }

  console.log("🌐 Lancement de Chrome…");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" });

    console.log(`🌐 Navigation → ${EXPANSION_URL}`);
    await page.goto(EXPANSION_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Cloudflare: poll for product rows, surviving frame navigations
    console.log("⏳ Attente de Cloudflare / table produits…");
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const count = await page.$$eval(
          "a[href*='/fr/Pokemon/Products/Singles/Celebrations/']",
          (els) => els.length
        );
        if (count > 0) { ready = true; break; }
      } catch {
        // frame detached mid-CF — keep polling
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!ready) {
      console.log("   ⚠ toujours pas de lignes produits — je continue et je tente d'extraire");
    }

    // Dismiss cookie banner if present
    try {
      await page.click("button#CookiesAgreement, button[onclick*='acceptCookie']", { delay: 50 });
    } catch {}

    // Parse the full page HTML. Each card gallery box looks like:
    //   <a href="/fr/.../Singles/Celebrations/<slug>" class="...galleryBox">
    //     ...<h2 class="card-title h3">...Name  (CEL XXX)</h2>...
    //     <p class="card-text text-muted">À partir de X,YY €</p>
    //   ...</a>
    const html = await page.content();
    const rowRe =
      /href="(\/fr\/Pokemon\/Products\/Singles\/Celebrations\/[^"]+)"[\s\S]*?<h2[^>]*>[\s\S]*?&nbsp;([^<]+?)<\/h2>[\s\S]*?À partir de[^0-9]*(\d+[.,]\d{2})\s*€/g;
    const rows: Array<{ name: string; priceText: string; href: string }> = [];
    let m;
    const seen = new Set<string>();
    while ((m = rowRe.exec(html)) !== null) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      rows.push({ name: m[2].trim().replace(/\s+/g, " "), priceText: `${m[3]} €`, href: m[1] });
    }

    console.log(`\n📋 ${rows.length} lignes extraites:`);
    for (const r of rows) console.log(`   ${r.name.padEnd(45)} → ${r.priceText}`);

    if (rows.length === 0) {
      const fs = await import("fs");
      fs.writeFileSync("/tmp/cm-debug.html", html);
      console.log(`\n⚠ Aucune ligne — HTML (${html.length} chars) dumpé dans /tmp/cm-debug.html`);
      await browser.close();
      await prisma.$disconnect();
      return;
    }

    // Build CM-code → { name, price } from scraped rows.
    type Scraped = { cmName: string; cmCode: string; priceFr: number };
    const byCode = new Map<string, Scraped>();
    for (const r of rows) {
      const priceMatch = r.priceText.match(/(\d+[.,]\d{2})/);
      const codeMatch = r.name.match(/\(([^)]+)\)\s*$/);
      if (!priceMatch || !codeMatch) continue;
      const priceFr = Number(priceMatch[1].replace(",", "."));
      if (priceFr <= 0) continue;
      const cmCode = codeMatch[1].trim();
      const cmName = r.name.replace(/\s*\([^)]+\)\s*$/, "").trim();
      byCode.set(cmCode, { cmName, cmCode, priceFr });
    }

    console.log(`\n💶 ${byCode.size} prix parsés par code CM`);

    // Match each DB card by explicit DB_TO_CM_CODE mapping.
    type Update = { cardId: string; dbNumber: string; dbName: string; priceFr: number; cmName: string; cmCode: string };
    const updates: Update[] = [];
    const unmatched: Array<{ number: string; name: string; expectedCode?: string }> = [];

    for (const c of cards) {
      const expectedCode = DB_TO_CM_CODE[c.number];
      if (!expectedCode) {
        unmatched.push({ number: c.number, name: c.name });
        continue;
      }
      const hit = byCode.get(expectedCode);
      if (hit) {
        updates.push({
          cardId: c.id,
          dbNumber: c.number,
          dbName: c.name,
          priceFr: hit.priceFr,
          cmName: hit.cmName,
          cmCode: hit.cmCode,
        });
      } else {
        unmatched.push({ number: c.number, name: c.name, expectedCode });
      }
    }

    console.log(`\n✅ ${updates.length} cartes appariées`);
    for (const u of updates) {
      console.log(`   #${u.dbNumber.padStart(3)} ${u.dbName.padEnd(40)} → ${u.priceFr.toFixed(2)}€ [${u.cmCode}] ${u.cmName}`);
    }
    if (unmatched.length > 0) {
      console.log(`\n⚠ ${unmatched.length} non appariées:`);
      for (const u of unmatched) console.log(`   #${u.number.padStart(3)} ${u.name}${u.expectedCode ? ` (attendu: ${u.expectedCode})` : ""}`);
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
            source: "cardmarket-scrape",
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
