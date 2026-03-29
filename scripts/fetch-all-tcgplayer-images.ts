/**
 * fetch-all-tcgplayer-images.ts
 *
 * Scrape ALL sealed product images from TCGPlayer for every series.
 * Uses TCGPlayer's search API to find products, then downloads images
 * from their public S3 bucket (no anti-bot).
 *
 * Usage: PATH="/opt/homebrew/bin:$PATH" npx tsx scripts/fetch-all-tcgplayer-images.ts
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "items");
const DELAY_MS = 3000;
const MAX_RETRIES = 3;

// ─── Mapping slug série PokeItem → TCGPlayer setName filter ─────
// TCGPlayer uses English set names with specific slugs
// Use DISPLAY names (the "value" field from aggregations), not urlValue
const SERIE_TO_TCGPLAYER: Record<string, string[]> = {
  // Méga-Évolution
  "equilibre-parfait": ["ME03: Perfect Order"],
  "heros-transcendants": ["ME: Ascended Heroes"],
  "flammes-fantasmagoriques": ["ME02: Phantasmal Flames"],
  "mega-evolution": ["ME01: Mega Evolution"],

  // Écarlate & Violet
  "foudre-noire-flamme-blanche": ["SV: Black Bolt", "SV: White Flare"],
  "rivalites-destinees": ["SV10: Destined Rivals"],
  "aventures-ensemble": ["SV09: Journey Together"],
  "evolutions-prismatiques": ["SV: Prismatic Evolutions"],
  "etincelles-deferlantes": ["SV08: Surging Sparks"],
  "couronne-stellaire": ["SV07: Stellar Crown"],
  "fable-nebuleuse": ["SV: Shrouded Fable"],
  "mascarade-crepusculaire": ["SV06: Twilight Masquerade"],
  "forces-temporelles": ["SV05: Temporal Forces"],
  "destinees-de-paldea": ["SV: Paldean Fates"],
  "faille-paradoxe": ["SV04: Paradox Rift"],
  "pokemon-151": ["SV: Scarlet and Violet 151"],
  "flammes-obsidiennes": ["SV03: Obsidian Flames"],
  "evolutions-a-paldea": ["SV02: Paldea Evolved"],
  "ecarlate-et-violet": ["SV01: Scarlet & Violet Base Set"],

  // Épée & Bouclier
  "zenith-supreme": ["Crown Zenith"],
  "tempete-argentee": ["SWSH12: Silver Tempest"],
  "origine-perdue": ["SWSH11: Lost Origin"],
  "pokemon-go": ["Pokemon GO"],
  "astres-radieux": ["SWSH10: Astral Radiance"],
  "brillantes-etoiles": ["SWSH09: Brilliant Stars"],
  "stars-etincelantes": ["Shining Fates"],
  "poing-de-fusion": ["SWSH08: Fusion Strike"],
  "evolution-celeste": ["SWSH07: Evolving Skies"],
  "regne-de-glace": ["SWSH06: Chilling Reign"],
  "styles-de-combat": ["SWSH05: Battle Styles"],
  "destinees-radieuses": ["Shining Fates"],
  "voltage-eclatant": ["SWSH04: Vivid Voltage"],
  "la-voie-du-maitre": ["Champion's Path"],
  "tenebres-embrasees": ["SWSH03: Darkness Ablaze"],
  "clash-des-rebelles": ["SWSH02: Rebel Clash"],
  "epee-et-bouclier": ["SWSH01: Sword & Shield Base Set"],
  "celebrations": ["Celebrations"],

  // Soleil & Lune
  "destinees-occultes": ["Hidden Fates"],
  "eclipse-cosmique": ["SM - Cosmic Eclipse"],
  "harmonie-des-esprits": ["SM - Unified Minds"],
  "alliance-infaillible": ["SM - Unbroken Bonds"],
  "duo-de-choc": ["SM - Team Up"],
  "tonnerre-perdu": ["SM - Lost Thunder"],
  "majeste-des-dragons": ["Dragon Majesty"],
  "tempete-celeste": ["SM - Celestial Storm"],
  "lumiere-interdite": ["SM - Forbidden Light"],
  "ultra-prisme": ["SM - Ultra Prism"],
  "invasion-carmin": ["SM - Crimson Invasion"],
  "ombres-ardentes": ["SM - Burning Shadows"],
  "gardiens-ascendants": ["SM - Guardians Rising"],
  "soleil-et-lune": ["SM Base Set"],
  "legendes-brillantes": ["Shining Legends"],

  // XY
  "evolutions-xy": ["XY - Evolutions"],
  "offensive-vapeur": ["XY - Steam Siege"],
  "impact-des-destins": ["XY - Fates Collide"],
  "rupture-turbo": ["XY - BREAKpoint"],
  "impulsion-turbo": ["XY - BREAKthrough"],
  "origines-antiques": ["XY - Ancient Origins"],
  "ciel-rugissant": ["XY - Roaring Skies"],
  "primo-choc": ["XY - Primal Clash"],
  "vigueur-spectrale": ["XY - Phantom Forces"],
  "poings-furieux": ["XY - Furious Fists"],
  "etincelles-xy": ["XY - Flashfire"],
  "xy-base": ["XY Base Set"],
  "generations": ["Generations"],

  // Noir & Blanc
  "legendary-treasures": ["Legendary Treasures"],
  "explosion-plasma": ["Plasma Blast"],
  "glaciation-plasma": ["Plasma Freeze"],
  "tempete-plasma": ["Plasma Storm"],
  "frontieres-franchies": ["Boundaries Crossed"],
  "dragons-exaltes": ["Dragons Exalted"],
  "explorateurs-obscurs": ["Dark Explorers"],
  "destinees-futures": ["Next Destinies"],
  "nobles-victoires": ["Noble Victories"],
  "pouvoirs-emergents": ["Emerging Powers"],
  "noir-et-blanc": ["Black and White"],

  // HGSS
  "triomphe": ["Triumphant"],
  "indomptable": ["Undaunted"],
  "dechainement": ["Unleashed"],
  "heartgold-soulsilver-base": ["HeartGold SoulSilver"],

  // Platine
  "arceus": ["Arceus"],
  "rivaux-emergeants": ["Rising Rivals"],
  "vainqueurs-supremes": ["Supreme Victors"],
  "platine-base": ["Platinum"],

  // DP
  "tempete-dp": ["Stormfront"],
  "eveil-des-legendes": ["Legends Awakened"],
  "aube-majestueuse": ["Majestic Dawn"],
  "grands-envols": ["Great Encounters"],
  "merveilles-secretes": ["Secret Wonders"],
  "tresors-mysterieux": ["Mysterious Treasures"],
  "diamant-et-perle": ["Diamond and Pearl"],

  // EX
  "gardiens-du-pouvoir": ["Power Keepers"],
  "createurs-de-legendes": ["Legend Maker"],
  "fantomes-holon": ["Holon Phantoms"],
  "especes-delta": ["Delta Species"],
  "forces-cachees": ["Unseen Forces"],
  "gardiens-de-cristal": ["Crystal Guardians"],
  "tempete-de-sable": ["Sandstorm"],
  "emeraude": ["Emerald"],
  "deoxys": ["Deoxys"],
  "team-rocket-returns": ["Team Rocket Returns"],
  "fire-red-leaf-green": ["FireRed & LeafGreen"],
  "legendes-oubliees": ["Hidden Legends"],
  "dragon-ex": ["Dragon"],
  "groudon-vs-kyogre": ["Team Magma vs Team Aqua"],
  "rubis-et-saphir": ["Ruby and Sapphire"],

  // WOTC
  "set-de-base": ["Base Set"],
  "set-de-base-2": ["Base Set 2"],
  "jungle": ["Jungle"],
  "fossile": ["Fossil"],
  "team-rocket": ["Team Rocket"],
  "gym-heroes": ["Gym Heroes"],
  "gym-challenge": ["Gym Challenge"],
  "skyridge": ["Skyridge"],
  "aquapolis": ["Aquapolis"],
  "expedition": ["Expedition Base Set"],
};

// ─── TCGPlayer product name → PokeItem item type ─────
function guessItemType(name: string): string | null {
  const n = name.toLowerCase();
  // Order matters — more specific first
  if (n.includes("booster box case") || n.includes("booster case")) return null; // skip cases
  if (n.includes("elite trainer box case") || n.includes("etb case")) return null;
  if (n.includes("bundle case")) return null;
  if (n.includes("build & battle")) return "TRAINER_KIT";
  if (n.includes("booster box") || n.includes("booster display")) return "BOOSTER_BOX";
  if (n.includes("enhanced booster box")) return "BOOSTER_BOX";
  if (n.includes("half booster box")) return null; // skip halves
  if (n.includes("elite trainer box")) return "ETB";
  if (n.includes("ultra premium") || n.includes("ultra-premium") || n.includes("upc")) return "UPC";
  if (n.includes("super-premium") || n.includes("super premium")) return "UPC";
  if (n.includes("mini tin display")) return null;
  if (n.includes("mini tin")) return "MINI_TIN";
  if (n.includes("pokeball tin") || n.includes("poké ball tin")) return "POKEBALL_TIN";
  if (n.includes(" tin ") || n.includes(" tin[") || n.endsWith(" tin")) return "TIN";
  if (n.includes("booster bundle") || n.includes("bundle")) return "BUNDLE";
  if (n.includes("3 pack blister") || n.includes("3-pack blister") || n.includes("tripack")) return "BLISTER";
  if (n.includes("2-pack blister") || n.includes("2 pack blister") || n.includes("duopack")) return "DUOPACK";
  if (n.includes("single pack blister") || n.includes("blister")) return "BLISTER";
  if (n.includes("premium checklane")) return "BLISTER";
  if (n.includes("theme deck") || n.includes("league battle deck")) return "THEME_DECK";
  if (n.includes("collection") || n.includes("box set") || n.includes("special collection") || n.includes("premium poster") || n.includes("figure collection") || n.includes("pin collection") || n.includes("sticker collection")) return "BOX_SET";
  if (n.includes("sleeved booster")) return "BOOSTER";
  if (n.includes("booster pack") && !n.includes("art bundle")) return "BOOSTER";
  return null;
}

function makeSlug(serieSlug: string, type: string): string {
  const typeSlug: Record<string, string> = {
    BOOSTER: "booster",
    DUOPACK: "duopack",
    BLISTER: "blister",
    MINI_TIN: "mini-tin",
    POKEBALL_TIN: "pokeball-tin",
    BUNDLE: "bundle",
    BOX_SET: "box-set",
    ETB: "etb",
    BOOSTER_BOX: "booster-box",
    UPC: "upc",
    TIN: "tin",
    THEME_DECK: "theme-deck",
    TRAINER_KIT: "trainer-kit",
  };
  return `${serieSlug}-${typeSlug[type] || type.toLowerCase()}`;
}

async function searchTCGPlayer(setName: string): Promise<Array<{ productId: number; name: string }>> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = DELAY_MS * Math.pow(2, attempt);
        console.log(`      ⏳ Retry ${attempt}/${MAX_RETRIES} après ${backoff}ms...`);
        await sleep(backoff);
      }
      const res = await fetch(
        "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false&mpfev=2952",
        {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Origin": "https://www.tcgplayer.com",
            "Referer": "https://www.tcgplayer.com/",
          },
          body: JSON.stringify({
            algorithm: "sales_exp_fields_boosting",
            from: 0,
            size: 50,
            filters: {
              term: {
                productLineName: ["pokemon"],
                setName: [setName],
                productTypeName: ["Sealed Products"],
              },
              range: {},
              match: {},
            },
            listingSearch: {
              filters: {
                term: { sellerStatus: "Live", channelId: 0 },
                range: { quantity: { gte: 1 } },
                exclude: { channelExclusion: 0 },
              },
              context: { cart: {} },
            },
            context: { cart: {}, shippingCountry: "US", userProfile: {} },
          }),
        }
      );
      if (res.status === 400 || res.status === 429) {
        console.log(`      ⚠️  HTTP ${res.status} — rate limited`);
        continue;
      }
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results?.[0]?.results || []).map((r: any) => ({
        productId: r.productId,
        name: r.productName,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

async function downloadImage(productId: number, destPath: string): Promise<boolean> {
  try {
    const url = `https://product-images.tcgplayer.com/fit-in/437x437/${productId}.jpg`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allSeries = Object.entries(SERIE_TO_TCGPLAYER);
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let seriesProcessed = 0;

  console.log(`\n🔍 ${allSeries.length} séries à traiter\n`);

  for (const [serieSlug, tcgSets] of allSeries) {
    seriesProcessed++;
    console.log(`\n📚 [${seriesProcessed}/${allSeries.length}] ${serieSlug}`);

    // Track which types we already downloaded for this serie
    const downloadedTypes = new Set<string>();

    for (const setName of tcgSets) {
      const products = await searchTCGPlayer(setName);

      if (products.length === 0) {
        console.log(`   ⚠️  Aucun produit trouvé pour ${setName}`);
        continue;
      }

      console.log(`   📦 ${products.length} produits trouvés (${setName})`);

      for (const product of products) {
        const itemType = guessItemType(product.name);
        if (!itemType) continue;

        // Only download one image per type per serie
        if (downloadedTypes.has(itemType)) continue;

        const slug = makeSlug(serieSlug, itemType);
        const destPath = path.join(OUTPUT_DIR, `${slug}.jpg`);

        if (fs.existsSync(destPath)) {
          downloadedTypes.add(itemType);
          totalSkipped++;
          continue;
        }

        const success = await downloadImage(product.productId, destPath);
        if (success) {
          console.log(`   ✅ ${slug} (#${product.productId})`);
          downloadedTypes.add(itemType);
          totalDownloaded++;
        } else {
          totalFailed++;
        }

        await sleep(300);
      }

      await sleep(DELAY_MS);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`✅ Images téléchargées : ${totalDownloaded}`);
  console.log(`⏭️  Déjà existantes : ${totalSkipped}`);
  console.log(`❌ Échouées : ${totalFailed}`);
  console.log(`📚 Séries traitées : ${seriesProcessed}`);
  console.log("═".repeat(60) + "\n");
}

main().catch(console.error);
