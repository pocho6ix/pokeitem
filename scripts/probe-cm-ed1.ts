/**
 * Probe: scrape Cardmarket ED1 price for a single WOTC base-set card.
 * Validates that puppeteer bypasses Cloudflare and the price is parseable.
 */
import puppeteer from "puppeteer-core";

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Alakazam Base Set #1 — URL reconstruit à partir de cardmarketUrl DB
const TEST_URL =
  "https://www.cardmarket.com/fr/Pokemon/Products/Singles/Base-Set/Alakazam-V1-BS1?language=2&isFirstEd=Y";

async function waitForSel(page: any, sel: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const n = await page.$$eval(sel, (els: any[]) => els.length);
      if (n > 0) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

(async () => {
  console.log("🌐 Launching Chrome…");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" });

  console.log("→", TEST_URL);
  await page.goto(TEST_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  console.log("⏳ CF / render…");
  const ok = await waitForSel(page, "dt");
  console.log("ready?", ok);
  const html = await page.content();
  console.log("bytes:", html.length);

  // Try multiple patterns
  const patterns: Record<string, RegExp> = {
    De: /<dt[^>]*>\s*De\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/,
    Tendance: /<dt[^>]*>\s*Tendance des prix\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/,
    MoyenneVente: /<dt[^>]*>\s*Prix moyen de vente\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/,
    Moyen30j: /<dt[^>]*>\s*Prix moyen des 30 derniers jours\s*<\/dt>\s*<dd[^>]*>\s*(\d+[.,]\d{2})\s*€/,
  };
  for (const [k, re] of Object.entries(patterns)) {
    const m = html.match(re);
    console.log("  ", k.padEnd(15), m ? m[1] + " €" : "(null)");
  }

  // Dump for manual inspection
  const fs = await import("fs");
  fs.writeFileSync("/tmp/cm-ed1-probe.html", html);
  console.log("HTML dumped → /tmp/cm-ed1-probe.html");

  await browser.close();
})();
