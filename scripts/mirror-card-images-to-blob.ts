/**
 * Mirror toutes les images de cartes vers Vercel Blob avec filenames SEO.
 *
 * Pour chaque carte :
 *   1. Télécharge l'image depuis la source actuelle (CDN externe ou fichier local)
 *   2. Compresse en WebP quality 85 (resize max 1000×1400 fit inside) via sharp
 *   3. Upload sur Vercel Blob sous `cards/{serie}/{name}-{num}-{serie}-pokeitem.webp`
 *   4. Update `card.imageUrl` vers la nouvelle URL Blob
 *
 * Résumabilité :
 *   - Skip les cartes déjà sur `*.public.blob.vercel-storage.com`
 *   - Checkpoint `.mirror-progress.json` écrit tous les 50 cartes
 *   - Au rerun, on repart propre : le filtre "déjà blob" suffit
 *
 * Safety :
 *   - Backup pré-apply : `backups/mirror-cards-{ISO}.json` (id + imageUrl)
 *   - --yes obligatoire pour écrire. Sans, on imprime un plan seulement.
 *   - --serie=<slug> pour tester sur une seule série d'abord.
 *   - --limit=<N> pour limiter (test).
 *   - --concurrency=<N> (default 10) : sharp est CPU-bound.
 *
 * Env requis :
 *   BLOBBIS_READ_WRITE_TOKEN (store public pokeitem-cards, pulled via
 *   `vercel env pull .env.local --environment=production`)
 *
 * Usage :
 *   npx tsx scripts/mirror-card-images-to-blob.ts                         # dry-run
 *   npx tsx scripts/mirror-card-images-to-blob.ts --serie=promo-mcdo-2019 # test 1 série
 *   npx tsx scripts/mirror-card-images-to-blob.ts --limit=20              # test 20 cartes
 *   npx tsx scripts/mirror-card-images-to-blob.ts --yes                   # apply full
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const BACKUP_DIR = "backups";
const PUBLIC_DIR = "public";
const CHECKPOINT_FILE = ".mirror-progress.json";

// Store public dédié aux cartes (séparé de l'ancien store privé).
// Fallback sur BLOB_READ_WRITE_TOKEN pour rétro-compat.
const BLOB_TOKEN = process.env.BLOBBIS_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;

// ──────────────────────────────────────────────────────────────────────────
// Args
// ──────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const yes = args.includes("--yes");
const onlySerie = args.find((a) => a.startsWith("--serie="))?.split("=")[1];
const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10);
const concurrency = parseInt(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? "10", 10);

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBlobKey(card: { name: string; number: string }, serieSlug: string): string {
  const name = slugify(card.name) || "card";
  const num = slugify(card.number) || "0";
  return `cards/${serieSlug}/${name}-${num}-${serieSlug}-pokeitem.webp`;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    // Fichier local dans public/
    const path = join(PUBLIC_DIR, url);
    if (!existsSync(path)) throw new Error(`Local file missing: ${path}`);
    return readFileSync(path);
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 pokeitem-mirror/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function compressToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(1000, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

type Card = {
  id: string;
  number: string;
  name: string;
  imageUrl: string | null;
  serie: { slug: string };
};

type ProcessResult =
  | { kind: "ok"; id: string; newUrl: string; oldUrl: string | null; bytesIn: number; bytesOut: number }
  | { kind: "skip"; id: string; reason: string }
  | { kind: "error"; id: string; url: string | null; error: string };

async function processOne(card: Card): Promise<ProcessResult> {
  const url = card.imageUrl;
  if (!url) return { kind: "skip", id: card.id, reason: "no imageUrl" };
  if (url.includes(".public.blob.vercel-storage.com")) {
    return { kind: "skip", id: card.id, reason: "already blob" };
  }

  try {
    const buf = await fetchImageBuffer(url);
    const webp = await compressToWebp(buf);
    const key = buildBlobKey(card, card.serie.slug);
    const uploaded = await put(key, webp, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: BLOB_TOKEN,
    });
    return {
      kind: "ok",
      id: card.id,
      newUrl: uploaded.url,
      oldUrl: url,
      bytesIn: buf.length,
      bytesOut: webp.length,
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return { kind: "error", id: card.id, url, error };
  }
}

// Simple parallélisme borné sans dep (type de p-limit mais inline)
async function runPool<T, R>(items: T[], fn: (x: T) => Promise<R>, poolSize: number, onProgress: (done: number, last: R) => void): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      const r = await fn(items[i]);
      results[i] = r;
      done++;
      onProgress(done, r);
    }
  }

  await Promise.all(Array.from({ length: Math.min(poolSize, items.length) }, () => worker()));
  return results;
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  if (!BLOB_TOKEN) {
    console.error(`❌ Aucun token Blob trouvé (BLOBBIS_READ_WRITE_TOKEN ou BLOB_READ_WRITE_TOKEN).`);
    console.error(`   Lance : vercel env pull .env.local --environment=production`);
    process.exit(1);
  }

  // ── Sélection des cartes ────────────────────────────────────────────────
  const where: { imageUrl: { not: null }; serie?: { slug: string } } = { imageUrl: { not: null } };
  if (onlySerie) where.serie = { slug: onlySerie };

  const allCards = await prisma.card.findMany({
    where,
    select: { id: true, number: true, name: true, imageUrl: true, serie: { select: { slug: true } } },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  // Skip cartes déjà sur blob (résumabilité automatique)
  const todo = allCards
    .filter((c) => c.imageUrl && !c.imageUrl.includes(".public.blob.vercel-storage.com"))
    .slice(0, limit > 0 ? limit : undefined);

  const alreadyDone = allCards.length - todo.length;

  console.log(`📦 Cartes totales (scope) : ${allCards.length}`);
  console.log(`   Déjà sur Blob          : ${alreadyDone}`);
  console.log(`   À mirror               : ${todo.length}`);
  if (onlySerie) console.log(`   Scope série            : ${onlySerie}`);
  if (limit) console.log(`   Limit                  : ${limit}`);
  console.log(`   Concurrency            : ${concurrency}`);

  if (todo.length === 0) {
    console.log(`\n✓ Rien à faire.`);
    await prisma.$disconnect();
    return;
  }

  if (!yes) {
    console.log(`\n── Aperçu 5 premières cartes ──`);
    for (const c of todo.slice(0, 5)) {
      const key = buildBlobKey(c, c.serie.slug);
      console.log(`  ${c.serie.slug} #${c.number} ${c.name}`);
      console.log(`    from: ${c.imageUrl}`);
      console.log(`    key : ${key}`);
    }
    console.log(`\nRelance avec --yes pour exécuter.`);
    await prisma.$disconnect();
    return;
  }

  // ── Backup ──────────────────────────────────────────────────────────────
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `mirror-cards-${stamp}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(todo.map((c) => ({ id: c.id, imageUrl: c.imageUrl })), null, 2),
  );
  console.log(`\n💾 Backup : ${backupPath}`);

  // ── Run ─────────────────────────────────────────────────────────────────
  console.log(`\n🚀 Mirror ${todo.length} cartes (concurrency=${concurrency})…`);
  const t0 = Date.now();
  let okCount = 0;
  let errCount = 0;
  let skipCount = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  const errors: { id: string; url: string | null; error: string }[] = [];
  const updates: { id: string; newUrl: string }[] = [];

  const results = await runPool(todo, processOne, concurrency, (done, last) => {
    if (last.kind === "ok") {
      okCount++;
      bytesIn += last.bytesIn;
      bytesOut += last.bytesOut;
      updates.push({ id: last.id, newUrl: last.newUrl });
    } else if (last.kind === "error") {
      errCount++;
      errors.push({ id: last.id, url: last.url, error: last.error });
    } else {
      skipCount++;
    }

    if (done % 25 === 0 || done === todo.length) {
      const pct = ((done / todo.length) * 100).toFixed(1);
      const elapsed = (Date.now() - t0) / 1000;
      const rate = done / elapsed;
      const eta = (todo.length - done) / rate;
      process.stdout.write(
        `  [${done}/${todo.length}] ${pct}% | ok=${okCount} err=${errCount} skip=${skipCount} | ${rate.toFixed(1)}/s | ETA ${Math.round(eta)}s\n`,
      );
      // Checkpoint
      writeFileSync(
        CHECKPOINT_FILE,
        JSON.stringify({ updates, errors, completedAt: done, total: todo.length }, null, 2),
      );
    }
  });
  void results;

  const elapsedSec = (Date.now() - t0) / 1000;
  console.log(`\n⏱  Mirror terminé en ${Math.round(elapsedSec)}s`);
  console.log(`   ✓ ok         : ${okCount}`);
  console.log(`   ⚠ skip       : ${skipCount}`);
  console.log(`   ✗ erreurs    : ${errCount}`);
  console.log(`   ↓ bytes in   : ${(bytesIn / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   ↑ bytes out  : ${(bytesOut / 1024 / 1024).toFixed(1)} MB  (compress ratio ${(bytesIn / bytesOut).toFixed(2)}×)`);

  if (errors.length) {
    console.log(`\n── Sample erreurs (10 premières) ──`);
    for (const e of errors.slice(0, 10)) {
      console.log(`   ${e.id}: ${e.error} (${e.url?.slice(0, 80)})`);
    }
  }

  // ── Update DB ───────────────────────────────────────────────────────────
  if (updates.length) {
    console.log(`\n💾 Update DB : ${updates.length} lignes…`);
    // Split en chunks pour éviter timeout transaction
    const CHUNK = 500;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await prisma.$transaction(
        chunk.map((u) => prisma.card.update({ where: { id: u.id }, data: { imageUrl: u.newUrl } })),
        { timeout: 120_000 },
      );
      console.log(`   chunk ${i / CHUNK + 1}/${Math.ceil(updates.length / CHUNK)} (${chunk.length} rows) ✓`);
    }
    console.log(`✅ ${updates.length} cartes mises à jour en DB.`);
  }

  // ── Sample verify ───────────────────────────────────────────────────────
  console.log(`\n🔍 Sample verify (5 cartes) :`);
  for (const u of updates.slice(0, 5)) {
    const c = await prisma.card.findUnique({ where: { id: u.id }, select: { imageUrl: true, name: true } });
    const ok = c?.imageUrl === u.newUrl;
    console.log(`   ${ok ? "✓" : "✗"} ${c?.name}: …${c?.imageUrl?.slice(-60)}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
