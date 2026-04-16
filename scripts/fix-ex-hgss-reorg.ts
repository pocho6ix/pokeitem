/**
 * fix-ex-hgss-reorg.ts
 *
 * 1. Rename "Groudon vs Kyogre" → "Team Magma vs Team Aqua"
 *    (slug: groudon-vs-kyogre → team-magma-vs-team-aqua)
 *
 * 2. Move "L'Appel des Légendes" from the standalone "appel-des-legendes" bloc
 *    into the "heartgold-soulsilver" bloc (as last extension, order=4)
 *
 * 3. Update order fields for all EX series to match new PokéCardex order
 *
 * 4. Delete the now-empty "appel-des-legendes" bloc from the DB
 */

import { prisma } from "@/lib/prisma";

async function main() {
  // ── 1. Rename groudon-vs-kyogre ──────────────────────────────────────────
  const renamed = await prisma.serie.update({
    where: { slug: "groudon-vs-kyogre" },
    data: {
      name:     "Team Magma vs Team Aqua",
      nameEn:   "Team Magma vs Team Aqua",
      slug:     "team-magma-vs-team-aqua",
    },
  });
  console.log(`✅ Renamed: ${renamed.name} (${renamed.slug})`);

  // ── 2. Move "L'Appel des Légendes" to HGSS bloc ──────────────────────────
  const hgssBloc = await prisma.bloc.findUniqueOrThrow({ where: { slug: "heartgold-soulsilver" } });

  const moved = await prisma.serie.update({
    where: { slug: "appel-des-legendes" },
    data: {
      blocId: hgssBloc.id,
      order:  4,
    },
  });
  console.log(`✅ Moved: ${moved.name} → bloc heartgold-soulsilver (order 4)`);

  // ── 3. Update EX series order to match PokéCardex order ──────────────────
  const exOrders: Record<string, number> = {
    "gardiens-du-pouvoir":   0,
    "gardiens-de-cristal":   1,
    "fantomes-holon":        2,
    "createurs-de-legendes": 3,
    "especes-delta":         4,
    "forces-cachees":        5,
    "emeraude":              6,
    "deoxys":                7,
    "team-rocket-returns":   8,
    "fire-red-leaf-green":   9,
    "legendes-oubliees":     10,
    "team-magma-vs-team-aqua": 11, // renamed above
    "dragon-ex":             12,
    "tempete-de-sable":      13,
    "rubis-et-saphir":       14,
    "promos-nintendo":       20,
  };

  for (const [slug, order] of Object.entries(exOrders)) {
    try {
      await prisma.serie.update({ where: { slug }, data: { order } });
      console.log(`  ✓ EX order updated: ${slug} → ${order}`);
    } catch {
      console.warn(`  ⚠ Serie not found: ${slug}`);
    }
  }

  // ── 4. Update HGSS bloc endDate and orders ────────────────────────────────
  await prisma.bloc.update({
    where: { slug: "heartgold-soulsilver" },
    data: { endDate: new Date("2011-06-30") },
  });
  console.log("✅ Updated HGSS bloc endDate to 2011-06-30");

  // ── 5. Delete the now-empty "appel-des-legendes" bloc ────────────────────
  try {
    await prisma.bloc.delete({ where: { slug: "appel-des-legendes" } });
    console.log("✅ Deleted standalone bloc: appel-des-legendes");
  } catch (e) {
    console.warn("⚠ Could not delete appel-des-legendes bloc (may have other references):", e);
  }

  console.log("\n🎉 Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
