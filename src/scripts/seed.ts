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
  { name: "Wizards", nameEn: "Wizards", slug: "wotc", abbreviation: "WOTC", startDate: new Date("1999-01-09"), endDate: new Date("2003-06-01"), order: 10 },
];

const SERIES_DATA = [
  // Méga-Évolution
  { blocSlug: "mega-evolution", name: "Équilibre Parfait", abbreviation: "ME03", slug: "equilibre-parfait", releaseDate: new Date("2026-03-27"), order: 0 },
  { blocSlug: "mega-evolution", name: "Héros Transcendants", abbreviation: "ME2.5", slug: "heros-transcendants", releaseDate: new Date("2026-01-30"), order: 1 },
  { blocSlug: "mega-evolution", name: "Flammes Fantasmagoriques", abbreviation: "ME02", slug: "flammes-fantasmagoriques", releaseDate: new Date("2025-11-14"), order: 2 },
  { blocSlug: "mega-evolution", name: "Méga-Évolution", abbreviation: "ME01", slug: "mega-evolution-base", releaseDate: new Date("2025-09-26"), order: 3 },
  // Écarlate & Violet
  { blocSlug: "ecarlate-violet", name: "Flamme Blanche", abbreviation: "EV10.5W", slug: "flamme-blanche", releaseDate: new Date("2025-07-01"), order: 0 },
  { blocSlug: "ecarlate-violet", name: "Foudre Noire", abbreviation: "EV10.5B", slug: "foudre-noire", releaseDate: new Date("2025-07-01"), order: 0 },
  { blocSlug: "ecarlate-violet", name: "Rivalités Destinées", abbreviation: "EV10", slug: "rivalites-destinees", releaseDate: new Date("2025-05-30"), order: 1 },
  { blocSlug: "ecarlate-violet", name: "Aventures Ensemble", abbreviation: "EV09", slug: "aventures-ensemble", releaseDate: new Date("2025-03-28"), order: 2 },
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
  { blocSlug: "epee-bouclier", name: "Brillantes Étoiles", abbreviation: "EB09.5", slug: "brillantes-etoiles", releaseDate: new Date("2022-02-25"), order: 5 },
  { blocSlug: "epee-bouclier", name: "Stars Étincelantes", abbreviation: "EB09", slug: "stars-etincelantes", releaseDate: new Date("2021-11-19"), order: 6 },
  { blocSlug: "epee-bouclier", name: "Poing de Fusion", abbreviation: "EB08", slug: "poing-de-fusion", releaseDate: new Date("2021-11-12"), order: 7 },
  { blocSlug: "epee-bouclier", name: "Évolution Céleste", abbreviation: "EB07", slug: "evolution-celeste", releaseDate: new Date("2021-08-27"), order: 8 },
  { blocSlug: "epee-bouclier", name: "Règne de Glace", abbreviation: "EB06", slug: "regne-de-glace", releaseDate: new Date("2021-06-18"), order: 9 },
  { blocSlug: "epee-bouclier", name: "Styles de Combat", abbreviation: "EB05", slug: "styles-de-combat", releaseDate: new Date("2021-03-19"), order: 10 },
  { blocSlug: "epee-bouclier", name: "Destinées Radieuses", abbreviation: "EB04.5", slug: "destinees-radieuses", releaseDate: new Date("2021-02-19"), order: 11 },
  { blocSlug: "epee-bouclier", name: "Voltage Éclatant", abbreviation: "EB04", slug: "voltage-eclatant", releaseDate: new Date("2020-11-13"), order: 12 },
  { blocSlug: "epee-bouclier", name: "La Voie du Maître", abbreviation: "EB03.5", slug: "la-voie-du-maitre", releaseDate: new Date("2020-09-25"), order: 13 },
  { blocSlug: "epee-bouclier", name: "Ténèbres Embrasées", abbreviation: "EB03", slug: "tenebres-embrasees", releaseDate: new Date("2020-08-14"), order: 14 },
  { blocSlug: "epee-bouclier", name: "Clash des Rebelles", abbreviation: "EB02", slug: "clash-des-rebelles", releaseDate: new Date("2020-05-01"), order: 15 },
  { blocSlug: "epee-bouclier", name: "Épée et Bouclier", abbreviation: "EB01", slug: "epee-et-bouclier", releaseDate: new Date("2020-02-07"), order: 16 },
  { blocSlug: "epee-bouclier", name: "Célébrations", abbreviation: "EB-CEL", slug: "celebrations", releaseDate: new Date("2021-10-08"), order: 17 },
  // Soleil & Lune
  { blocSlug: "soleil-lune", name: "Destinées Occultes", abbreviation: "SL12.5", slug: "destinees-occultes", releaseDate: new Date("2019-11-15"), order: 0 },
  { blocSlug: "soleil-lune", name: "Éclipse Cosmique", abbreviation: "SL12", slug: "eclipse-cosmique", releaseDate: new Date("2019-11-01"), order: 1 },
  { blocSlug: "soleil-lune", name: "Méga-Donjon", abbreviation: "SL11.5", slug: "mega-donjon", releaseDate: new Date("2019-08-02"), order: 2 },
  { blocSlug: "soleil-lune", name: "Harmonie des Esprits", abbreviation: "SL11", slug: "harmonie-des-esprits", releaseDate: new Date("2019-08-02"), order: 3 },
  { blocSlug: "soleil-lune", name: "Alliance Infaillible", abbreviation: "SL10", slug: "alliance-infaillible", releaseDate: new Date("2019-05-03"), order: 4 },
  { blocSlug: "soleil-lune", name: "Duo de Choc", abbreviation: "SL09", slug: "duo-de-choc", releaseDate: new Date("2019-02-01"), order: 5 },
  { blocSlug: "soleil-lune", name: "Tonnerre Perdu", abbreviation: "SL08", slug: "tonnerre-perdu", releaseDate: new Date("2018-11-02"), order: 6 },
  { blocSlug: "soleil-lune", name: "Majesté des Dragons", abbreviation: "SL07.5", slug: "majeste-des-dragons", releaseDate: new Date("2018-09-07"), order: 7 },
  { blocSlug: "soleil-lune", name: "Tempête Céleste", abbreviation: "SL07", slug: "tempete-celeste", releaseDate: new Date("2018-08-03"), order: 8 },
  { blocSlug: "soleil-lune", name: "Lumière Interdite", abbreviation: "SL06", slug: "lumiere-interdite", releaseDate: new Date("2018-05-04"), order: 9 },
  { blocSlug: "soleil-lune", name: "Ultra-Prisme", abbreviation: "SL05", slug: "ultra-prisme", releaseDate: new Date("2018-02-02"), order: 10 },
  { blocSlug: "soleil-lune", name: "Invasion Carmin", abbreviation: "SL04", slug: "invasion-carmin", releaseDate: new Date("2017-11-03"), order: 11 },
  { blocSlug: "soleil-lune", name: "Ombres Ardentes", abbreviation: "SL03", slug: "ombres-ardentes", releaseDate: new Date("2017-08-04"), order: 12 },
  { blocSlug: "soleil-lune", name: "Gardiens Ascendants", abbreviation: "SL02", slug: "gardiens-ascendants", releaseDate: new Date("2017-05-05"), order: 13 },
  { blocSlug: "soleil-lune", name: "Soleil et Lune", abbreviation: "SL01", slug: "soleil-et-lune", releaseDate: new Date("2017-02-03"), order: 14 },
  { blocSlug: "soleil-lune", name: "Légendes Brillantes", abbreviation: "SL-LB", slug: "legendes-brillantes", releaseDate: new Date("2017-10-06"), order: 15 },
  // XY
  { blocSlug: "xy", name: "Évolutions", abbreviation: "XY12", slug: "evolutions-xy", releaseDate: new Date("2016-11-02"), order: 0 },
  { blocSlug: "xy", name: "Offensive Vapeur", abbreviation: "XY11", slug: "offensive-vapeur", releaseDate: new Date("2016-08-03"), order: 1 },
  { blocSlug: "xy", name: "Impact des Destins", abbreviation: "XY10", slug: "impact-des-destins", releaseDate: new Date("2016-05-04"), order: 2 },
  { blocSlug: "xy", name: "Rupture TURBO", abbreviation: "XY09", slug: "rupture-turbo", releaseDate: new Date("2016-02-03"), order: 3 },
  { blocSlug: "xy", name: "Impulsion TURBO", abbreviation: "XY08", slug: "impulsion-turbo", releaseDate: new Date("2015-11-04"), order: 4 },
  { blocSlug: "xy", name: "Origines Antiques", abbreviation: "XY07", slug: "origines-antiques", releaseDate: new Date("2015-08-12"), order: 5 },
  { blocSlug: "xy", name: "Ciel Rugissant", abbreviation: "XY06", slug: "ciel-rugissant", releaseDate: new Date("2015-05-06"), order: 6 },
  { blocSlug: "xy", name: "Primo-Choc", abbreviation: "XY05", slug: "primo-choc", releaseDate: new Date("2015-02-04"), order: 7 },
  { blocSlug: "xy", name: "Vigueur Spectrale", abbreviation: "XY04", slug: "vigueur-spectrale", releaseDate: new Date("2014-11-05"), order: 8 },
  { blocSlug: "xy", name: "Poings Furieux", abbreviation: "XY03", slug: "poings-furieux", releaseDate: new Date("2014-08-13"), order: 9 },
  { blocSlug: "xy", name: "Étincelles", abbreviation: "XY02", slug: "etincelles-xy", releaseDate: new Date("2014-05-07"), order: 10 },
  { blocSlug: "xy", name: "XY", abbreviation: "XY01", slug: "xy-base", releaseDate: new Date("2014-02-05"), order: 11 },
  { blocSlug: "xy", name: "Générations", abbreviation: "XY-GEN", slug: "generations", releaseDate: new Date("2016-02-22"), order: 12 },
  { blocSlug: "xy", name: "Double Danger", abbreviation: "XY-DD", slug: "double-danger", releaseDate: new Date("2015-03-11"), order: 13 },
  // Noir & Blanc
  { blocSlug: "noir-blanc", name: "Explosion Plasma", abbreviation: "NB10", slug: "explosion-plasma", releaseDate: new Date("2013-08-07"), order: 1 },
  { blocSlug: "noir-blanc", name: "Glaciation Plasma", abbreviation: "NB09", slug: "glaciation-plasma", releaseDate: new Date("2013-05-08"), order: 2 },
  { blocSlug: "noir-blanc", name: "Tempête Plasma", abbreviation: "NB08", slug: "tempete-plasma", releaseDate: new Date("2013-02-06"), order: 3 },
  { blocSlug: "noir-blanc", name: "Frontières Franchies", abbreviation: "NB07", slug: "frontieres-franchies", releaseDate: new Date("2012-11-07"), order: 4 },
  { blocSlug: "noir-blanc", name: "Dragons Exaltés", abbreviation: "NB06", slug: "dragons-exaltes", releaseDate: new Date("2012-08-15"), order: 5 },
  { blocSlug: "noir-blanc", name: "Explorateurs Obscurs", abbreviation: "NB05", slug: "explorateurs-obscurs", releaseDate: new Date("2012-05-09"), order: 6 },
  { blocSlug: "noir-blanc", name: "Destinées Futures", abbreviation: "NB04", slug: "destinees-futures", releaseDate: new Date("2012-02-08"), order: 7 },
  { blocSlug: "noir-blanc", name: "Nobles Victoires", abbreviation: "NB03", slug: "nobles-victoires", releaseDate: new Date("2011-11-16"), order: 8 },
  { blocSlug: "noir-blanc", name: "Pouvoirs Émergents", abbreviation: "NB02", slug: "pouvoirs-emergents", releaseDate: new Date("2011-08-31"), order: 9 },
  { blocSlug: "noir-blanc", name: "Noir & Blanc", abbreviation: "NB01", slug: "noir-et-blanc", releaseDate: new Date("2011-03-25"), order: 10 },
  // HeartGold SoulSilver
  { blocSlug: "heartgold-soulsilver", name: "Triomphe", abbreviation: "HGSS04", slug: "triomphe", releaseDate: new Date("2010-11-03"), order: 0 },
  { blocSlug: "heartgold-soulsilver", name: "Indomptable", abbreviation: "HGSS03", slug: "indomptable", releaseDate: new Date("2010-08-18"), order: 1 },
  { blocSlug: "heartgold-soulsilver", name: "Déchaînement", abbreviation: "HGSS02", slug: "dechainement", releaseDate: new Date("2010-05-26"), order: 2 },
  { blocSlug: "heartgold-soulsilver", name: "HeartGold SoulSilver", abbreviation: "HGSS01", slug: "heartgold-soulsilver-base", releaseDate: new Date("2010-02-10"), order: 3 },
  // Platine
  { blocSlug: "platine", name: "Rivaux Émergeants", abbreviation: "PL03", slug: "rivaux-emergeants", releaseDate: new Date("2009-08-19"), order: 1 },
  { blocSlug: "platine", name: "Vainqueurs Suprêmes", abbreviation: "PL02", slug: "vainqueurs-supremes", releaseDate: new Date("2009-05-20"), order: 2 },
  { blocSlug: "platine", name: "Platine", abbreviation: "PL01", slug: "platine-base", releaseDate: new Date("2009-02-11"), order: 3 },
  // Diamant & Perle
  { blocSlug: "diamant-perle", name: "Tempête", abbreviation: "DP07", slug: "tempete-dp", releaseDate: new Date("2009-02-11"), order: 0 },
  { blocSlug: "diamant-perle", name: "Éveil des Légendes", abbreviation: "DP06", slug: "eveil-des-legendes", releaseDate: new Date("2008-11-05"), order: 1 },
  { blocSlug: "diamant-perle", name: "Aube Majestueuse", abbreviation: "DP05", slug: "aube-majestueuse", releaseDate: new Date("2008-08-20"), order: 2 },
  { blocSlug: "diamant-perle", name: "Grands Envols", abbreviation: "DP04", slug: "grands-envols", releaseDate: new Date("2008-05-14"), order: 3 },
  { blocSlug: "diamant-perle", name: "Merveilles Secrètes", abbreviation: "DP03", slug: "merveilles-secretes", releaseDate: new Date("2007-11-07"), order: 4 },
  { blocSlug: "diamant-perle", name: "Trésors Mystérieux", abbreviation: "DP02", slug: "tresors-mysterieux", releaseDate: new Date("2007-08-22"), order: 5 },
  { blocSlug: "diamant-perle", name: "Diamant & Perle", abbreviation: "DP01", slug: "diamant-et-perle", releaseDate: new Date("2007-05-23"), order: 6 },
  // EX
  { blocSlug: "ex", name: "Gardiens du Pouvoir", abbreviation: "EX16", slug: "gardiens-du-pouvoir", releaseDate: new Date("2006-11-08"), order: 0 },
  { blocSlug: "ex", name: "Créateurs de Légendes", abbreviation: "EX15", slug: "createurs-de-legendes", releaseDate: new Date("2006-08-30"), order: 1 },
  { blocSlug: "ex", name: "Fantômes Holon", abbreviation: "EX14", slug: "fantomes-holon", releaseDate: new Date("2006-05-10"), order: 2 },
  { blocSlug: "ex", name: "Espèces Delta", abbreviation: "EX13", slug: "especes-delta", releaseDate: new Date("2006-02-08"), order: 3 },
  { blocSlug: "ex", name: "Forces Cachées", abbreviation: "EX12", slug: "forces-cachees", releaseDate: new Date("2005-11-09"), order: 4 },
  { blocSlug: "ex", name: "Gardiens de Cristal", abbreviation: "EX11", slug: "gardiens-de-cristal", releaseDate: new Date("2005-08-31"), order: 5 },
  { blocSlug: "ex", name: "Tempête de Sable", abbreviation: "EX10", slug: "tempete-de-sable-2", releaseDate: new Date("2005-05-18"), order: 6 },
  { blocSlug: "ex", name: "Émeraude", abbreviation: "EX09", slug: "emeraude", releaseDate: new Date("2005-05-09"), order: 7 },
  { blocSlug: "ex", name: "Deoxys", abbreviation: "EX08", slug: "deoxys", releaseDate: new Date("2005-02-09"), order: 8 },
  { blocSlug: "ex", name: "Fire Red & Leaf Green", abbreviation: "EX06", slug: "fire-red-leaf-green", releaseDate: new Date("2004-08-30"), order: 10 },
  { blocSlug: "ex", name: "Légendes Oubliées", abbreviation: "EX05", slug: "legendes-oubliees", releaseDate: new Date("2004-06-12"), order: 11 },
  { blocSlug: "ex", name: "Tempête de Sable", abbreviation: "EX04", slug: "tempete-de-sable", releaseDate: new Date("2004-03-18"), order: 12 },
  { blocSlug: "ex", name: "Dragon", abbreviation: "EX03", slug: "dragon-ex", releaseDate: new Date("2003-11-24"), order: 13 },
  { blocSlug: "ex", name: "Team Magma vs Team Aqua", abbreviation: "EX02", slug: "team-magma-vs-team-aqua", releaseDate: new Date("2003-09-17"), order: 11 },
  { blocSlug: "ex", name: "Rubis & Saphir", abbreviation: "EX01", slug: "rubis-et-saphir", releaseDate: new Date("2003-06-18"), order: 15 },
  // WOTC
  { blocSlug: "wotc", name: "Aquapolis", abbreviation: "WOTC-AQ", slug: "aquapolis", releaseDate: new Date("2003-01-15"), order: 0 },
  { blocSlug: "wotc", name: "Expédition", abbreviation: "WOTC-EX", slug: "expedition", releaseDate: new Date("2002-09-15"), order: 2 },
  { blocSlug: "wotc", name: "Team Rocket", abbreviation: "WOTC-TR", slug: "team-rocket", releaseDate: new Date("2000-04-24"), order: 5 },
  { blocSlug: "wotc", name: "Fossile", abbreviation: "WOTC-FO", slug: "fossile", releaseDate: new Date("1999-10-08"), order: 7 },
  { blocSlug: "wotc", name: "Jungle", abbreviation: "WOTC-JU", slug: "jungle", releaseDate: new Date("1999-06-16"), order: 8 },
  { blocSlug: "wotc", name: "Set de base", abbreviation: "WOTC-BS", slug: "set-de-base", releaseDate: new Date("1999-01-09"), order: 9 },
];

const ITEM_TYPES_FOR_SERIES = [
  { type: "BOOSTER", name: "Booster", retailPrice: 4.5, boosterCount: null },
  { type: "BOOSTER_BOX", name: "Booster Box", retailPrice: 160, boosterCount: 36 },
  { type: "ETB", name: "Elite Trainer Box", retailPrice: 52, boosterCount: 9 },
  { type: "BOX_SET", name: "Box Set", retailPrice: 35, boosterCount: 4 },
  { type: "BLISTER", name: "Blister", retailPrice: 14, boosterCount: 3 },
  { type: "TIN", name: "Tin", retailPrice: 15, boosterCount: 4 },
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
  const recentBlocs = ["mega-evolution", "ecarlate-violet", "epee-bouclier"];
  const allSeries = await prisma.serie.findMany({
    include: { bloc: true },
    where: { bloc: { slug: { in: recentBlocs } } },
  });
  let itemCount = 0;

  for (const serie of allSeries) {
    for (const itemType of ITEM_TYPES_FOR_SERIES) {
      const slug = `${itemType.type.toLowerCase().replace("_", "-")}-${serie.slug}`;
      const name = `${itemType.name} ${serie.name}`;

      await prisma.item.upsert({
        where: { slug },
        update: {
          name,
          type: itemType.type as "BOOSTER" | "BOOSTER_BOX" | "ETB" | "BOX_SET" | "BLISTER" | "TIN",
          retailPrice: itemType.retailPrice,
          currentPrice: itemType.retailPrice * (0.8 + Math.random() * 0.8),
          boosterCount: itemType.boosterCount,
          language: "FR",
          serieId: serie.id,
        },
        create: {
          name,
          slug,
          type: itemType.type as "BOOSTER" | "BOOSTER_BOX" | "ETB" | "BOX_SET" | "BLISTER" | "TIN",
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
