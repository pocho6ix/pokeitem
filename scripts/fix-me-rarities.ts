/**
 * fix-me-rarities.ts
 *
 * Corrige les raretés des cartes du bloc Méga-Évolution (ME01, ME02, ME02.5)
 * en récupérant les données depuis PokémonTCG.io.
 *
 * Usage:
 *   npx tsx scripts/fix-me-rarities.ts
 *   npx tsx scripts/fix-me-rarities.ts --dry-run
 */

import { PrismaClient, CardRarity } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// ── Sets à corriger ─────────────────────────────────────────────────────────

const ME_SETS: { slug: string; ptcgId: string }[] = [
  { slug: "mega-evolution",           ptcgId: "me1" },
  { slug: "flammes-fantasmagoriques", ptcgId: "me2" },
  { slug: "heros-transcendants",      ptcgId: "me2pt5" },
  { slug: "equilibre-parfait",        ptcgId: "me3" },
];

// ── Mapping rareté PokémonTCG.io → CardRarity ───────────────────────────────

const PTCG_RARITY_MAP: Record<string, CardRarity> = {
  "Common":                    CardRarity.COMMON,
  "Uncommon":                  CardRarity.UNCOMMON,
  "Rare":                      CardRarity.RARE,
  "Rare Holo":                 CardRarity.RARE,
  "Double Rare":               CardRarity.DOUBLE_RARE,
  "Ultra Rare":                CardRarity.ILLUSTRATION_RARE,
  "Illustration Rare":         CardRarity.ILLUSTRATION_RARE,
  "Special Illustration Rare": CardRarity.SPECIAL_ILLUSTRATION_RARE,
  "Hyper Rare":                CardRarity.HYPER_RARE,
  "Mega Hyper Rare":           CardRarity.MEGA_HYPER_RARE,
  "MEGA_ATTACK_RARE":          CardRarity.MEGA_ATTAQUE_RARE,
  "ACE SPEC Rare":             CardRarity.ACE_SPEC_RARE,
  "Promo":                     CardRarity.PROMO,
};

const SPECIAL_RARITIES = new Set<CardRarity>([
  CardRarity.DOUBLE_RARE,
  CardRarity.ILLUSTRATION_RARE,
  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  CardRarity.HYPER_RARE,
  CardRarity.MEGA_HYPER_RARE,
  CardRarity.MEGA_ATTAQUE_RARE,
  CardRarity.ACE_SPEC_RARE,
  CardRarity.PROMO,
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeNumber(n: string): string {
  return n.replace(/^([A-Z]*)0+(\d+)$/, "$1$2");
}

interface PTCGCard { number: string; rarity?: string }
interface PTCGResponse { data: PTCGCard[]; totalCount: number; count: number }

async function fetchPTCGRarities(setId: string): Promise<Map<string, CardRarity>> {
  const map = new Map<string, CardRarity>();
  let page = 1;

  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&select=number,name,rarity`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      console.warn(`  ⚠ PTCG set ${setId} → HTTP ${res.status}`);
      break;
    }
    const json = (await res.json()) as PTCGResponse;
    for (const card of json.data) {
      if (!card.rarity) continue;
      const mapped = PTCG_RARITY_MAP[card.rarity];
      if (!mapped) {
        console.warn(`  ⚠ Rareté inconnue: "${card.rarity}" pour carte ${card.number}`);
        continue;
      }
      map.set(card.number, mapped);
      map.set(normalizeNumber(card.number), mapped);
    }
    if (map.size >= json.totalCount || json.count < 250) break;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }

  return map;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(dryRun: boolean) {
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  let totalUpdated = 0;

  for (const { slug, ptcgId } of ME_SETS) {
    const serie = await prisma.serie.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!serie) {
      console.warn(`⚠ Série "${slug}" absente de la DB`);
      continue;
    }

    process.stdout.write(`📦 ${ptcgId.padEnd(10)} → ${slug.padEnd(35)}`);

    const rarityMap = await fetchPTCGRarities(ptcgId);
    if (rarityMap.size === 0) {
      console.log("aucune rareté trouvée");
      continue;
    }

    const dbCards = await prisma.card.findMany({
      where: { serieId: serie.id },
      select: { id: true, number: true, name: true, rarity: true },
    });

    let updated = 0;
    let unchanged = 0;
    const rarityCounts = new Map<string, number>();

    for (const card of dbCards) {
      const newRarity = rarityMap.get(card.number) ?? rarityMap.get(normalizeNumber(card.number));
      if (!newRarity) continue;

      rarityCounts.set(newRarity, (rarityCounts.get(newRarity) ?? 0) + 1);

      if (card.rarity === newRarity) {
        unchanged++;
        continue;
      }

      if (!dryRun) {
        await prisma.card.update({
          where: { id: card.id },
          data: { rarity: newRarity, isSpecial: SPECIAL_RARITIES.has(newRarity) },
        });
      }
      updated++;
    }

    console.log(`${updated} mises à jour, ${unchanged} inchangées (${dbCards.length} total)`);

    // Distribution
    const sorted = [...rarityCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [r, c] of sorted) {
      console.log(`    ${r.padEnd(28)} ${c}`);
    }

    totalUpdated += updated;
  }

  console.log(`\n✅ Terminé — ${totalUpdated} cartes mises à jour`);
  if (dryRun) console.log("(dry-run : rien n'a été écrit en DB)");
}

const dryRun = process.argv.includes("--dry-run");
main(dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
