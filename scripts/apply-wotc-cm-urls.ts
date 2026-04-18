/**
 * Applique les cardmarketUrl proposées par scripts/dry-run-wotc-cm-urls.ts.
 *
 * Workflow :
 *   1. Lit .dry-run-wotc-cm-urls.json (doit avoir été regénéré juste avant)
 *   2. Sanity : re-fetch les cartes concernées, vérifie que le `current`
 *      stocké dans le JSON correspond encore à la DB (détecte les écarts
 *      si quelqu'un a modifié entre-temps). Abort si mismatch.
 *   3. Backup : dump les (id, cardmarketUrl) actuels dans
 *      backups/wotc-cm-urls-<ISODate>.json.
 *   4. Apply : update sous transaction (batch de updates).
 *
 * Flags :
 *   --yes   : skip la confirmation interactive
 *
 * Usage :
 *   npx tsx scripts/dry-run-wotc-cm-urls.ts       # toujours refaire d'abord
 *   npx tsx scripts/apply-wotc-cm-urls.ts --yes
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DRY_RUN_FILE = ".dry-run-wotc-cm-urls.json";
const BACKUP_DIR   = "backups";

type Row = {
  serieSlug: string;
  number:    string;
  name:      string;
  current:   string | null;
  proposed:  string | null;
  status:    "changed" | "unchanged" | "no-current-url" | "no-en-name" | "h-no-base" | "other";
  note?:     string;
};

async function main() {
  const yes = process.argv.includes("--yes");

  if (!existsSync(DRY_RUN_FILE)) {
    console.error(`❌ ${DRY_RUN_FILE} introuvable. Lance d'abord :`);
    console.error(`   npx tsx scripts/dry-run-wotc-cm-urls.ts`);
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(DRY_RUN_FILE, "utf-8")) as {
    generatedAt: string;
    totals: { cards: number; changed: number; unchanged: number; errors: number };
    rows: Row[];
  };
  console.log(`📄 Dry-run généré : ${payload.generatedAt}`);
  console.log(`   → ${payload.totals.changed} changes, ${payload.totals.unchanged} unchanged, ${payload.totals.errors} errors\n`);

  const toChange = payload.rows.filter((r): r is Row & { proposed: string } =>
    r.status === "changed" && typeof r.proposed === "string",
  );

  // ── Sanity : recharger les cartes depuis la DB et vérifier qu'on change
  // ce qu'on croit changer ────────────────────────────────────────────────
  const serieSlugs = [...new Set(toChange.map((r) => r.serieSlug))];
  const dbCards = await prisma.card.findMany({
    where: { serie: { slug: { in: serieSlugs } } },
    select: {
      id: true,
      number: true,
      cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
  });
  const dbByKey = new Map<string, { id: string; cardmarketUrl: string | null }>();
  for (const c of dbCards) dbByKey.set(`${c.serie.slug}::${c.number}`, { id: c.id, cardmarketUrl: c.cardmarketUrl });

  const updates: { id: string; from: string; to: string }[] = [];
  const drift: string[] = [];

  for (const r of toChange) {
    const key = `${r.serieSlug}::${r.number}`;
    const db = dbByKey.get(key);
    if (!db) {
      drift.push(`  ${key} — introuvable en DB`);
      continue;
    }
    if (db.cardmarketUrl !== r.current) {
      drift.push(`  ${key}\n    JSON current : ${r.current}\n    DB  actuel   : ${db.cardmarketUrl}`);
      continue;
    }
    updates.push({ id: db.id, from: db.cardmarketUrl ?? "", to: r.proposed });
  }

  if (drift.length) {
    console.error(`❌ Drift détecté (${drift.length}) — la DB a changé depuis le dry-run :\n`);
    for (const d of drift.slice(0, 10)) console.error(d);
    if (drift.length > 10) console.error(`  … ${drift.length - 10} autres`);
    console.error(`\nRégénère le dry-run : npx tsx scripts/dry-run-wotc-cm-urls.ts`);
    process.exit(1);
  }

  console.log(`✅ ${updates.length} updates prêtes, aucun drift.\n`);

  // ── Backup ──────────────────────────────────────────────────────────────
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `wotc-cm-urls-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(updates.map((u) => ({ id: u.id, cardmarketUrl: u.from })), null, 2));
  console.log(`💾 Backup : ${backupPath}\n`);

  if (!yes) {
    console.log(`Relance avec --yes pour exécuter les ${updates.length} updates.`);
    process.exit(0);
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  console.log(`🚀 Exécution de ${updates.length} updates sous transaction…\n`);
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
    console.log(`  ${ok ? "✓" : "✗"} ${u.id} → ${c?.cardmarketUrl}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
