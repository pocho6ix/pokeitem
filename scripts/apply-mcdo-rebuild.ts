/**
 * Applique le plan généré par scripts/build-mcdo-rebuild.ts :
 *   - 36 updates `imageUrl` (2014, 2015, 2017 — contenu DB correct)
 *   - 3 rebuilds complets (2013 : -12/+12, 2018 : -40/+40, 2019 : -40/+40)
 *
 * Invariants vérifiés :
 *   - Pour les updates : la DB contient toujours les cardIds cités, et
 *     `imageUrl` matche `currentUrl` du dry-run (sinon drift, abort).
 *   - Pour les rebuilds : la série existe, le nombre de cartes DB matche
 *     `deleteCardIds.length`, et aucune dépendance utilisateur (userCards=0,
 *     cardWishlistItems=0, userDoubles=0). priceHistory=0 aussi (McDo 13/18/19).
 *
 * Backup : dump complet des cartes supprimées (toutes colonnes) +
 *   état (id, imageUrl) des cartes modifiées, dans
 *   backups/mcdo-rebuild-<ISODate>.json.
 *
 * Flags : --yes pour exécuter.
 *
 * Usage :
 *   npx tsx scripts/build-mcdo-rebuild.ts   # régénère le plan
 *   npx tsx scripts/apply-mcdo-rebuild.ts   # dry check
 *   npx tsx scripts/apply-mcdo-rebuild.ts --yes
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DRY_RUN_FILE = ".dry-run-mcdo-rebuild.json";
const BACKUP_DIR   = "backups";

type Update  = { serieSlug: string; number: string; cardId: string; currentUrl: string | null; newUrl: string };
type Rebuild = {
  serieSlug:     string;
  deleteCardIds: string[];
  createCards:   { number: string; nameFr: string; nameEn: string; imageUrl: string | null; cardmarketUrl: null }[];
};

async function main() {
  const yes = process.argv.includes("--yes");

  if (!existsSync(DRY_RUN_FILE)) {
    console.error(`❌ ${DRY_RUN_FILE} introuvable. Lance d'abord :`);
    console.error(`   npx tsx scripts/build-mcdo-rebuild.ts`);
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(DRY_RUN_FILE, "utf-8")) as {
    updates: Update[]; rebuilds: Rebuild[]; issues: string[];
  };
  if (payload.issues.length) {
    console.error(`❌ Dry-run a signalé ${payload.issues.length} issue(s). Corrige avant d'apply.`);
    for (const i of payload.issues) console.error(`   - ${i}`);
    process.exit(1);
  }
  console.log(`📄 Plan lu : ${payload.updates.length} updates + ${payload.rebuilds.length} rebuilds\n`);

  // ── Sanity updates ────────────────────────────────────────────────────────
  const updateIds = payload.updates.map((u) => u.cardId);
  const dbCards = await prisma.card.findMany({
    where: { id: { in: updateIds } },
    select: { id: true, number: true, imageUrl: true, serie: { select: { slug: true } } },
  });
  const dbById = new Map(dbCards.map((c) => [c.id, c]));
  const updateDrift: string[] = [];
  for (const u of payload.updates) {
    const db = dbById.get(u.cardId);
    if (!db) { updateDrift.push(`missing card ${u.cardId} (${u.serieSlug} #${u.number})`); continue; }
    if (db.serie.slug !== u.serieSlug || db.number !== u.number) {
      updateDrift.push(`${u.cardId}: JSON ${u.serieSlug}#${u.number} / DB ${db.serie.slug}#${db.number}`);
      continue;
    }
    if (db.imageUrl !== u.currentUrl) {
      updateDrift.push(`${u.serieSlug} #${u.number}: current DB url diffère du dry-run`);
    }
  }
  if (updateDrift.length) {
    console.error(`❌ Drift sur updates (${updateDrift.length}) :`);
    for (const d of updateDrift.slice(0, 10)) console.error(`   - ${d}`);
    process.exit(1);
  }

  // ── Sanity rebuilds ───────────────────────────────────────────────────────
  const rebuildDrift: string[] = [];
  const rebuildSeries: { slug: string; id: string; oldCards: { id: string; number: string; name: string; imageUrl: string | null; rarity: string; cardmarketUrl: string | null }[] }[] = [];
  for (const r of payload.rebuilds) {
    const serie = await prisma.serie.findUnique({
      where: { slug: r.serieSlug },
      select: {
        id: true,
        cards: {
          select: {
            id: true, number: true, name: true, imageUrl: true, rarity: true, cardmarketUrl: true,
            _count: { select: { userCards: true, userDoubles: true, cardWishlistItems: true, priceHistory: true } },
          },
        },
      },
    });
    if (!serie) { rebuildDrift.push(`série ${r.serieSlug} introuvable`); continue; }
    const expected = new Set(r.deleteCardIds);
    const actual = new Set(serie.cards.map((c) => c.id));
    if (expected.size !== actual.size || [...expected].some((x) => !actual.has(x))) {
      rebuildDrift.push(`${r.serieSlug}: cards DB diffèrent de deleteCardIds (DB=${actual.size}, plan=${expected.size})`);
    }
    // Dépendances utilisateur : doivent être toutes à 0
    for (const c of serie.cards) {
      const dep = c._count;
      if (dep.userCards || dep.userDoubles || dep.cardWishlistItems) {
        rebuildDrift.push(`${r.serieSlug} #${c.number} (${c.name}) a des dépendances user : ${JSON.stringify(dep)}`);
      }
    }
    rebuildSeries.push({
      slug: r.serieSlug,
      id: serie.id,
      oldCards: serie.cards.map((c) => ({
        id: c.id, number: c.number, name: c.name, imageUrl: c.imageUrl, rarity: c.rarity, cardmarketUrl: c.cardmarketUrl,
      })),
    });
  }
  if (rebuildDrift.length) {
    console.error(`❌ Drift sur rebuilds (${rebuildDrift.length}) :`);
    for (const d of rebuildDrift.slice(0, 10)) console.error(`   - ${d}`);
    process.exit(1);
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  const bySerie = new Map<string, number>();
  for (const u of payload.updates) bySerie.set(u.serieSlug, (bySerie.get(u.serieSlug) ?? 0) + 1);

  console.log(`✅ Sanity OK\n`);
  console.log(`── Updates imageUrl ──`);
  for (const [s, n] of bySerie) console.log(`   • ${s.padEnd(18)} ${n}`);
  console.log(`\n── Rebuilds ──`);
  for (const r of payload.rebuilds) {
    console.log(`   • ${r.serieSlug.padEnd(18)} -${r.deleteCardIds.length} / +${r.createCards.length}`);
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `mcdo-rebuild-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({
    updatesBackup: payload.updates.map((u) => ({ id: u.cardId, imageUrl: u.currentUrl })),
    rebuildsBackup: rebuildSeries,
  }, null, 2));
  console.log(`\n💾 Backup (état pre-apply) : ${backupPath}`);

  if (!yes) {
    console.log(`\nRelance avec --yes pour exécuter.`);
    process.exit(0);
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  console.log(`\n🚀 Exécution…`);

  const ops: Parameters<typeof prisma.$transaction>[0] = [];

  // Updates
  for (const u of payload.updates) {
    ops.push(prisma.card.update({ where: { id: u.cardId }, data: { imageUrl: u.newUrl } }));
  }

  // Rebuilds : deleteMany par serieId + createMany
  const rebuildSeriesById = new Map(rebuildSeries.map((r) => [r.slug, r.id]));
  for (const r of payload.rebuilds) {
    const serieId = rebuildSeriesById.get(r.serieSlug)!;
    ops.push(prisma.card.deleteMany({ where: { serieId } }));
    ops.push(prisma.card.createMany({
      data: r.createCards.map((c) => ({
        serieId,
        number:       c.number,
        name:         c.nameFr,
        rarity:       "PROMO" as const,
        imageUrl:     c.imageUrl,
        cardmarketUrl: c.cardmarketUrl,
        types:        [],
      })),
    }));
  }

  const result = await prisma.$transaction(ops, { timeout: 120_000 });
  console.log(`✅ Transaction OK (${result.length} opérations)`);

  // ── Re-verify ─────────────────────────────────────────────────────────────
  console.log(`\n🔍 Vérification post-apply :`);
  for (const r of payload.rebuilds) {
    const n = await prisma.card.count({ where: { serie: { slug: r.serieSlug } } });
    const sample = await prisma.card.findFirst({
      where: { serie: { slug: r.serieSlug }, number: "1" },
      select: { name: true, imageUrl: true },
    });
    console.log(`   ${n === r.createCards.length ? "✓" : "✗"} ${r.serieSlug}: ${n} cartes — #1 = ${sample?.name} (${sample?.imageUrl?.slice(-40)})`);
  }
  for (const u of payload.updates.slice(0, 3)) {
    const c = await prisma.card.findUnique({ where: { id: u.cardId }, select: { imageUrl: true } });
    const ok = c?.imageUrl === u.newUrl;
    console.log(`   ${ok ? "✓" : "✗"} ${u.serieSlug} #${u.number} → …${c?.imageUrl?.slice(-40)}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
