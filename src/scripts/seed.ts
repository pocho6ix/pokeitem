import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BLOCS_DATA = [
  { name: "Méga-Évolution", nameEn: "Mega Evolution", slug: "mega-evolution", abbreviation: "ME", startDate: new Date("2025-09-26"), order: 0 },
  { name: "Écarlate & Violet", nameEn: "Scarlet & Violet", slug: "ecarlate-violet", abbreviation: "EV", startDate: new Date("2023-03-31"), endDate: new Date("2025-07-01"), order: 1 },
  { name: "Épée & Bouclier", nameEn: "Sword & Shield", slug: "epee-bouclier", abbreviation: "EB", startDate: new Date("2020-02-07"), endDate: new Date("2023-03-01"), order: 2 },
  { name: "Soleil & Lune", nameEn: "Sun & Moon", slug: "soleil-lune", abbreviation: "SL", startDate: new Date("2017-02-03"), endDate: new Date("2020-02-01"), order: 3 },
  { name: "XY", nameEn: "XY", slug: "xy", abbreviation: "XY", startDate: new Date("2014-02-05"), endDate: new Date("2016-11-01"), order: 4 },
  { name: "Noir & Blanc", nameEn: "Black & White", slug: "noir-blanc", abbreviation: "NB", startDate: new Date("2011-03-25"), endDate: new Date("2013-11-01"), order: 5 },
  { name: "HeartGold SoulSilver", nameEn: "HeartGold SoulSilver", slug: "heartgold-soulsilver", abbreviation: "HGSS", startDate: new Date("2010-02-10"), endDate: new Date("2010-11-01"), order: 6 },
  { name: "Platine", nameEn: "Platinum", slug: "platine", abbreviation: "PL", startDate: new Date("2009-02-11"), endDate: new Date("2009-11-01"), order: 7 },
  { name: "Diamant & Perle", nameEn: "Diamond & Pearl", slug: "diamant-perle", abbreviation: "DP", startDate: new Date("2007-05-01"), endDate: new Date("2009-02-01"), order: 8 },
  { name: "EX", nameEn: "EX", slug: "ex", abbreviation: "EX", startDate: new Date("2003-06-01"), endDate: new Date("2006-11-01"), order: 9 },
  { name: "E-Card", nameEn: "E-Card", slug: "e-card", abbreviation: "EC", startDate: new Date("2002-01-01"), endDate: new Date("2003-01-01"), order: 10 },
  { name: "Neo", nameEn: "Neo", slug: "neo", abbreviation: "NEO", startDate: new Date("2000-12-01"), endDate: new Date("2002-03-01"), order: 11 },
  { name: "Wizards of the Coast", nameEn: "Wizards of the Coast", slug: "wotc", abbreviation: "WOTC", startDate: new Date("1999-01-09"), endDate: new Date("2003-03-01"), order: 12 },
];

const SERIES_DATA = [
  // Méga-Évolution
  { blocSlug: "mega-evolution", name: "Équilibre Parfait", abbreviation: "ME03", slug: "equilibre-parfait", releaseDate: new Date("2026-03-27"), order: 0 },
  { blocSlug: "mega-evolution", name: "Héros Transcendants", abbreviation: "ME2.5", slug: "heros-transcendants", releaseDate: new Date("2026-01-30"), order: 1 },
  { blocSlug: "mega-evolution", name: "Flammes Fantasmagoriques", abbreviation: "ME02", slug: "flammes-fantasmagoriques", releaseDate: new Date("2025-11-14"), order: 2 },
  { blocSlug: "mega-evolution", name: "Méga-Évolution", abbreviation: "ME01", slug: "mega-evolution-base", releaseDate: new Date("2025-09-26"), order: 3 },
  // Écarlate & Violet
  { blocSlug: "ecarlate-violet", name: "Foudre Noire / Flamme Blanche", abbreviation: "EV10.5", slug: "foudre-noire-flamme-blanche", releaseDate: new Date("2025-07-01"), order: 0 },
  { blocSlug: "ecarlate-violet", name: "Rivalités Destinées", abbreviation: "EV10", slug: "rivalites-destinees", releaseDate: new Date("2025-05-01"), order: 1 },
  { blocSlug: "ecarlate-violet", name: "Aventures Ensemble", abbreviation: "EV09", slug: "aventures-ensemble", releaseDate: new Date("2025-03-01"), order: 2 },
  { blocSlug: "ecarlate-violet", name: "Évolutions Prismatiques", abbreviation: "EV8.5", slug: "evolutions-prismatiques", releaseDate: new Date("2025-01-17"), order: 3 },
  { blocSlug: "ecarlate-violet", name: "Étincelles Déferlantes", abbreviation: "EV08", slug: "etincelles-deferlantes", releaseDate: new Date("2024-11-08"), order: 4 },
  { blocSlug: "ecarlate-violet", name: "Couronne Stellaire", abbreviation: "EV07", slug: "couronne-stellaire", releaseDate: new Date("2024-09-13"), order: 5 },
  { blocSlug: "ecarlate-violet", name: "Fable Nébuleuse", abbreviation: "EV6.5", slug: "fable-nebuleuse", releaseDate: new Date("2024-08-02"), order: 6 },
  { blocSlug: "ecarlate-violet", name: "Mascarade Crépusculaire", abbreviation: "EV06", slug: "mascarade-crepusculaire", releaseDate: new Date("2024-05-24"), order: 7 },
  { blocSlug: "ecarlate-violet", name: "Forces Temporelles", abbreviation: "EV05", slug: "forces-temporelles", releaseDate: new Date("2024-03-22"), order: 8 },
  { blocSlug: "ecarlate-violet", name: "Destinées de Paldea", abbreviation: "EV4.5", slug: "destinees-de-paldea", releaseDate: new Date("2024-01-26"), order: 9 },
  { blocSlug: "ecarlate-violet", name: "Faille Paradoxe", abbreviation: "EV04", slug: "faille-paradoxe", releaseDate: new Date("2023-11-03"), order: 10 },
  { blocSlug: "ecarlate-violet", name: "Pokémon 151", abbreviation: "EV3.5", slug: "pokemon-151", releaseDate: new Date("2023-09-22"), order: 11 },
  { blocSlug: "ecarlate-violet", name: "Flammes Obsidiennes", abbreviation: "EV03", slug: "flammes-obsidiennes", releaseDate: new Date("2023-08-11"), order: 12 },
  { blocSlug: "ecarlate-violet", name: "Évolutions à Paldea", abbreviation: "EV02", slug: "evolutions-a-paldea", releaseDate: new Date("2023-06-09"), order: 13 },
  { blocSlug: "ecarlate-violet", name: "Écarlate et Violet", abbreviation: "EV01", slug: "ecarlate-et-violet", releaseDate: new Date("2023-03-31"), order: 14 },
  // Épée & Bouclier
  { blocSlug: "epee-bouclier", name: "Zénith Suprême", abbreviation: "EB12.5", slug: "zenith-supreme", releaseDate: new Date("2023-01-20"), order: 0 },
  { blocSlug: "epee-bouclier", name: "Tempête Argentée", abbreviation: "EB12", slug: "tempete-argentee", releaseDate: new Date("2022-11-11"), order: 1 },
  { blocSlug: "epee-bouclier", name: "Origine Perdue", abbreviation: "EB11", slug: "origine-perdue", releaseDate: new Date("2022-09-09"), order: 2 },
  { blocSlug: "epee-bouclier", name: "Pokémon GO", abbreviation: "EB10.5", slug: "pokemon-go", releaseDate: new Date("2022-07-01"), order: 3 },
  { blocSlug: "epee-bouclier", name: "Astres Radieux", abbreviation: "EB10", slug: "astres-radieux", releaseDate: new Date("2022-05-27"), order: 4 },
  { blocSlug: "epee-bouclier", name: "Stars Étincelantes", abbreviation: "EB09", slug: "stars-etincelantes", releaseDate: new Date("2022-02-25"), order: 5 },
  { blocSlug: "epee-bouclier", name: "Poing de Fusion", abbreviation: "EB08", slug: "poing-de-fusion", releaseDate: new Date("2021-11-12"), order: 6 },
  { blocSlug: "epee-bouclier", name: "Évolution Céleste", abbreviation: "EB07", slug: "evolution-celeste", releaseDate: new Date("2021-08-27"), order: 7 },
  { blocSlug: "epee-bouclier", name: "Règne de Glace", abbreviation: "EB06", slug: "regne-de-glace", releaseDate: new Date("2021-06-18"), order: 8 },
  { blocSlug: "epee-bouclier", name: "Styles de Combat", abbreviation: "EB05", slug: "styles-de-combat", releaseDate: new Date("2021-03-19"), order: 9 },
  { blocSlug: "epee-bouclier", name: "Destinées Radieuses", abbreviation: "EB04.5", slug: "destinees-radieuses", releaseDate: new Date("2021-02-19"), order: 10 },
  { blocSlug: "epee-bouclier", name: "Voltage Éclatant", abbreviation: "EB04", slug: "voltage-eclatant", releaseDate: new Date("2020-11-13"), order: 11 },
  { blocSlug: "epee-bouclier", name: "La Voie du Maître", abbreviation: "EB03.5", slug: "la-voie-du-maitre", releaseDate: new Date("2020-09-25"), order: 12 },
  { blocSlug: "epee-bouclier", name: "Ténèbres Embrasées", abbreviation: "EB03", slug: "tenebres-embrasees", releaseDate: new Date("2020-08-14"), order: 13 },
  { blocSlug: "epee-bouclier", name: "Clash des Rebelles", abbreviation: "EB02", slug: "clash-des-rebelles", releaseDate: new Date("2020-05-01"), order: 14 },
  { blocSlug: "epee-bouclier", name: "Épée et Bouclier", abbreviation: "EB01", slug: "epee-et-bouclier", releaseDate: new Date("2020-02-07"), order: 15 },
  { blocSlug: "epee-bouclier", name: "Célébrations", abbreviation: "EB-CEL", slug: "celebrations", releaseDate: new Date("2021-10-08"), order: 16 },
];

const ITEM_TYPES_FOR_SERIES = [
  { type: "BOOSTER", name: "Booster", retailPrice: 4.5, boosterCount: null },
  { type: "DISPLAY", name: "Display (36 Boosters)", retailPrice: 160, boosterCount: 36 },
  { type: "ETB", name: "Coffret Dresseur d'Élite", retailPrice: 52, boosterCount: 9 },
  { type: "COFFRET", name: "Coffret Collection", retailPrice: 35, boosterCount: 4 },
  { type: "TRIPACK", name: "Tripack", retailPrice: 16, boosterCount: 3 },
  { type: "POKEBOX", name: "Pokébox", retailPrice: 27, boosterCount: 4 },
];

async function main() {
  console.log("Seeding database...");

  // Create blocs
  for (const bloc of BLOCS_DATA) {
    await prisma.bloc.upsert({
      where: { slug: bloc.slug },
      update: bloc,
      create: bloc,
    });
  }
  console.log(`Created ${BLOCS_DATA.length} blocs`);

  // Create series
  for (const serie of SERIES_DATA) {
    const bloc = await prisma.bloc.findUnique({ where: { slug: serie.blocSlug } });
    if (!bloc) {
      console.warn(`Bloc ${serie.blocSlug} not found, skipping serie ${serie.name}`);
      continue;
    }
    const { blocSlug, ...serieData } = serie;
    await prisma.serie.upsert({
      where: { slug: serie.slug },
      update: { ...serieData, blocId: bloc.id },
      create: { ...serieData, blocId: bloc.id },
    });
  }
  console.log(`Created ${SERIES_DATA.length} series`);

  // Create items for recent series (ME + EV + EB)
  const allSeries = await prisma.serie.findMany({ include: { bloc: true } });
  let itemCount = 0;

  for (const serie of allSeries) {
    for (const itemType of ITEM_TYPES_FOR_SERIES) {
      const slug = `${itemType.type.toLowerCase()}-${serie.slug}`;
      const name = `${itemType.name} ${serie.name}`;

      await prisma.item.upsert({
        where: { slug },
        update: {
          name,
          type: itemType.type as "BOOSTER" | "DISPLAY" | "ETB" | "COFFRET" | "TRIPACK" | "POKEBOX",
          retailPrice: itemType.retailPrice,
          currentPrice: itemType.retailPrice * (0.8 + Math.random() * 0.8),
          boosterCount: itemType.boosterCount,
          language: "FR",
          serieId: serie.id,
        },
        create: {
          name,
          slug,
          type: itemType.type as "BOOSTER" | "DISPLAY" | "ETB" | "COFFRET" | "TRIPACK" | "POKEBOX",
          retailPrice: itemType.retailPrice,
          currentPrice: itemType.retailPrice * (0.8 + Math.random() * 0.8),
          boosterCount: itemType.boosterCount,
          releaseDate: serie.releaseDate,
          language: "FR",
          serieId: serie.id,
        },
      });
      itemCount++;
    }
  }
  console.log(`Created ${itemCount} items`);

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
