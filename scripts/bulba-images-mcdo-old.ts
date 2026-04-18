/**
 * Remplace les images Pokellector (watermarkées) des séries McDonald's
 * 2013/2014/2015/2017 par des scans Bulbapedia (clean, pas de watermark).
 *
 * Les séries 2018 et 2019 utilisent déjà des sources sans watermark
 * (Bulbapedia et Pokellector MCD9FR respectivement).
 *
 * Contenu DB déjà correct pour ces 4 séries — on update uniquement `imageUrl`.
 *
 * Scraping Bulbapedia :
 *   https://bulbapedia.bulbagarden.net/wiki/{EnName}_(McDonald%27s_Collection_{YEAR}_{N})
 * On extrait le JPG `archives.bulbagarden.net/...` dont le nom de fichier
 * commence par le nom anglais normalisé (ex. `PansageBurningShadows12.jpg`).
 *
 * Flags :
 *   --yes : exécute le transaction apply (sinon dry-run)
 *
 * Usage :
 *   npx tsx scripts/bulba-images-mcdo-old.ts       # dry-run
 *   npx tsx scripts/bulba-images-mcdo-old.ts --yes # apply
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const BACKUP_DIR = "backups";

type YearPlan = { year: number; serieSlug: string; cards: { num: number; nameEn: string }[] };

const PLANS: YearPlan[] = [
  {
    year: 2013,
    serieSlug: "promo-mcdo-2013",
    cards: [
      { num:  1, nameEn: "Leafeon"  },
      { num:  2, nameEn: "Flareon"  },
      { num:  3, nameEn: "Vaporeon" },
      { num:  4, nameEn: "Glaceon"  },
      { num:  5, nameEn: "Pikachu"  },
      { num:  6, nameEn: "Jolteon"  },
      { num:  7, nameEn: "Espeon"   },
      { num:  8, nameEn: "Timburr"  },
      { num:  9, nameEn: "Umbreon"  },
      { num: 10, nameEn: "Scraggy"  },
      { num: 11, nameEn: "Zorua"    },
      { num: 12, nameEn: "Eevee"    },
    ],
  },
  {
    year: 2014,
    serieSlug: "promo-mcdo-2014",
    cards: [
      { num:  1, nameEn: "Weedle"     },
      { num:  2, nameEn: "Chespin"    },
      { num:  3, nameEn: "Fennekin"   },
      { num:  4, nameEn: "Froakie"    },
      { num:  5, nameEn: "Pikachu"    },
      { num:  6, nameEn: "Inkay"      },
      { num:  7, nameEn: "Honedge"    },
      { num:  8, nameEn: "Snubbull"   },
      { num:  9, nameEn: "Swirlix"    },
      { num: 10, nameEn: "Bunnelby"   },
      { num: 11, nameEn: "Fletchling" },
      { num: 12, nameEn: "Furfrou"    },
    ],
  },
  {
    year: 2015,
    serieSlug: "promo-mcdo-2015",
    cards: [
      { num:  1, nameEn: "Treecko"   },
      { num:  2, nameEn: "Lotad"     },
      { num:  3, nameEn: "Torchic"   },
      { num:  4, nameEn: "Staryu"    },
      { num:  5, nameEn: "Mudkip"    },
      { num:  6, nameEn: "Pikachu"   },
      { num:  7, nameEn: "Electrike" },
      { num:  8, nameEn: "Rhyhorn"   },
      { num:  9, nameEn: "Meditite"  },
      { num: 10, nameEn: "Marill"    },
      { num: 11, nameEn: "Zigzagoon" },
      { num: 12, nameEn: "Skitty"    },
    ],
  },
  {
    year: 2017,
    serieSlug: "promo-mcdo-2017",
    cards: [
      { num:  1, nameEn: "Rowlet"          },
      { num:  2, nameEn: "Grubbin"         },
      { num:  3, nameEn: "Litten"          },
      { num:  4, nameEn: "Popplio"         },
      { num:  5, nameEn: "Pikachu"         },
      { num:  6, nameEn: "Cosmog"          },
      { num:  7, nameEn: "Crabrawler"      },
      { num:  8, nameEn: "Alolan Meowth"   },
      { num:  9, nameEn: "Alolan Diglett"  },
      { num: 10, nameEn: "Cutiefly"        },
      { num: 11, nameEn: "Pikipek"         },
      { num: 12, nameEn: "Yungoos"         },
    ],
  },
];

function bulbaPageUrl(nameEn: string, year: number, num: number): string {
  const slug = nameEn.replace(/ /g, "_");
  // 2014 est le "default" McDonald's Collection sur Bulbapedia : pas de year
  // dans l'URL. Les autres années l'incluent.
  const bucket = year === 2014 ? "" : `${year}_`;
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(slug)}_(McDonald%27s_Collection_${bucket}${num})`;
}

async function scrapeBulbaCardImage(nameEn: string, year: number, num: number): Promise<string | null> {
  const url = bulbaPageUrl(nameEn, year, num);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 pokeitem/1.0" } });
  if (!res.ok) {
    console.warn(`⚠️  ${year}#${num} ${nameEn} → HTTP ${res.status}`);
    return null;
  }
  const html = await res.text();
  const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const needle = normalize(nameEn);
  const all = Array.from(
    html.matchAll(/archives\.bulbagarden\.net\/media\/upload\/[a-z0-9]\/[a-z0-9]+\/([^"' ]+\.jpg)/g),
  );
  for (const m of all) {
    if (normalize(m[1]).startsWith(needle)) return `https://${m[0]}`;
  }
  console.warn(`⚠️  ${year}#${num} ${nameEn} : pas d'image trouvée`);
  return null;
}

async function main() {
  const yes = process.argv.includes("--yes");

  type Update = { cardId: string; serieSlug: string; number: string; nameFr: string; currentUrl: string | null; newUrl: string };
  const updates: Update[] = [];
  const misses: string[] = [];

  for (const plan of PLANS) {
    console.log(`── ${plan.serieSlug} : scraping ${plan.cards.length} pages Bulbapedia…`);
    const serie = await prisma.serie.findUnique({
      where: { slug: plan.serieSlug },
      select: { cards: { orderBy: { number: "asc" }, select: { id: true, number: true, name: true, imageUrl: true } } },
    });
    if (!serie) { misses.push(`${plan.serieSlug} introuvable`); continue; }

    const byNum = new Map(serie.cards.map((c) => [parseInt(c.number, 10), c]));

    for (const pc of plan.cards) {
      const dbCard = byNum.get(pc.num);
      if (!dbCard) { misses.push(`${plan.serieSlug} #${pc.num} absent en DB`); continue; }
      const img = await scrapeBulbaCardImage(pc.nameEn, plan.year, pc.num);
      if (!img) { misses.push(`${plan.serieSlug} #${pc.num} ${pc.nameEn} : scrape raté`); continue; }
      if (dbCard.imageUrl === img) continue;
      updates.push({
        cardId:     dbCard.id,
        serieSlug:  plan.serieSlug,
        number:     dbCard.number,
        nameFr:     dbCard.name,
        currentUrl: dbCard.imageUrl,
        newUrl:     img,
      });
      await new Promise((r) => setTimeout(r, 150));
    }
    const count = updates.filter((u) => u.serieSlug === plan.serieSlug).length;
    console.log(`   ${count}/${plan.cards.length} updates prêtes`);
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Total updates : ${updates.length}`);
  if (misses.length) {
    console.log(`\n⚠️  ${misses.length} miss(es) :`);
    for (const m of misses) console.log(`   - ${m}`);
  }
  console.log(`\n── Échantillons ──`);
  for (const u of updates.slice(0, 4)) {
    console.log(`  ${u.serieSlug} #${u.number} ${u.nameFr}`);
    console.log(`    was: ${u.currentUrl}`);
    console.log(`    new: ${u.newUrl}`);
  }

  if (!yes) {
    console.log(`\nRelance avec --yes pour exécuter.`);
    await prisma.$disconnect();
    return;
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `mcdo-old-bulba-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(updates.map((u) => ({ id: u.cardId, imageUrl: u.currentUrl })), null, 2));
  console.log(`\n💾 Backup : ${backupPath}`);

  // ── Apply ─────────────────────────────────────────────────────────────────
  console.log(`\n🚀 Apply ${updates.length} updates…`);
  const result = await prisma.$transaction(
    updates.map((u) => prisma.card.update({ where: { id: u.cardId }, data: { imageUrl: u.newUrl } })),
    { timeout: 60_000 },
  );
  console.log(`✅ ${result.length} lignes mises à jour.`);

  // Re-verify
  console.log(`\n🔍 Sample checks :`);
  for (const u of updates.slice(0, 4)) {
    const c = await prisma.card.findUnique({ where: { id: u.cardId }, select: { imageUrl: true } });
    console.log(`   ${c?.imageUrl === u.newUrl ? "✓" : "✗"} ${u.serieSlug} #${u.number} → …${c?.imageUrl?.slice(-45)}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
