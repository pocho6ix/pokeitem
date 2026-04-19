/**
 * Applique les cardmarketUrl proposés par scripts/dry-run-mcdo-cm-urls.ts
 * pour les 13 séries McDo (2011→2024, pas de 2020).
 *
 * Invariant exploité : avant l'apply, TOUTES les cartes de ces 13 séries
 * ont `cardmarketUrl = null` en DB (confirmé au moment du dry-run). Le
 * drift check refuse donc d'écraser toute valeur non-null.
 *
 * Workflow :
 *   1. Lit .dry-run-mcdo-cm-urls.json (doit avoir été regénéré juste avant)
 *   2. Sanity : re-fetch chaque carte, vérifie qu'elle n'a toujours PAS
 *      de cardmarketUrl. Abort au moindre drift.
 *   3. Backup : dump les (id, cardmarketUrl=null) concernés dans
 *      backups/mcdo-cm-urls-<ISODate>.json (pour rollback symétrique).
 *   4. Apply : update sous transaction (batch d'updates).
 *
 * Flags :
 *   --yes   : skip la confirmation interactive
 *
 * Usage :
 *   npx tsx scripts/dry-run-mcdo-cm-urls.ts       # toujours refaire d'abord
 *   npx tsx scripts/apply-mcdo-cm-urls.ts         # dry check, montre le plan
 *   npx tsx scripts/apply-mcdo-cm-urls.ts --yes   # exécute
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DRY_RUN_FILE = ".dry-run-mcdo-cm-urls.json";
const BACKUP_DIR   = "backups";

type Proposal = {
  cardId:     string;
  serieSlug:  string;
  number:     string;
  nameFr:     string;
  nameEn:     string;
  nameEnFull: string;
  newUrl:     string;
  verified:   boolean;
};

type Skipped = {
  cardId:    string;
  serieSlug: string;
  number:    string;
  nameFr:    string;
  reason:    string;
};

async function main() {
  const yes = process.argv.includes("--yes");

  if (!existsSync(DRY_RUN_FILE)) {
    console.error(`❌ ${DRY_RUN_FILE} introuvable. Lance d'abord :`);
    console.error(`   npx tsx scripts/dry-run-mcdo-cm-urls.ts`);
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(DRY_RUN_FILE, "utf-8")) as {
    proposals: Proposal[];
    skipped:   Skipped[];
  };

  console.log(`📄 Dry-run lu : ${payload.proposals.length} propositions, ${payload.skipped.length} skipped\n`);

  // ── Sanity : recharger les cartes concernées depuis la DB ─────────────
  const ids = payload.proposals.map((p) => p.cardId);
  const dbCards = await prisma.card.findMany({
    where: { id: { in: ids } },
    select: { id: true, number: true, cardmarketUrl: true, serie: { select: { slug: true } } },
  });
  const dbById = new Map(dbCards.map((c) => [c.id, c]));

  const updates: { id: string; to: string; serieSlug: string; number: string }[] = [];
  const drift:   string[] = [];
  const missing: string[] = [];

  for (const p of payload.proposals) {
    const db = dbById.get(p.cardId);
    if (!db) {
      missing.push(`  ${p.serieSlug} #${p.number} ${p.nameFr} (id ${p.cardId})`);
      continue;
    }
    if (db.serie.slug !== p.serieSlug || db.number !== p.number) {
      drift.push(`  ${p.cardId} — JSON dit ${p.serieSlug}#${p.number}, DB dit ${db.serie.slug}#${db.number}`);
      continue;
    }
    if (db.cardmarketUrl !== null) {
      drift.push(`  ${p.serieSlug} #${p.number} ${p.nameFr}\n    JSON suppose null, DB a déjà : ${db.cardmarketUrl}`);
      continue;
    }
    updates.push({ id: db.id, to: p.newUrl, serieSlug: p.serieSlug, number: p.number });
  }

  if (missing.length) {
    console.error(`❌ ${missing.length} carte(s) introuvable(s) en DB :`);
    for (const m of missing.slice(0, 10)) console.error(m);
    if (missing.length > 10) console.error(`  … ${missing.length - 10} autres`);
    process.exit(1);
  }

  if (drift.length) {
    console.error(`❌ Drift détecté (${drift.length}) — la DB a changé depuis le dry-run :\n`);
    for (const d of drift.slice(0, 10)) console.error(d);
    if (drift.length > 10) console.error(`  … ${drift.length - 10} autres`);
    console.error(`\nRégénère le dry-run : npx tsx scripts/dry-run-mcdo-cm-urls.ts`);
    process.exit(1);
  }

  // ── Résumé par série ────────────────────────────────────────────────────
  const bySerie = new Map<string, number>();
  for (const u of updates) bySerie.set(u.serieSlug, (bySerie.get(u.serieSlug) ?? 0) + 1);
  console.log(`✅ ${updates.length} updates prêtes, aucun drift.`);
  for (const [s, n] of bySerie) console.log(`   • ${s.padEnd(18)} ${n}`);

  // ── Backup ──────────────────────────────────────────────────────────────
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `mcdo-cm-urls-${stamp}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(updates.map((u) => ({ id: u.id, cardmarketUrl: null as null })), null, 2),
  );
  console.log(`\n💾 Backup (état pre-apply) : ${backupPath}`);

  // ── Échantillons avant apply ────────────────────────────────────────────
  console.log(`\n🔎 Échantillons à écrire :`);
  for (const u of updates.slice(0, 5)) {
    console.log(`   ${u.serieSlug} #${u.number} → ${u.to}`);
  }

  if (!yes) {
    console.log(`\nRelance avec --yes pour exécuter les ${updates.length} updates.`);
    process.exit(0);
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  console.log(`\n🚀 Exécution de ${updates.length} updates sous transaction…`);
  const result = await prisma.$transaction(
    updates.map((u) =>
      prisma.card.update({
        where: { id: u.id },
        data:  { cardmarketUrl: u.to },
      }),
    ),
    { timeout: 60_000 },
  );
  console.log(`✅ ${result.length} lignes mises à jour.`);

  // ── Re-verify ───────────────────────────────────────────────────────────
  console.log(`\n🔍 Vérification post-apply (5 échantillons) :`);
  for (const u of updates.slice(0, 5)) {
    const c = await prisma.card.findUnique({ where: { id: u.id }, select: { cardmarketUrl: true } });
    const ok = c?.cardmarketUrl === u.to;
    console.log(`   ${ok ? "✓" : "✗"} ${u.serieSlug} #${u.number} → ${c?.cardmarketUrl}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
