/**
 * Dry-run : analyse toutes les cartes avec `imageUrl` externe pour préparer
 * le mirror vers Vercel Blob (filename SEO-friendly + durabilité pre-iOS).
 *
 * Rôle :
 *   - Compter les cartes à mirror par hostname source
 *   - Échantillonner quelques URLs par source pour mesurer la taille réelle
 *   - Extrapoler le poids total (storage Vercel Blob attendu)
 *   - Générer un aperçu des filenames SEO cibles
 *   - Lister les cartes sans `imageUrl` (à traiter séparément)
 *
 * Output : .dry-run-mirror-cards.json + stdout résumé.
 *
 * Usage :
 *   npx tsx scripts/dry-run-mirror-card-images.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

const SAMPLE_PER_HOST = 5;

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // retire les diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extFromUrl(url: string): string {
  const m = url.match(/\.(jpe?g|png|webp|avif|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "webp";
}

function buildBlobKey(card: { name: string; number: string }, serie: { slug: string }, url: string): string {
  const name   = slugify(card.name);
  const num    = slugify(card.number);
  const serieS = slugify(serie.slug);
  const ext    = extFromUrl(url);
  return `cards/${serieS}/${name}-${num}-${serieS}-pokeitem.${ext}`;
}

async function headSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0 pokeitem-dryrun/1.0" } });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

async function getSizeFallback(url: string): Promise<number | null> {
  // Si HEAD ne donne pas content-length, on tente un GET tronqué
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 pokeitem-dryrun/1.0" } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength;
  } catch {
    return null;
  }
}

async function main() {
  const cards = await prisma.card.findMany({
    select: {
      id: true,
      number: true,
      name: true,
      imageUrl: true,
      serie: { select: { slug: true, name: true } },
    },
  });

  console.log(`📦 Total cartes en DB : ${cards.length}\n`);

  // ── Groupement par hostname ────────────────────────────────────────────────
  const withImage = cards.filter((c) => c.imageUrl);
  const withoutImage = cards.filter((c) => !c.imageUrl);

  const byHost = new Map<string, typeof withImage>();
  for (const c of withImage) {
    let host: string;
    try {
      host = new URL(c.imageUrl!).hostname;
    } catch {
      // URL relative ou invalide (ex. "/cards/mee/mee-002.png", assets locaux)
      host = c.imageUrl!.startsWith("/") ? "(local: public/)" : "(invalid URL)";
    }
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host)!.push(c);
  }

  // Déjà sur Vercel Blob : rien à faire
  const alreadyBlobHosts = [...byHost.keys()].filter((h) => h.endsWith(".public.blob.vercel-storage.com"));
  const alreadyBlobCount = alreadyBlobHosts.reduce((n, h) => n + byHost.get(h)!.length, 0);

  const externalHosts = [...byHost.keys()].filter(
    (h) => !h.endsWith(".public.blob.vercel-storage.com") && !h.startsWith("("),
  );

  console.log(`── Répartition par source ──`);
  for (const h of [...byHost.keys()].sort()) {
    const n = byHost.get(h)!.length;
    const isBlob = h.endsWith(".public.blob.vercel-storage.com");
    console.log(`   ${isBlob ? "✓" : "→"} ${h.padEnd(45)} ${n.toString().padStart(5)} cartes${isBlob ? " (déjà blob, skip)" : ""}`);
  }
  if (withoutImage.length) {
    console.log(`   ⚠ (sans imageUrl)${"".padEnd(27)} ${withoutImage.length.toString().padStart(5)} cartes`);
  }

  // ── Échantillonnage poids par hostname ────────────────────────────────────
  console.log(`\n── Mesure de la taille moyenne (sample ${SAMPLE_PER_HOST} par host) ──`);
  const hostStats: Record<string, { count: number; avgBytes: number; totalMB: number }> = {};

  for (const host of externalHosts) {
    const pool = byHost.get(host)!;
    // Sample évite de toujours prendre les premières : stride régulier
    const stride = Math.max(1, Math.floor(pool.length / SAMPLE_PER_HOST));
    const samples = [];
    for (let i = 0; i < pool.length && samples.length < SAMPLE_PER_HOST; i += stride) {
      samples.push(pool[i]);
    }
    const sizes: number[] = [];
    for (const s of samples) {
      let size = await headSize(s.imageUrl!);
      if (!size) size = await getSizeFallback(s.imageUrl!);
      if (size) sizes.push(size);
    }
    const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
    const totalBytes = avg * pool.length;
    hostStats[host] = { count: pool.length, avgBytes: avg, totalMB: totalBytes / (1024 * 1024) };
    console.log(`   ${host.padEnd(45)} avg ${Math.round(avg / 1024).toString().padStart(4)} KB × ${pool.length} = ${(totalBytes / (1024 * 1024)).toFixed(1).padStart(6)} MB`);
  }

  const totalExternalCards = externalHosts.reduce((n, h) => n + byHost.get(h)!.length, 0);
  const totalMB = Object.values(hostStats).reduce((s, h) => s + h.totalMB, 0);

  console.log(`\n── Bilan ──`);
  console.log(`   Cartes à mirror        : ${totalExternalCards}`);
  console.log(`   Cartes déjà sur Blob   : ${alreadyBlobCount}`);
  console.log(`   Cartes sans imageUrl   : ${withoutImage.length}`);
  console.log(`   Storage estimé         : ${totalMB.toFixed(1)} MB (${(totalMB / 1024).toFixed(2)} GB)`);

  // Vercel Blob pricing : Hobby 1 GB free, Pro 100 GB included
  const gb = totalMB / 1024;
  console.log(`\n   Hobby plan (1 GB free) : ${gb < 1 ? "✓ gratuit" : `⚠ ${((gb - 1) * 0.023).toFixed(2)}€/mo (storage) au-delà`}`);
  console.log(`   Pro plan (100 GB incl) : ✓ gratuit (tu es ${gb < 1 ? "très " : ""}loin de la limite)`);

  // ── Aperçu filenames SEO ──────────────────────────────────────────────────
  console.log(`\n── Aperçu filenames SEO (10 samples) ──`);
  const samples = withImage.slice(0, 10);
  for (const c of samples) {
    const key = buildBlobKey(c, c.serie, c.imageUrl!);
    console.log(`   ${c.serie.slug}/#${c.number} ${c.name.padEnd(25)} → ${key}`);
  }

  // ── Flags / warnings ──────────────────────────────────────────────────────
  const warnings: string[] = [];

  // Cartes avec noms bizarres (après slugify vide ou court)
  const weirdSlugs = withImage.filter((c) => slugify(c.name).length < 2);
  if (weirdSlugs.length) {
    warnings.push(`${weirdSlugs.length} carte(s) avec nom générant un slug invalide (< 2 chars)`);
  }

  // Duplication potentielle de blob keys (même série + même numéro)
  const seenKeys = new Map<string, string>();
  const collisions: { key: string; ids: string[] }[] = [];
  for (const c of withImage) {
    const key = buildBlobKey(c, c.serie, c.imageUrl!);
    if (seenKeys.has(key)) {
      collisions.push({ key, ids: [seenKeys.get(key)!, c.id] });
    } else {
      seenKeys.set(key, c.id);
    }
  }
  if (collisions.length) {
    warnings.push(`${collisions.length} collision(s) de blob key (même filename généré pour 2 cartes)`);
  }

  if (warnings.length) {
    console.log(`\n⚠  Warnings :`);
    for (const w of warnings) console.log(`   - ${w}`);
    if (collisions.length) {
      console.log(`\n   Collisions détaillées (max 5) :`);
      for (const c of collisions.slice(0, 5)) {
        console.log(`     ${c.key} ← ${c.ids.join(" + ")}`);
      }
    }
  }

  // ── Dump JSON ─────────────────────────────────────────────────────────────
  writeFileSync(".dry-run-mirror-cards.json", JSON.stringify({
    totals: {
      allCards: cards.length,
      toMirror: totalExternalCards,
      alreadyBlob: alreadyBlobCount,
      noImageUrl: withoutImage.length,
      estimatedMB: totalMB,
    },
    hostStats,
    collisions,
    sampleFilenames: samples.map((c) => ({
      id: c.id, serieSlug: c.serie.slug, number: c.number, name: c.name,
      currentUrl: c.imageUrl, proposedBlobKey: buildBlobKey(c, c.serie, c.imageUrl!),
    })),
    cardsWithoutImage: withoutImage.map((c) => ({ id: c.id, serieSlug: c.serie.slug, number: c.number, name: c.name })),
  }, null, 2));

  console.log(`\n✅ Dump écrit : .dry-run-mirror-cards.json`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
