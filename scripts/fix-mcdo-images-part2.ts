/**
 * fix-mcdo-images-part2.ts
 *
 * Fills in Card.imageUrl for the 98 McDonald's promo cards that still have
 * imageUrl = null after fix-mcdo-images.ts ran (which covered PTCGIO sets).
 *
 * Source: Pokellector (den-cards.pokellector.com) — scraped high-res PNGs.
 *
 * Coverage:
 *   promo-mcdo-2023  (15 cards, 1-15)   → Pokellector M23EN
 *   promo-mcdo-2024  (15 cards, 1-15)   → Pokellector M24
 *   promo-mcdo-2019  (28 cards, 13-40)  → Pokellector MCD9FR
 *   promo-mcdo-2018  (28 cards, 13-40)  → Pokellector MCD9FR
 *     (2018 FR and 2019 FR cards 13-40 are identical — same artwork)
 *   promo-mcdo-2013  (12 cards, 1-12)   → NO SOURCE FOUND
 *     The 2013 FR set (Évoli + Eeveelutions + Mewtwo + Genesect) is France-exclusive
 *     and does not exist in PTCGIO, TCGdex assets, or Pokellector.
 *
 * Investigation notes:
 *   - TCGdex assets (assets.tcgdex.net): all mc set image URLs return 404.
 *     TCGdex card/set API returns no `image` field for any mc set in any language.
 *   - PTCGIO: only covers mcd11–mcd22 (no mcd13, mcd23, mcd24).
 *     mcd18/mcd19 only have 12 EN cards (numbers 1-12); FR cards 13-40 are not covered.
 *   - Pokellector: has M23EN (15 cards), M24 (15 cards), MCD9FR (40 cards).
 *     No 2013 FR set. No 2018 FR set (only 2018 EN which matches PTCGIO mcd18).
 *
 * Usage:
 *   npx tsx scripts/fix-mcdo-images-part2.ts              # dry-run
 *   npx tsx scripts/fix-mcdo-images-part2.ts --apply      # write to DB
 *   npx tsx scripts/fix-mcdo-images-part2.ts --verbose    # print every card
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma  = new PrismaClient();
const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

// ── Hardcoded image maps (scraped from Pokellector) ──────────────────────────
// Key: card number (string), Value: full image URL
// Source: den-cards.pokellector.com — high-res PNG (≈700-900 KB each)

const POKELLECTOR_2023: Record<string, string> = {
  "1":  "https://den-cards.pokellector.com/372/Sprigatito.M23EN.1.49024.png",
  "2":  "https://den-cards.pokellector.com/372/Fuecoco.M23EN.2.47684.png",
  "3":  "https://den-cards.pokellector.com/372/Quaxly.M23EN.3.49025.png",
  "4":  "https://den-cards.pokellector.com/372/Cetoddle.M23EN.4.49026.png",
  "5":  "https://den-cards.pokellector.com/372/Cetitan.M23EN.5.49027.png",
  "6":  "https://den-cards.pokellector.com/372/Pikachu.M23EN.6.49028.png",
  "7":  "https://den-cards.pokellector.com/372/Pawmi.M23EN.7.49029.png",
  "8":  "https://den-cards.pokellector.com/372/Kilowattrel.M23EN.8.47683.png",
  "9":  "https://den-cards.pokellector.com/372/Flittle.M23EN.9.49030.png",
  "10": "https://den-cards.pokellector.com/372/Sandaconda.M23EN.10.47682.png",
  "11": "https://den-cards.pokellector.com/372/Klawf.M23EN.11.49031.png",
  "12": "https://den-cards.pokellector.com/372/Blissey.M23EN.12.47681.png",
  "13": "https://den-cards.pokellector.com/372/Tandemaus.M23EN.13.49032.png",
  "14": "https://den-cards.pokellector.com/372/Cyclizar.M23EN.14.49033.png",
  "15": "https://den-cards.pokellector.com/372/Kirlia.M23EN.15.49034.png",
};

const POKELLECTOR_2024: Record<string, string> = {
  "1":  "https://den-cards.pokellector.com/410/Charizard.M24.1.55522.png",
  "2":  "https://den-cards.pokellector.com/410/Pikachu.M24.2.55523.png",
  "3":  "https://den-cards.pokellector.com/410/Miraidon.M24.3.55524.png",
  "4":  "https://den-cards.pokellector.com/410/Jigglypuff.M24.4.55525.png",
  "5":  "https://den-cards.pokellector.com/410/Hatenna.M24.5.55526.png",
  "6":  "https://den-cards.pokellector.com/410/Dragapult.M24.6.55527.png",
  "7":  "https://den-cards.pokellector.com/410/Quagsire.M24.7.55528.png",
  "8":  "https://den-cards.pokellector.com/410/Koraidon.M24.8.55529.png",
  "9":  "https://den-cards.pokellector.com/410/Umbreon.M24.9.55530.png",
  "10": "https://den-cards.pokellector.com/410/Hydreigon.M24.10.55531.png",
  "11": "https://den-cards.pokellector.com/410/Roaring-Moon.M24.11.55532.png",
  "12": "https://den-cards.pokellector.com/410/Dragonite.M24.12.55533.png",
  "13": "https://den-cards.pokellector.com/410/Eevee.M24.13.55534.png",
  "14": "https://den-cards.pokellector.com/410/Rayquaza.M24.14.55535.png",
  "15": "https://den-cards.pokellector.com/410/Drampa.M24.15.55536.png",
};

// 2018 FR and 2019 FR cards 13-40 share identical artwork (same set reprinted both years)
const POKELLECTOR_MCD9FR_13_40: Record<string, string> = {
  "13": "https://den-cards.pokellector.com/334/Alolan-Vulpix.MCD9FR.13.40134.png",
  "14": "https://den-cards.pokellector.com/334/Slowpoke.MCD9FR.14.40135.png",
  "15": "https://den-cards.pokellector.com/334/Horsea.MCD9FR.15.40136.png",
  "16": "https://den-cards.pokellector.com/334/Staryu.MCD9FR.16.40137.png",
  "17": "https://den-cards.pokellector.com/334/Magikarp.MCD9FR.17.40138.png",
  "18": "https://den-cards.pokellector.com/334/Lapras.MCD9FR.18.40139.png",
  "19": "https://den-cards.pokellector.com/334/Articuno.MCD9FR.19.40140.png",
  "20": "https://den-cards.pokellector.com/334/Pikachu.MCD9FR.20.40141.png",
  "21": "https://den-cards.pokellector.com/334/Alolan-Raichu.MCD9FR.21.40142.png",
  "22": "https://den-cards.pokellector.com/334/Alolan-Geodude.MCD9FR.22.40143.png",
  "23": "https://den-cards.pokellector.com/334/Magnemite.MCD9FR.23.40144.png",
  "24": "https://den-cards.pokellector.com/334/Voltorb.MCD9FR.24.40145.png",
  "25": "https://den-cards.pokellector.com/334/Electabuzz.MCD9FR.25.40146.png",
  "26": "https://den-cards.pokellector.com/334/Zapdos.MCD9FR.26.40147.png",
  "27": "https://den-cards.pokellector.com/334/Gastly.MCD9FR.27.40148.png",
  "28": "https://den-cards.pokellector.com/334/Mankey.MCD9FR.28.40149.png",
  "29": "https://den-cards.pokellector.com/334/Onix.MCD9FR.29.40150.png",
  "30": "https://den-cards.pokellector.com/334/Cubone.MCD9FR.30.40151.png",
  "31": "https://den-cards.pokellector.com/334/Rhyhorn.MCD9FR.31.40152.png",
  "32": "https://den-cards.pokellector.com/334/Alolan-Meowth.MCD9FR.32.40153.png",
  "33": "https://den-cards.pokellector.com/334/Alolan-Diglett.MCD9FR.33.40154.png",
  "34": "https://den-cards.pokellector.com/334/Alolan-Dugtrio.MCD9FR.34.40155.png",
  "35": "https://den-cards.pokellector.com/334/Jigglypuff.MCD9FR.35.40156.png",
  "36": "https://den-cards.pokellector.com/334/Dratini.MCD9FR.36.40157.png",
  "37": "https://den-cards.pokellector.com/334/Lickitung.MCD9FR.37.40158.png",
  "38": "https://den-cards.pokellector.com/334/Chansey.MCD9FR.38.40159.png",
  "39": "https://den-cards.pokellector.com/334/Kangaskhan.MCD9FR.39.40160.png",
  "40": "https://den-cards.pokellector.com/334/Eevee.MCD9FR.40.40161.png",
};

// ── Serie definitions ────────────────────────────────────────────────────────

interface SerieDef {
  slug:     string;
  imageMap: Record<string, string>;
  note?:    string;
}

const SERIES: SerieDef[] = [
  {
    slug:     "promo-mcdo-2023",
    imageMap: POKELLECTOR_2023,
    note:     "Source: Pokellector M23EN (same cards as FR, numbered 1-15)",
  },
  {
    slug:     "promo-mcdo-2024",
    imageMap: POKELLECTOR_2024,
    note:     "Source: Pokellector M24 (same cards as FR, numbered 1-15)",
  },
  {
    slug:     "promo-mcdo-2019",
    imageMap: POKELLECTOR_MCD9FR_13_40,
    note:     "Source: Pokellector MCD9FR cards 13-40 (FR-exclusive Kanto Pokémon)",
  },
  {
    slug:     "promo-mcdo-2018",
    imageMap: POKELLECTOR_MCD9FR_13_40,
    note:     "Source: Pokellector MCD9FR cards 13-40 (identical to 2019 FR cards 13-40)",
  },
  // promo-mcdo-2013: 12 FR-exclusive cards (Eeveelutions + Mewtwo + Genesect)
  // Not covered: no source found in TCGdex, PTCGIO, Pokellector, TPCI CDN, or Bulbapedia.
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!APPLY) {
    console.log("Mode dry-run — aucune ecriture en DB (passer --apply pour ecrire)\n");
  } else {
    console.log("Mode APPLY — ecriture en DB activee\n");
  }

  let totalUpdated  = 0;
  let totalNotFound = 0;

  for (const def of SERIES) {
    const serie = await prisma.serie.findUnique({
      where:  { slug: def.slug },
      select: { id: true, name: true },
    });

    if (!serie) {
      console.log(`  ${def.slug} absent en DB — skip`);
      continue;
    }

    const dbCards = await prisma.card.findMany({
      where:   { serieId: serie.id, OR: [{ imageUrl: null }, { imageUrl: "" }] },
      select:  { id: true, number: true, name: true },
      orderBy: { number: "asc" },
    });

    if (dbCards.length === 0) {
      console.log(`OK ${serie.name}: aucune carte a traiter`);
      continue;
    }

    console.log(`\n${serie.name} (${def.slug}) — ${dbCards.length} carte(s) sans image`);
    if (def.note) console.log(`   ${def.note}`);

    let updated  = 0;
    let notFound = 0;
    const samples: string[] = [];

    for (const card of dbCards) {
      const imageUrl = def.imageMap[card.number];

      if (!imageUrl) {
        if (VERBOSE) console.log(`     X ${card.number} ${card.name} — non trouve`);
        notFound++;
        continue;
      }

      if (VERBOSE) console.log(`     + ${card.number} ${card.name} -> ${imageUrl}`);
      if (samples.length < 3) samples.push(`${card.number} -> ${imageUrl}`);

      if (APPLY) {
        await prisma.card.update({
          where: { id: card.id },
          data:  { imageUrl },
        });
      }
      updated++;
    }

    console.log(`   -> ${updated} mise(s) a jour${APPLY ? "" : " (dry-run)"}, ${notFound} non trouve(s)`);
    if (samples.length > 0) {
      console.log("   Exemples:");
      samples.forEach((s) => console.log(`     ${s}`));
    }

    totalUpdated  += updated;
    totalNotFound += notFound;
  }

  // Report on 2013 FR (known gap)
  const serie2013 = await prisma.serie.findUnique({
    where: { slug: "promo-mcdo-2013" },
    select: { id: true, name: true },
  });
  if (serie2013) {
    const null2013 = await prisma.card.count({
      where: { serieId: serie2013.id, OR: [{ imageUrl: null }, { imageUrl: "" }] },
    });
    if (null2013 > 0) {
      console.log(
        `\n  promo-mcdo-2013 (${serie2013.name}): ${null2013} carte(s) sans image — aucune source disponible.`
      );
      console.log(
        "   Ce set FR exclusif (Eeveelutions + Mewtwo + Genesect) n'existe ni dans PTCGIO, ni TCGdex, ni Pokellector."
      );
      totalNotFound += null2013;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Total cartes mises a jour : ${totalUpdated}${APPLY ? "" : " (dry-run)"}`);
  console.log(`Total non trouvees         : ${totalNotFound}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
