/**
 * Scrape Cardmarket 1st Edition (ED1) prices for the 4 WOTC sets.
 *
 * Target sets: Set de Base, Jungle, Fossile, Team Rocket (311 cards total).
 * Each card has `cardmarketUrl` like "Base-Set/Alakazam-V1-BS1?language=2&isFirstEd=N".
 * We rewrite `isFirstEd=N` → `isFirstEd=Y` and scrape the product page with
 * puppeteer-core (Chrome), bypassing Cloudflare.
 *
 * Price priority per card:
 *   1. "De"               → lowest FR offer   (when ?language=2)
 *   2. "Tendance des prix"→ global price trend (fallback if no FR listing)
 *   3. "Prix moyen 30 jours" → final fallback
 *
 * Writes: card.priceFirstEdition + card.priceFirstEditionUpdatedAt
 *
 * Usage:
 *   npx tsx scripts/scrape-cm-ed1-fr.ts --dry-run
 *   npx tsx scripts/scrape-cm-ed1-fr.ts
 *   npx tsx scripts/scrape-cm-ed1-fr.ts --serie=set-de-base
 *   npx tsx scripts/scrape-cm-ed1-fr.ts --limit=10
 *   npx tsx scripts/scrape-cm-ed1-fr.ts --only-missing
 */
import { PrismaClient } from "@prisma/client";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_MISSING = process.argv.includes("--only-missing");
const SERIE_ARG = process.argv.find((a) => a.startsWith("--serie="))?.split("=")[1];
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG) : undefined;

const TARGET_SERIES = ["set-de-base", "jungle", "fossile", "team-rocket"];
const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Build the ED1 product URL with filters:
 *   - isFirstEd=Y      → 1st Edition variant
 *   - minCondition=2   → Near Mint ou mieux (1=Mint, 2=NM, 3=EX, 4=GD, 5=LP, 6=PL, 7=PO)
 */
function toEd1Url(rel: string): string {
  let out = /[?&]isFirstEd=/.test(rel)
    ? rel.replace(/([?&])isFirstEd=[NY](\b)/, "$1isFirstEd=Y$2")
    : rel + (rel.includes("?") ? "&" : "?") + "isFirstEd=Y";
  if (!/[?&]minCondition=/.test(out)) out += "&minCondition=3";
  return `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${out}`;
}

/** Wait for any <dt> to appear (product page rendered). */
async function waitForRendered(page: Page, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const n = await page.$$eval("dt", (els) => els.length);
      if (n > 0) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Parse all relevant price fields from the product page HTML. */
function parsePrices(html: string): {
  deFr: number | null;
  tendance: number | null;
  moy30: number | null;
  articles: number | null;
} {
  const num = (s: string | undefined): number | null =>
    s ? Number(s.replace(/\./g, "").replace(",", ".")) : null;
  const matchPrice = (label: string): number | null => {
    const re = new RegExp(
      `<dt[^>]*>\\s*${label}\\s*</dt>\\s*<dd[^>]*>(?:<span>)?\\s*(\\d+(?:[.,]\\d{2})?)\\s*€`,
      "i"
    );
    const m = html.match(re);
    return m ? num(m[1]) : null;
  };
  const matchInt = (label: string): number | null => {
    const re = new RegExp(
      `<dt[^>]*>\\s*${label}\\s*</dt>\\s*<dd[^>]*>(?:<span>)?\\s*(\\d+)`,
      "i"
    );
    const m = html.match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    deFr: matchPrice("De"),
    tendance: matchPrice("Tendance des prix"),
    moy30: matchPrice("Prix moyen 30 jours"),
    articles: matchInt("Articles disponibles"),
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

async function visitOnce(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (e) {
    return { ok: false as const, reason: `goto: ${(e as Error).message}` };
  }
  const ready = await waitForRendered(page);
  if (!ready) return { ok: false as const, reason: "CF/render timeout" };
  const html = await page.content();
  return { ok: true as const, html };
}

async function visitRobust(
  browser: Browser,
  pageRef: { current: Page },
  url: string,
  maxRetries = 2
): Promise<{ ok: boolean; html?: string; reason?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await visitOnce(pageRef.current, url);
    if (res.ok) return res;
    if (attempt < maxRetries) {
      console.log(`     ↺ retry ${attempt + 1}/${maxRetries} (${res.reason})`);
      try {
        await pageRef.current.close();
      } catch {}
      pageRef.current = await setupPage(browser);
      await new Promise((r) => setTimeout(r, 2_000));
    } else {
      return res;
    }
  }
  return { ok: false, reason: "max retries" };
}

async function main() {
  const whereBase: Record<string, unknown> = {
    serie: { slug: SERIE_ARG ? SERIE_ARG : { in: TARGET_SERIES } },
    cardmarketUrl: { not: null },
  };
  if (ONLY_MISSING) whereBase.priceFirstEdition = null;

  const cards = await prisma.card.findMany({
    where: whereBase as any,
    select: {
      id: true,
      number: true,
      name: true,
      cardmarketUrl: true,
      priceFirstEdition: true,
      serie: { select: { slug: true, name: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(
    `📦 ${cards.length} cartes à scraper${
      SERIE_ARG ? ` (serie=${SERIE_ARG})` : ""
    }${ONLY_MISSING ? " [only-missing]" : ""}${DRY_RUN ? " [DRY RUN]" : ""}`
  );
  if (cards.length === 0) {
    await prisma.$disconnect();
    return;
  }

  console.log("🌐 Launching Chrome…");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--lang=fr-FR"],
  });
  const pageRef = { current: await setupPage(browser) };

  type Update = {
    cardId: string;
    dbNumber: string;
    dbName: string;
    serie: string;
    priceEd1: number;
    source: string;
  };
  const updates: Update[] = [];
  const skipped: Array<{ serie: string; number: string; name: string; reason: string }> = [];

  let i = 0;
  for (const c of cards) {
    i++;
    const url = toEd1Url(c.cardmarketUrl!);
    process.stdout.write(
      `[${i}/${cards.length}] ${c.serie.slug.padEnd(13)} #${c.number.padStart(3)} ${c.name
        .padEnd(28)
        .slice(0, 28)} `
    );

    const res = await visitRobust(browser, pageRef, url);
    if (!res.ok || !res.html) {
      console.log(`⚠ ${res.reason}`);
      skipped.push({ serie: c.serie.slug, number: c.number, name: c.name, reason: res.reason ?? "fail" });
      await new Promise((r) => setTimeout(r, 2_000));
      continue;
    }

    const { deFr, tendance, moy30, articles } = parsePrices(res.html);

    const priceEd1 =
      deFr && deFr > 0
        ? deFr
        : tendance && tendance > 0
        ? tendance
        : moy30 && moy30 > 0
        ? moy30
        : null;
    const source =
      deFr && deFr > 0 ? "De-FR" : tendance && tendance > 0 ? "Tendance" : moy30 && moy30 > 0 ? "Moy30j" : "∅";

    if (priceEd1 === null) {
      console.log(`⚠ no price (articles=${articles ?? "?"})`);
      skipped.push({ serie: c.serie.slug, number: c.number, name: c.name, reason: "no price" });
    } else {
      console.log(`→ ${priceEd1.toFixed(2)}€ (${source}${articles ? `, ${articles} offres` : ""})`);
      updates.push({
        cardId: c.id,
        dbNumber: c.number,
        dbName: c.name,
        serie: c.serie.slug,
        priceEd1,
        source,
      });
    }
    // 30s entre cartes pour éviter un blocage Cloudflare
    await new Promise((r) => setTimeout(r, 30_000));
  }

  await browser.close();

  // ── Persist ─────────────────────────────────────────────────────────────
  console.log(
    `\n📊 ${updates.length} prix à écrire · ${skipped.length} sans prix`
  );
  if (!DRY_RUN && updates.length > 0) {
    const now = new Date();
    for (const u of updates) {
      await prisma.card.update({
        where: { id: u.cardId },
        data: {
          priceFirstEdition: u.priceEd1,
          priceFirstEditionUpdatedAt: now,
        },
      });
    }
    console.log(`✅ ${updates.length} cartes mises à jour`);
  } else if (DRY_RUN) {
    console.log("🟡 DRY RUN — aucune écriture");
  }

  if (skipped.length > 0) {
    console.log(`\n⚠ Skipped (${skipped.length}):`);
    for (const s of skipped.slice(0, 20)) {
      console.log(`   ${s.serie} #${s.number} ${s.name} — ${s.reason}`);
    }
    if (skipped.length > 20) console.log(`   … +${skipped.length - 20} autres`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
