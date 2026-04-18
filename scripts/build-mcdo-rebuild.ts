/**
 * Construction du plan de réparation COMPLET des 6 séries McDonald's.
 *
 * Contexte (audit complet fait séparément) :
 *   - promo-mcdo-2013 : DB a du faux contenu (Évoli/Nymphali/Mewtwo/Genesect)
 *                        pulled d'une entrée TCGdex `2013bw` incorrecte.
 *                        Vrai contenu = Leafeon→Eevee (12 cartes, Pokellector `MCD`).
 *                        → REBUILD complet.
 *   - promo-mcdo-2014 : contenu DB correct (Weedle→Furfrou FR), images 404.
 *                        → UPDATE imageUrl via Pokellector `MCD4`.
 *   - promo-mcdo-2015 : contenu DB correct, images 404.
 *                        → UPDATE imageUrl via Pokellector `MCD5`.
 *   - promo-mcdo-2017 : contenu DB correct, images 404.
 *                        → UPDATE imageUrl via Pokellector `MCD7`.
 *   - promo-mcdo-2018 : DB a le CONTENU DE 2019 (Bulbizarre→Nymphali 40 cartes).
 *                        Vrai contenu = Pansage→Stufful (40 cartes FR-exclusif).
 *                        Pokellector n'a pas ce set → images via Bulbapedia (base
 *                        expansion scans, sans stamp McDo — acceptable pour nous).
 *                        → REBUILD complet.
 *   - promo-mcdo-2019 : contenu DB correct (Bulbizarre→Nymphali 40 cartes).
 *                        → UPDATE imageUrl via Pokellector `MCD9FR`.
 *
 * Zéro dépendance utilisateur sur ces 6 séries (userCards=0, wishlist=0).
 * priceHistory=36 pour 2014/2015/2017 (conservé — on update, pas delete).
 *
 * Output : .dry-run-mcdo-rebuild.json
 *   {
 *     updates: [{ serieSlug, number, cardId, currentUrl, newUrl }],
 *     rebuilds: [{
 *       serieSlug,
 *       deleteCardIds: string[],
 *       createCards: [{ number, nameFr, nameEn, imageUrl, cardmarketUrl: null }]
 *     }]
 *   }
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// ── Séries à REBUILD (contenu DB faux) ─────────────────────────────────────
// Name mappings FR ← EN (from Bulbapedia card lists, manually curated).

const REBUILD_2013: { num: number; nameEn: string; nameFr: string }[] = [
  { num:  1, nameEn: "Leafeon",  nameFr: "Phyllali"   },
  { num:  2, nameEn: "Flareon",  nameFr: "Pyroli"     },
  { num:  3, nameEn: "Vaporeon", nameFr: "Aquali"     },
  { num:  4, nameEn: "Glaceon",  nameFr: "Givrali"    },
  { num:  5, nameEn: "Pikachu",  nameFr: "Pikachu"    },
  { num:  6, nameEn: "Jolteon",  nameFr: "Voltali"    },
  { num:  7, nameEn: "Espeon",   nameFr: "Mentali"    },
  { num:  8, nameEn: "Timburr",  nameFr: "Charpenti"  },
  { num:  9, nameEn: "Umbreon",  nameFr: "Noctali"    },
  { num: 10, nameEn: "Scraggy",  nameFr: "Baggiguane" },
  { num: 11, nameEn: "Zorua",    nameFr: "Zorua"      },
  { num: 12, nameEn: "Eevee",    nameFr: "Évoli"      },
];

const REBUILD_2018: { num: number; nameEn: string; nameFr: string }[] = [
  { num:  1, nameEn: "Pansage",          nameFr: "Feuillajou"         },
  { num:  2, nameEn: "Bounsweet",        nameFr: "Croquine"           },
  { num:  3, nameEn: "Wimpod",           nameFr: "Sovkipou"           },
  { num:  4, nameEn: "Charmander",       nameFr: "Salamèche"          },
  { num:  5, nameEn: "Growlithe",        nameFr: "Caninos"            },
  { num:  6, nameEn: "Torkoal",          nameFr: "Chartor"            },
  { num:  7, nameEn: "Pansear",          nameFr: "Flamajou"           },
  { num:  8, nameEn: "Alolan Sandshrew", nameFr: "Sabelette d'Alola"  },
  { num:  9, nameEn: "Alolan Vulpix",    nameFr: "Goupix d'Alola"     },
  { num: 10, nameEn: "Psyduck",          nameFr: "Psykokwak"          },
  { num: 11, nameEn: "Poliwag",          nameFr: "Ptitard"            },
  { num: 12, nameEn: "Delibird",         nameFr: "Cadoizo"            },
  { num: 13, nameEn: "Wingull",          nameFr: "Goélise"            },
  { num: 14, nameEn: "Wailmer",          nameFr: "Wailmer"            },
  { num: 15, nameEn: "Panpour",          nameFr: "Flotajou"           },
  { num: 16, nameEn: "Wishiwashi",       nameFr: "Froussardine"       },
  { num: 17, nameEn: "Pikachu",          nameFr: "Pikachu"            },
  { num: 18, nameEn: "Alolan Geodude",   nameFr: "Racaillou d'Alola"  },
  { num: 19, nameEn: "Chinchou",         nameFr: "Loupio"             },
  { num: 20, nameEn: "Togedemaru",       nameFr: "Togedemaru"         },
  { num: 21, nameEn: "Slowpoke",         nameFr: "Ramoloss"           },
  { num: 22, nameEn: "Machop",           nameFr: "Machoc"             },
  { num: 23, nameEn: "Makuhita",         nameFr: "Makuhita"           },
  { num: 24, nameEn: "Riolu",            nameFr: "Riolu"              },
  { num: 25, nameEn: "Rockruff",         nameFr: "Rocabot"            },
  { num: 26, nameEn: "Mudbray",          nameFr: "Tiboudet"           },
  { num: 27, nameEn: "Murkrow",          nameFr: "Cornèbre"           },
  { num: 28, nameEn: "Sneasel",          nameFr: "Farfuret"           },
  { num: 29, nameEn: "Skarmory",         nameFr: "Airmure"            },
  { num: 30, nameEn: "Clefairy",         nameFr: "Mélofée"            },
  { num: 31, nameEn: "Ralts",            nameFr: "Tarsal"             },
  { num: 32, nameEn: "Dratini",          nameFr: "Minidraco"          },
  { num: 33, nameEn: "Goomy",            nameFr: "Mucuscule"          },
  { num: 34, nameEn: "Jangmo-o",         nameFr: "Bébécaille"         },
  { num: 35, nameEn: "Meowth",           nameFr: "Miaouss"            },
  { num: 36, nameEn: "Chansey",          nameFr: "Leveinard"          },
  { num: 37, nameEn: "Eevee",            nameFr: "Évoli"              },
  { num: 38, nameEn: "Lillipup",         nameFr: "Ponchiot"           },
  { num: 39, nameEn: "Fletchling",       nameFr: "Passerouge"         },
  { num: 40, nameEn: "Stufful",          nameFr: "Nounourson"         },
];

const REBUILD_2019: { num: number; nameEn: string; nameFr: string }[] = [
  { num:  1, nameEn: "Bulbasaur",        nameFr: "Bulbizarre"            },
  { num:  2, nameEn: "Caterpie",         nameFr: "Chenipan"              },
  { num:  3, nameEn: "Paras",            nameFr: "Paras"                 },
  { num:  4, nameEn: "Bellsprout",       nameFr: "Chétiflor"             },
  { num:  5, nameEn: "Alolan Exeggutor", nameFr: "Noadkoko d'Alola"      },
  { num:  6, nameEn: "Tangela",          nameFr: "Saquedeneu"            },
  { num:  7, nameEn: "Scyther",          nameFr: "Insécateur"            },
  { num:  8, nameEn: "Pinsir",           nameFr: "Scarabrute"            },
  { num:  9, nameEn: "Charmander",       nameFr: "Salamèche"             },
  { num: 10, nameEn: "Magmar",           nameFr: "Magmar"                },
  { num: 11, nameEn: "Moltres",          nameFr: "Sulfura"               },
  { num: 12, nameEn: "Alolan Sandshrew", nameFr: "Sabelette d'Alola"     },
  { num: 13, nameEn: "Alolan Vulpix",    nameFr: "Goupix d'Alola"        },
  { num: 14, nameEn: "Slowpoke",         nameFr: "Ramoloss"              },
  { num: 15, nameEn: "Horsea",           nameFr: "Hypotrempe"            },
  { num: 16, nameEn: "Staryu",           nameFr: "Stari"                 },
  { num: 17, nameEn: "Magikarp",         nameFr: "Magicarpe"             },
  { num: 18, nameEn: "Lapras",           nameFr: "Lokhlass"              },
  { num: 19, nameEn: "Articuno",         nameFr: "Artikodin"             },
  { num: 20, nameEn: "Pikachu",          nameFr: "Pikachu"               },
  { num: 21, nameEn: "Alolan Raichu",    nameFr: "Raichu d'Alola"        },
  { num: 22, nameEn: "Alolan Geodude",   nameFr: "Racaillou d'Alola"     },
  { num: 23, nameEn: "Magnemite",        nameFr: "Magnéti"               },
  { num: 24, nameEn: "Voltorb",          nameFr: "Voltorbe"              },
  { num: 25, nameEn: "Electabuzz",       nameFr: "Élektek"               },
  { num: 26, nameEn: "Zapdos",           nameFr: "Électhor"              },
  { num: 27, nameEn: "Gastly",           nameFr: "Fantominus"            },
  { num: 28, nameEn: "Mankey",           nameFr: "Férosinge"             },
  { num: 29, nameEn: "Onix",             nameFr: "Onix"                  },
  { num: 30, nameEn: "Cubone",           nameFr: "Osselait"              },
  { num: 31, nameEn: "Rhyhorn",          nameFr: "Rhinocorne"            },
  { num: 32, nameEn: "Alolan Meowth",    nameFr: "Miaouss d'Alola"       },
  { num: 33, nameEn: "Alolan Diglett",   nameFr: "Taupiqueur d'Alola"    },
  { num: 34, nameEn: "Alolan Dugtrio",   nameFr: "Triopikeur d'Alola"    },
  { num: 35, nameEn: "Jigglypuff",       nameFr: "Rondoudou"             },
  { num: 36, nameEn: "Dratini",          nameFr: "Minidraco"             },
  { num: 37, nameEn: "Lickitung",        nameFr: "Excelangue"            },
  { num: 38, nameEn: "Chansey",          nameFr: "Leveinard"             },
  { num: 39, nameEn: "Kangaskhan",       nameFr: "Kangourex"             },
  { num: 40, nameEn: "Eevee",            nameFr: "Évoli"                 },
];

// ── Pokellector scraper (2014, 2015, 2017 — contenu DB OK, juste images) ──

type PokellectorSet = { serieSlug: string; url: string; expectedCards: number };

const POKELLECTOR_UPDATES: PokellectorSet[] = [
  { serieSlug: "promo-mcdo-2014", url: "https://www.pokellector.com/McDonalds-Collection-2014-Expansion/", expectedCards: 12 },
  { serieSlug: "promo-mcdo-2015", url: "https://www.pokellector.com/McDonalds-Collection-2015-Expansion/", expectedCards: 12 },
  { serieSlug: "promo-mcdo-2017", url: "https://www.pokellector.com/McDonalds-Collection-2017-Expansion/", expectedCards: 12 },
];

const POKELLECTOR_2013_URL = "https://www.pokellector.com/McDonalds-Collection-2013-Expansion/";
const POKELLECTOR_2019_URL = "https://www.pokellector.com/McDonalds-Collection-2019-FR-Expansion/";

async function scrapePokellectorSet(setUrl: string): Promise<Map<number, string>> {
  const res = await fetch(setUrl, { headers: { "User-Agent": "Mozilla/5.0 pokeitem/1.0" } });
  if (!res.ok) throw new Error(`${setUrl} → HTTP ${res.status}`);
  const html = await res.text();
  // Variants :
  //   New : ...{Name}.{CODE}.{N}.{hash}.thumb.png
  //   Old : ...{Name}.{CODE}.{N}.thumb.png
  const matches = html.matchAll(
    /(https?:\/\/den-cards\.pokellector\.com\/\d+\/[^"']+?\.([A-Z0-9]+)\.(\d+)(?:\.\d+)?)\.thumb\.png/g,
  );
  const byNum = new Map<number, string>();
  for (const m of matches) {
    const full = `${m[1]}.png`;
    const num  = parseInt(m[3], 10);
    if (!byNum.has(num)) byNum.set(num, full);
  }
  return byNum;
}

// ── Bulbapedia scraper (2018 FR) ───────────────────────────────────────────
// On fetch chaque page individuelle `/wiki/{Name}_(McDonald's_Collection_2018_{N})`
// et on extrait la 1re image JPG du card box (pattern `{Name}{BaseExp}{N}.jpg`).

function bulbaPageUrl(nameEn: string, num: number): string {
  const slug = nameEn.replace(/ /g, "_"); // "Alolan Sandshrew" → "Alolan_Sandshrew"
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(slug)}_(McDonald%27s_Collection_2018_${num})`;
}

async function scrapeBulbaCardImage(nameEn: string, num: number): Promise<string | null> {
  const url = bulbaPageUrl(nameEn, num);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 pokeitem/1.0" } });
  if (!res.ok) {
    console.warn(`⚠️  Bulba ${nameEn} #${num} → HTTP ${res.status}`);
    return null;
  }
  const html = await res.text();
  // Extract all archives.bulbagarden.net JPG URLs, pick the first one whose
  // leading name (after stripping non-alphanum) matches the card name.
  // Exemples: "PansageBurningShadows12.jpg", "Jangmo-oSMPromo45.jpg",
  //           "Alolan_SandshrewTeamUp35.jpg"
  const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const needle = normalize(nameEn);
  const all = Array.from(
    html.matchAll(/archives\.bulbagarden\.net\/media\/upload\/[a-z0-9]\/[a-z0-9]+\/([^"' ]+\.jpg)/g),
  );
  for (const m of all) {
    const fname = m[1];                        // ex : Jangmo-oSMPromo45.jpg
    if (normalize(fname).startsWith(needle)) {
      return `https://${m[0]}`;                // URL full archive
    }
  }
  console.warn(`⚠️  Bulba ${nameEn} #${num} : pas d'image trouvée`);
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────

type Update  = { serieSlug: string; number: string; cardId: string; currentUrl: string | null; newUrl: string };
type Rebuild = {
  serieSlug: string;
  deleteCardIds: string[];
  createCards: { number: string; nameFr: string; nameEn: string; imageUrl: string | null; cardmarketUrl: null }[];
};

async function main() {
  const updates:  Update[]  = [];
  const rebuilds: Rebuild[] = [];
  const issues:   string[]  = [];

  // ── 1. Updates Pokellector (2014, 2015, 2017 — contenu DB OK) ────────────
  for (const cfg of POKELLECTOR_UPDATES) {
    const imgByNum = await scrapePokellectorSet(cfg.url);
    if (imgByNum.size !== cfg.expectedCards) {
      issues.push(`Pokellector ${cfg.serieSlug} : ${imgByNum.size} URLs scrapés, attendu ${cfg.expectedCards}`);
    }
    const serie = await prisma.serie.findUnique({
      where: { slug: cfg.serieSlug },
      select: { cards: { orderBy: { number: "asc" }, select: { id: true, number: true, imageUrl: true } } },
    });
    if (!serie) { issues.push(`${cfg.serieSlug} introuvable`); continue; }

    let count = 0;
    for (const c of serie.cards) {
      const numInt = parseInt(c.number.replace(/^0+/, "") || "0", 10);
      const newUrl = imgByNum.get(numInt);
      if (!newUrl) {
        issues.push(`${cfg.serieSlug} #${c.number} : aucune URL Pokellector`);
        continue;
      }
      if (c.imageUrl === newUrl) continue;
      updates.push({ serieSlug: cfg.serieSlug, number: c.number, cardId: c.id, currentUrl: c.imageUrl, newUrl });
      count++;
    }
    console.log(`── ${cfg.serieSlug} : ${imgByNum.size} URLs Pokellector → ${count} updates`);
  }

  // ── 2. Rebuild 2013 (contenu Pokellector MCD) ────────────────────────────
  {
    const imgByNum = await scrapePokellectorSet(POKELLECTOR_2013_URL);
    const serie = await prisma.serie.findUnique({
      where: { slug: "promo-mcdo-2013" },
      select: { cards: { select: { id: true } } },
    });
    if (!serie) { issues.push("promo-mcdo-2013 introuvable"); }
    else {
      const createCards = REBUILD_2013.map((c) => ({
        number:        String(c.num),
        nameFr:        c.nameFr,
        nameEn:        c.nameEn,
        imageUrl:      imgByNum.get(c.num) ?? null,
        cardmarketUrl: null as null,
      }));
      const missing = createCards.filter((c) => !c.imageUrl).map((c) => `#${c.number} ${c.nameEn}`);
      if (missing.length) issues.push(`2013 : images Pokellector manquantes : ${missing.join(", ")}`);
      rebuilds.push({
        serieSlug:     "promo-mcdo-2013",
        deleteCardIds: serie.cards.map((c) => c.id),
        createCards,
      });
      console.log(`── promo-mcdo-2013 : rebuild ${serie.cards.length} → ${createCards.length} (${createCards.filter(c=>c.imageUrl).length} images OK)`);
    }
  }

  // ── 3. Rebuild 2018 (contenu Bulbapedia FR) ──────────────────────────────
  {
    const serie = await prisma.serie.findUnique({
      where: { slug: "promo-mcdo-2018" },
      select: { cards: { select: { id: true } } },
    });
    if (!serie) { issues.push("promo-mcdo-2018 introuvable"); }
    else {
      console.log(`── promo-mcdo-2018 : scraping Bulbapedia (40 pages)…`);
      const createCards: Rebuild["createCards"] = [];
      for (const c of REBUILD_2018) {
        const img = await scrapeBulbaCardImage(c.nameEn, c.num);
        createCards.push({
          number:        String(c.num),
          nameFr:        c.nameFr,
          nameEn:        c.nameEn,
          imageUrl:      img,
          cardmarketUrl: null,
        });
        // Petit throttle pour ne pas spammer Bulbapedia
        await new Promise((r) => setTimeout(r, 150));
      }
      const missing = createCards.filter((c) => !c.imageUrl).map((c) => `#${c.number} ${c.nameEn}`);
      if (missing.length) issues.push(`2018 : images Bulbapedia manquantes : ${missing.join(", ")}`);
      rebuilds.push({
        serieSlug:     "promo-mcdo-2018",
        deleteCardIds: serie.cards.map((c) => c.id),
        createCards,
      });
      console.log(`── promo-mcdo-2018 : rebuild ${serie.cards.length} → ${createCards.length} (${createCards.filter(c=>c.imageUrl).length}/40 images OK)`);
    }
  }

  // ── 4. Rebuild 2019 (contenu Pokellector MCD9FR) ─────────────────────────
  {
    const imgByNum = await scrapePokellectorSet(POKELLECTOR_2019_URL);
    const serie = await prisma.serie.findUnique({
      where: { slug: "promo-mcdo-2019" },
      select: { cards: { select: { id: true } } },
    });
    if (!serie) { issues.push("promo-mcdo-2019 introuvable"); }
    else {
      const createCards = REBUILD_2019.map((c) => ({
        number:        String(c.num),
        nameFr:        c.nameFr,
        nameEn:        c.nameEn,
        imageUrl:      imgByNum.get(c.num) ?? null,
        cardmarketUrl: null as null,
      }));
      const missing = createCards.filter((c) => !c.imageUrl).map((c) => `#${c.number} ${c.nameEn}`);
      if (missing.length) issues.push(`2019 : images Pokellector manquantes : ${missing.join(", ")}`);
      rebuilds.push({
        serieSlug:     "promo-mcdo-2019",
        deleteCardIds: serie.cards.map((c) => c.id),
        createCards,
      });
      console.log(`── promo-mcdo-2019 : rebuild ${serie.cards.length} → ${createCards.length} (${createCards.filter(c=>c.imageUrl).length}/40 images OK)`);
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const payload = { updates, rebuilds, issues };
  writeFileSync(".dry-run-mcdo-rebuild.json", JSON.stringify(payload, null, 2));

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Updates (image URL)  : ${updates.length}`);
  console.log(`Rebuilds (delete+create) : ${rebuilds.length}`);
  for (const r of rebuilds) {
    console.log(`  • ${r.serieSlug} : -${r.deleteCardIds.length} cartes / +${r.createCards.length} cartes`);
  }
  if (issues.length) {
    console.log(`\n⚠️  ${issues.length} issue(s) :`);
    for (const i of issues) console.log(`  - ${i}`);
  }
  console.log(`\n✅  .dry-run-mcdo-rebuild.json écrit`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
