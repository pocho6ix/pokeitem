/**
 * seed-series.ts
 *
 * Importe les blocs et séries depuis les données statiques (src/data/)
 * vers la base de données via Prisma.
 *
 * Usage :
 *   npx tsx scripts/seed-series.ts
 *   npx tsx scripts/seed-series.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Charger les données statiques en les inlinant ici pour éviter les problèmes
// d'import avec les alias @/ de Next.js en dehors du contexte Next.
// Ces données sont copiées depuis src/data/blocs.ts et src/data/series.ts
// et doivent être maintenues en sync manuellement (ou patcher avec un vrai bundler).

// ─── Blocs ─────────────────────────────────────────────────────────────────
const BLOCS_DATA = [
  { name: "Méga-Évolution", nameEn: "Mega Evolution", slug: "mega-evolution", abbreviation: "ME", logoUrl: null, imageUrl: "/images/blocs/mega-evolution.png", startDate: "2025-09-01", endDate: null, order: 0 },
  { name: "Écarlate & Violet", nameEn: "Scarlet & Violet", slug: "ecarlate-violet", abbreviation: "EV", logoUrl: null, imageUrl: "/images/blocs/ecarlate-violet.png", startDate: "2023-03-01", endDate: "2025-08-31", order: 1 },
  { name: "Épée & Bouclier", nameEn: "Sword & Shield", slug: "epee-bouclier", abbreviation: "EB", logoUrl: null, imageUrl: "/images/blocs/epee-bouclier.png", startDate: "2020-02-01", endDate: "2023-03-01", order: 2 },
  { name: "Soleil & Lune", nameEn: "Sun & Moon", slug: "soleil-lune", abbreviation: "SL", logoUrl: null, imageUrl: "/images/blocs/soleil-lune.png", startDate: "2017-02-01", endDate: "2020-02-01", order: 3 },
  { name: "XY", nameEn: "XY", slug: "xy", abbreviation: "XY", logoUrl: null, imageUrl: "/images/blocs/xy.png", startDate: "2014-02-01", endDate: "2016-11-01", order: 4 },
  { name: "Noir & Blanc", nameEn: "Black & White", slug: "noir-blanc", abbreviation: "NB", logoUrl: null, imageUrl: "/images/blocs/noir-blanc.png", startDate: "2011-03-01", endDate: "2013-11-01", order: 5 },
  { name: "HeartGold SoulSilver", nameEn: "HeartGold SoulSilver", slug: "heartgold-soulsilver", abbreviation: "HGSS", logoUrl: null, imageUrl: "/images/blocs/heartgold-soulsilver.png", startDate: "2010-02-01", endDate: "2010-11-01", order: 6 },
  { name: "Platine", nameEn: "Platinum", slug: "platine", abbreviation: "PL", logoUrl: null, imageUrl: "/images/blocs/platine.png", startDate: "2009-02-01", endDate: "2009-11-01", order: 7 },
  { name: "Diamant & Perle", nameEn: "Diamond & Pearl", slug: "diamant-perle", abbreviation: "DP", logoUrl: null, imageUrl: "/images/blocs/diamant-perle.png", startDate: "2007-05-01", endDate: "2009-02-01", order: 8 },
  { name: "EX", nameEn: "EX", slug: "ex", abbreviation: "EX", logoUrl: null, imageUrl: "/images/blocs/ex.png", startDate: "2003-06-01", endDate: "2006-11-01", order: 9 },
  { name: "Wizards of the Coast", nameEn: "Wizards of the Coast", slug: "wotc", abbreviation: "WOTC", logoUrl: null, imageUrl: "/images/blocs/wotc.png", startDate: "1999-01-01", endDate: "2003-06-01", order: 10 },
];

// ─── Séries ─────────────────────────────────────────────────────────────────
// Chaque série : { name, nameEn, slug, abbreviation, blocSlug, imageUrl, releaseDate, order }
const SERIES_DATA = [
  // Méga-Évolution
  { name: "Équilibre Parfait", nameEn: "Perfect Balance", slug: "equilibre-parfait", abbreviation: "ME03", blocSlug: "mega-evolution", imageUrl: "/images/series/equilibre-parfait.png", releaseDate: "2026-03-27", order: 0 },
  { name: "Héros Transcendants", nameEn: "Transcendent Heroes", slug: "heros-transcendants", abbreviation: "ME2.5", blocSlug: "mega-evolution", imageUrl: "/images/series/heros-transcendants.png", releaseDate: "2026-01-30", order: 1 },
  { name: "Flammes Fantasmagoriques", nameEn: "Phantasmagoric Flames", slug: "flammes-fantasmagoriques", abbreviation: "ME02", blocSlug: "mega-evolution", imageUrl: "/images/series/flammes-fantasmagoriques.png", releaseDate: "2025-11-14", order: 2 },
  { name: "Méga-Évolution", nameEn: "Mega Evolution", slug: "mega-evolution", abbreviation: "ME01", blocSlug: "mega-evolution", imageUrl: "/images/series/mega-evolution.png", releaseDate: "2025-09-26", order: 3 },
  // Écarlate & Violet
  { name: "Foudre Noire / Flamme Blanche", nameEn: "Black Lightning / White Flame", slug: "foudre-noire-flamme-blanche", abbreviation: "EV10.5", blocSlug: "ecarlate-violet", imageUrl: "/images/series/foudre-noire-flamme-blanche.png", releaseDate: "2025-07-01", order: 0 },
  { name: "Rivalités Destinées", nameEn: "Destined Rivals", slug: "rivalites-destinees", abbreviation: "EV10", blocSlug: "ecarlate-violet", imageUrl: "/images/series/rivalites-destinees.png", releaseDate: "2025-05-30", order: 1 },
  { name: "Aventures Ensemble", nameEn: "Adventures Together", slug: "aventures-ensemble", abbreviation: "EV09", blocSlug: "ecarlate-violet", imageUrl: "/images/series/aventures-ensemble.png", releaseDate: "2025-03-28", order: 2 },
  { name: "Évolutions Prismatiques", nameEn: "Prismatic Evolutions", slug: "evolutions-prismatiques", abbreviation: "EV8.5", blocSlug: "ecarlate-violet", imageUrl: "/images/series/evolutions-prismatiques.png", releaseDate: "2025-01-17", order: 3 },
  { name: "Étincelles Déferlantes", nameEn: "Surging Sparks", slug: "etincelles-deferlantes", abbreviation: "EV08", blocSlug: "ecarlate-violet", imageUrl: "/images/series/etincelles-deferlantes.png", releaseDate: "2024-11-08", order: 4 },
  { name: "Couronne Stellaire", nameEn: "Stellar Crown", slug: "couronne-stellaire", abbreviation: "EV07", blocSlug: "ecarlate-violet", imageUrl: "/images/series/couronne-stellaire.png", releaseDate: "2024-09-13", order: 5 },
  { name: "Fable Nébuleuse", nameEn: "Shrouded Fable", slug: "fable-nebuleuse", abbreviation: "EV6.5", blocSlug: "ecarlate-violet", imageUrl: "/images/series/fable-nebuleuse.png", releaseDate: "2024-08-02", order: 6 },
  { name: "Mascarade Crépusculaire", nameEn: "Twilight Masquerade", slug: "mascarade-crepusculaire", abbreviation: "EV06", blocSlug: "ecarlate-violet", imageUrl: "/images/series/mascarade-crepusculaire.png", releaseDate: "2024-05-24", order: 7 },
  { name: "Forces Temporelles", nameEn: "Temporal Forces", slug: "forces-temporelles", abbreviation: "EV05", blocSlug: "ecarlate-violet", imageUrl: "/images/series/forces-temporelles.png", releaseDate: "2024-03-22", order: 8 },
  { name: "Destinées de Paldea", nameEn: "Paldean Fates", slug: "destinees-de-paldea", abbreviation: "EV4.5", blocSlug: "ecarlate-violet", imageUrl: "/images/series/destinees-de-paldea.png", releaseDate: "2024-01-26", order: 9 },
  { name: "Faille Paradoxe", nameEn: "Paradox Rift", slug: "faille-paradoxe", abbreviation: "EV04", blocSlug: "ecarlate-violet", imageUrl: "/images/series/faille-paradoxe.png", releaseDate: "2023-11-03", order: 10 },
  { name: "Pokémon 151", nameEn: "Pokémon 151", slug: "pokemon-151", abbreviation: "EV3.5", blocSlug: "ecarlate-violet", imageUrl: "/images/series/pokemon-151.png", releaseDate: "2023-09-22", order: 11 },
  { name: "Flammes Obsidiennes", nameEn: "Obsidian Flames", slug: "flammes-obsidiennes", abbreviation: "EV03", blocSlug: "ecarlate-violet", imageUrl: "/images/series/flammes-obsidiennes.png", releaseDate: "2023-08-11", order: 12 },
  { name: "Évolutions à Paldea", nameEn: "Paldea Evolved", slug: "evolutions-a-paldea", abbreviation: "EV02", blocSlug: "ecarlate-violet", imageUrl: "/images/series/evolutions-a-paldea.png", releaseDate: "2023-06-09", order: 13 },
  { name: "Écarlate et Violet", nameEn: "Scarlet & Violet", slug: "ecarlate-et-violet", abbreviation: "EV01", blocSlug: "ecarlate-violet", imageUrl: "/images/series/ecarlate-et-violet.png", releaseDate: "2023-03-31", order: 14 },
  // Épée & Bouclier
  { name: "Zénith Suprême", nameEn: "Crown Zenith", slug: "zenith-supreme", abbreviation: "EB12.5", blocSlug: "epee-bouclier", imageUrl: "/images/series/zenith-supreme.png", releaseDate: "2023-01-20", order: 0 },
  { name: "Tempête Argentée", nameEn: "Silver Tempest", slug: "tempete-argentee", abbreviation: "EB12", blocSlug: "epee-bouclier", imageUrl: "/images/series/tempete-argentee.png", releaseDate: "2022-11-11", order: 1 },
  { name: "Origine Perdue", nameEn: "Lost Origin", slug: "origine-perdue", abbreviation: "EB11", blocSlug: "epee-bouclier", imageUrl: "/images/series/origine-perdue.png", releaseDate: "2022-09-09", order: 2 },
  { name: "Pokémon GO", nameEn: "Pokémon GO", slug: "pokemon-go", abbreviation: "EB10.5", blocSlug: "epee-bouclier", imageUrl: "/images/series/pokemon-go.png", releaseDate: "2022-07-01", order: 3 },
  { name: "Astres Radieux", nameEn: "Astral Radiance", slug: "astres-radieux", abbreviation: "EB10", blocSlug: "epee-bouclier", imageUrl: "/images/series/astres-radieux.png", releaseDate: "2022-05-27", order: 4 },
  { name: "Stars Étincelantes", nameEn: "Brilliant Stars", slug: "stars-etincelantes", abbreviation: "EB09", blocSlug: "epee-bouclier", imageUrl: "/images/series/stars-etincelantes.png", releaseDate: "2022-02-25", order: 5 },
  { name: "Poing de Fusion", nameEn: "Fusion Strike", slug: "poing-de-fusion", abbreviation: "EB08", blocSlug: "epee-bouclier", imageUrl: "/images/series/poing-de-fusion.png", releaseDate: "2021-11-12", order: 6 },
  { name: "Évolution Céleste", nameEn: "Evolving Skies", slug: "evolution-celeste", abbreviation: "EB07", blocSlug: "epee-bouclier", imageUrl: "/images/series/evolution-celeste.png", releaseDate: "2021-08-27", order: 7 },
  { name: "Règne de Glace", nameEn: "Chilling Reign", slug: "regne-de-glace", abbreviation: "EB06", blocSlug: "epee-bouclier", imageUrl: "/images/series/regne-de-glace.png", releaseDate: "2021-06-18", order: 8 },
  { name: "Styles de Combat", nameEn: "Battle Styles", slug: "styles-de-combat", abbreviation: "EB05", blocSlug: "epee-bouclier", imageUrl: "/images/series/styles-de-combat.png", releaseDate: "2021-03-19", order: 9 },
  { name: "Célébrations", nameEn: "Celebrations", slug: "celebrations", abbreviation: "EB4.5", blocSlug: "epee-bouclier", imageUrl: "/images/series/celebrations.png", releaseDate: "2021-10-08", order: 10 },
  { name: "Destinées Radieuses", nameEn: "Shining Fates", slug: "destinees-radieuses", abbreviation: "EB4.5b", blocSlug: "epee-bouclier", imageUrl: "/images/series/destinees-radieuses.png", releaseDate: "2021-02-19", order: 11 },
  { name: "Voltage Éclatant", nameEn: "Vivid Voltage", slug: "voltage-eclatant", abbreviation: "EB04", blocSlug: "epee-bouclier", imageUrl: "/images/series/voltage-eclatant.png", releaseDate: "2020-11-13", order: 12 },
  { name: "La Voie du Maître", nameEn: "Champion's Path", slug: "la-voie-du-maitre", abbreviation: "EB3.5", blocSlug: "epee-bouclier", imageUrl: "/images/series/la-voie-du-maitre.png", releaseDate: "2020-09-25", order: 13 },
  { name: "Ténèbres Embrasées", nameEn: "Darkness Ablaze", slug: "tenebres-embrasees", abbreviation: "EB03", blocSlug: "epee-bouclier", imageUrl: "/images/series/tenebres-embrasees.png", releaseDate: "2020-08-14", order: 14 },
  { name: "Clash des Rebelles", nameEn: "Rebel Clash", slug: "clash-des-rebelles", abbreviation: "EB02", blocSlug: "epee-bouclier", imageUrl: "/images/series/clash-des-rebelles.png", releaseDate: "2020-05-01", order: 15 },
  { name: "Épée et Bouclier", nameEn: "Sword & Shield", slug: "epee-et-bouclier", abbreviation: "EB01", blocSlug: "epee-bouclier", imageUrl: "/images/series/epee-et-bouclier.png", releaseDate: "2020-02-07", order: 16 },
  // Soleil & Lune
  { name: "Éclipse Cosmique", nameEn: "Cosmic Eclipse", slug: "eclipse-cosmique", abbreviation: "SL12", blocSlug: "soleil-lune", imageUrl: "/images/series/eclipse-cosmique.png", releaseDate: "2019-11-01", order: 0 },
  { name: "Destinées Occultes", nameEn: "Hidden Fates", slug: "destinees-occultes", abbreviation: "SL11.5", blocSlug: "soleil-lune", imageUrl: "/images/series/destinees-occultes.png", releaseDate: "2019-08-23", order: 1 },
  { name: "Harmonie des Esprits", nameEn: "Unified Minds", slug: "harmonie-des-esprits", abbreviation: "SL11", blocSlug: "soleil-lune", imageUrl: "/images/series/harmonie-des-esprits.png", releaseDate: "2019-08-02", order: 2 },
  { name: "Méga Donjon", nameEn: "Detective Pikachu", slug: "mega-donjon", abbreviation: "SL10.5", blocSlug: "soleil-lune", imageUrl: "/images/series/mega-donjon.png", releaseDate: "2019-05-03", order: 3 },
  { name: "Alliance Infaillible", nameEn: "Unbroken Bonds", slug: "alliance-infaillible", abbreviation: "SL10", blocSlug: "soleil-lune", imageUrl: "/images/series/alliance-infaillible.png", releaseDate: "2019-05-03", order: 4 },
  { name: "Duo de Choc", nameEn: "Team Up", slug: "duo-de-choc", abbreviation: "SL09", blocSlug: "soleil-lune", imageUrl: "/images/series/duo-de-choc.png", releaseDate: "2019-02-01", order: 5 },
  { name: "Tonnerre Perdu", nameEn: "Lost Thunder", slug: "tonnerre-perdu", abbreviation: "SL08", blocSlug: "soleil-lune", imageUrl: "/images/series/tonnerre-perdu.png", releaseDate: "2018-11-02", order: 6 },
  { name: "Majesté des Dragons", nameEn: "Dragon Majesty", slug: "majeste-des-dragons", abbreviation: "SL7.5", blocSlug: "soleil-lune", imageUrl: "/images/series/majeste-des-dragons.png", releaseDate: "2018-09-07", order: 7 },
  { name: "Tempête Céleste", nameEn: "Celestial Storm", slug: "tempete-celeste", abbreviation: "SL07", blocSlug: "soleil-lune", imageUrl: "/images/series/tempete-celeste.png", releaseDate: "2018-08-03", order: 8 },
  { name: "Lumière Interdite", nameEn: "Forbidden Light", slug: "lumiere-interdite", abbreviation: "SL06", blocSlug: "soleil-lune", imageUrl: "/images/series/lumiere-interdite.png", releaseDate: "2018-05-04", order: 9 },
  { name: "Ultra-Prisme", nameEn: "Ultra Prism", slug: "ultra-prisme", abbreviation: "SL05", blocSlug: "soleil-lune", imageUrl: "/images/series/ultra-prisme.png", releaseDate: "2018-02-02", order: 10 },
  { name: "Invasion Carmin", nameEn: "Crimson Invasion", slug: "invasion-carmin", abbreviation: "SL04", blocSlug: "soleil-lune", imageUrl: "/images/series/invasion-carmin.png", releaseDate: "2017-11-03", order: 11 },
  { name: "Légendes Brillantes", nameEn: "Shining Legends", slug: "legendes-brillantes", abbreviation: "SL3.5", blocSlug: "soleil-lune", imageUrl: "/images/series/legendes-brillantes.png", releaseDate: "2017-10-06", order: 12 },
  { name: "Ombres Ardentes", nameEn: "Burning Shadows", slug: "ombres-ardentes", abbreviation: "SL03", blocSlug: "soleil-lune", imageUrl: "/images/series/ombres-ardentes.png", releaseDate: "2017-08-04", order: 13 },
  { name: "Gardiens Ascendants", nameEn: "Guardians Rising", slug: "gardiens-ascendants", abbreviation: "SL02", blocSlug: "soleil-lune", imageUrl: "/images/series/gardiens-ascendants.png", releaseDate: "2017-05-05", order: 14 },
  { name: "Soleil et Lune", nameEn: "Sun & Moon", slug: "soleil-et-lune", abbreviation: "SL01", blocSlug: "soleil-lune", imageUrl: "/images/series/soleil-et-lune.png", releaseDate: "2017-02-03", order: 15 },
  // XY
  { name: "Évolutions XY", nameEn: "Evolutions", slug: "evolutions-xy", abbreviation: "XY12", blocSlug: "xy", imageUrl: "/images/series/evolutions-xy.png", releaseDate: "2016-11-02", order: 0 },
  { name: "Offensive Vapeur", nameEn: "Steam Siege", slug: "offensive-vapeur", abbreviation: "XY11", blocSlug: "xy", imageUrl: "/images/series/offensive-vapeur.png", releaseDate: "2016-08-03", order: 1 },
  { name: "Impact des Destins", nameEn: "Fates Collide", slug: "impact-des-destins", abbreviation: "XY10", blocSlug: "xy", imageUrl: "/images/series/impact-des-destins.png", releaseDate: "2016-05-02", order: 2 },
  { name: "Générations", nameEn: "Generations", slug: "generations", abbreviation: "XY9.5", blocSlug: "xy", imageUrl: "/images/series/generations.png", releaseDate: "2016-02-22", order: 3 },
  { name: "Rupture Turbo", nameEn: "BREAKpoint", slug: "rupture-turbo", abbreviation: "XY09", blocSlug: "xy", imageUrl: "/images/series/rupture-turbo.png", releaseDate: "2016-02-03", order: 4 },
  { name: "Impulsion Turbo", nameEn: "BREAKthrough", slug: "impulsion-turbo", abbreviation: "XY08", blocSlug: "xy", imageUrl: "/images/series/impulsion-turbo.png", releaseDate: "2015-11-04", order: 5 },
  { name: "Origines Antiques", nameEn: "Ancient Origins", slug: "origines-antiques", abbreviation: "XY07", blocSlug: "xy", imageUrl: "/images/series/origines-antiques.png", releaseDate: "2015-08-12", order: 6 },
  { name: "Double Danger", nameEn: "Double Crisis", slug: "double-danger", abbreviation: "XY6.5", blocSlug: "xy", imageUrl: "/images/series/double-danger.png", releaseDate: "2015-03-25", order: 7 },
  { name: "Ciel Rugissant", nameEn: "Roaring Skies", slug: "ciel-rugissant", abbreviation: "XY06", blocSlug: "xy", imageUrl: "/images/series/ciel-rugissant.png", releaseDate: "2015-05-06", order: 8 },
  { name: "Primo-Choc", nameEn: "Primal Clash", slug: "primo-choc", abbreviation: "XY05", blocSlug: "xy", imageUrl: "/images/series/primo-choc.png", releaseDate: "2015-02-04", order: 9 },
  { name: "Vigueur Spectrale", nameEn: "Phantom Forces", slug: "vigueur-spectrale", abbreviation: "XY04", blocSlug: "xy", imageUrl: "/images/series/vigueur-spectrale.png", releaseDate: "2014-11-05", order: 10 },
  { name: "Poings Furieux", nameEn: "Furious Fists", slug: "poings-furieux", abbreviation: "XY03", blocSlug: "xy", imageUrl: "/images/series/poings-furieux.png", releaseDate: "2014-08-13", order: 11 },
  { name: "Étincelles", nameEn: "Flashfire", slug: "etincelles-xy", abbreviation: "XY02", blocSlug: "xy", imageUrl: "/images/series/etincelles-xy.png", releaseDate: "2014-05-07", order: 12 },
  { name: "XY", nameEn: "XY", slug: "xy-base", abbreviation: "XY01", blocSlug: "xy", imageUrl: "/images/series/xy-base.png", releaseDate: "2014-02-05", order: 13 },
  // Noir & Blanc
  { name: "Explosion Plasma", nameEn: "Plasma Blast", slug: "explosion-plasma", abbreviation: "NB10", blocSlug: "noir-blanc", imageUrl: "/images/series/explosion-plasma.png", releaseDate: "2013-08-14", order: 0 },
  { name: "Glaciation Plasma", nameEn: "Plasma Freeze", slug: "glaciation-plasma", abbreviation: "NB09", blocSlug: "noir-blanc", imageUrl: "/images/series/glaciation-plasma.png", releaseDate: "2013-05-08", order: 1 },
  { name: "Tempête Plasma", nameEn: "Plasma Storm", slug: "tempete-plasma", abbreviation: "NB08", blocSlug: "noir-blanc", imageUrl: "/images/series/tempete-plasma.png", releaseDate: "2013-02-06", order: 2 },
  { name: "Frontières Franchies", nameEn: "Boundaries Crossed", slug: "frontieres-franchies", abbreviation: "NB07", blocSlug: "noir-blanc", imageUrl: "/images/series/frontieres-franchies.png", releaseDate: "2012-11-07", order: 3 },
  { name: "Dragons Exaltés", nameEn: "Dragons Exalted", slug: "dragons-exaltes", abbreviation: "NB06", blocSlug: "noir-blanc", imageUrl: "/images/series/dragons-exaltes.png", releaseDate: "2012-08-15", order: 4 },
  { name: "Explorateurs Obscurs", nameEn: "Dark Explorers", slug: "explorateurs-obscurs", abbreviation: "NB05", blocSlug: "noir-blanc", imageUrl: "/images/series/explorateurs-obscurs.png", releaseDate: "2012-05-09", order: 5 },
  { name: "Destinées Futures", nameEn: "Next Destinies", slug: "destinees-futures", abbreviation: "NB04", blocSlug: "noir-blanc", imageUrl: "/images/series/destinees-futures.png", releaseDate: "2012-02-08", order: 6 },
  { name: "Nobles Victoires", nameEn: "Noble Victories", slug: "nobles-victoires", abbreviation: "NB03", blocSlug: "noir-blanc", imageUrl: "/images/series/nobles-victoires.png", releaseDate: "2011-11-16", order: 7 },
  { name: "Pouvoirs Émergents", nameEn: "Emerging Powers", slug: "pouvoirs-emergents", abbreviation: "NB02", blocSlug: "noir-blanc", imageUrl: "/images/series/pouvoirs-emergents.png", releaseDate: "2011-08-31", order: 8 },
  { name: "Noir et Blanc", nameEn: "Black & White", slug: "noir-et-blanc", abbreviation: "NB01", blocSlug: "noir-blanc", imageUrl: "/images/series/noir-et-blanc.png", releaseDate: "2011-04-25", order: 9 },
  // HeartGold SoulSilver
  { name: "Triomphant", nameEn: "Triumphant", slug: "triomphe", abbreviation: "HGSS4", blocSlug: "heartgold-soulsilver", imageUrl: "/images/series/triomphe.png", releaseDate: "2010-11-03", order: 0 },
  { name: "Indomptable", nameEn: "Undaunted", slug: "indomptable", abbreviation: "HGSS3", blocSlug: "heartgold-soulsilver", imageUrl: "/images/series/indomptable.png", releaseDate: "2010-08-18", order: 1 },
  { name: "Déchaînement", nameEn: "Unleashed", slug: "dechainement", abbreviation: "HGSS2", blocSlug: "heartgold-soulsilver", imageUrl: "/images/series/dechainement.png", releaseDate: "2010-05-12", order: 2 },
  { name: "HeartGold SoulSilver", nameEn: "HeartGold SoulSilver", slug: "heartgold-soulsilver-base", abbreviation: "HGSS1", blocSlug: "heartgold-soulsilver", imageUrl: "/images/series/heartgold-soulsilver-base.png", releaseDate: "2010-02-10", order: 3 },
  // Platine
  { name: "Vainqueurs Suprêmes", nameEn: "Supreme Victors", slug: "vainqueurs-supremes", abbreviation: "PL3", blocSlug: "platine", imageUrl: "/images/series/vainqueurs-supremes.png", releaseDate: "2009-08-19", order: 0 },
  { name: "Rivaux Émergeants", nameEn: "Rising Rivals", slug: "rivaux-emergeants", abbreviation: "PL2", blocSlug: "platine", imageUrl: "/images/series/rivaux-emergeants.png", releaseDate: "2009-05-13", order: 1 },
  { name: "Platine", nameEn: "Platinum", slug: "platine-base", abbreviation: "PL1", blocSlug: "platine", imageUrl: "/images/series/platine-base.png", releaseDate: "2009-02-11", order: 2 },
  // Diamant & Perle
  { name: "Éveil des Légendes", nameEn: "Legends Awakened", slug: "eveil-des-legendes", abbreviation: "DP6", blocSlug: "diamant-perle", imageUrl: "/images/series/eveil-des-legendes.png", releaseDate: "2008-08-20", order: 0 },
  { name: "Aube Majestueuse", nameEn: "Majestic Dawn", slug: "aube-majestueuse", abbreviation: "DP5", blocSlug: "diamant-perle", imageUrl: "/images/series/aube-majestueuse.png", releaseDate: "2008-05-21", order: 1 },
  { name: "Trésors Mystérieux", nameEn: "Mysterious Treasures", slug: "tresors-mysterieux", abbreviation: "DP2", blocSlug: "diamant-perle", imageUrl: "/images/series/tresors-mysterieux.png", releaseDate: "2007-08-22", order: 2 },
  { name: "Diamant et Perle", nameEn: "Diamond & Pearl", slug: "diamant-et-perle", abbreviation: "DP1", blocSlug: "diamant-perle", imageUrl: "/images/series/diamant-et-perle.png", releaseDate: "2007-05-23", order: 3 },
];

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 Mode dry-run — aucune écriture en DB\n");

  // ── Blocs ──────────────────────────────────────────────────────────────────
  console.log(`\n📂 Seeding ${BLOCS_DATA.length} blocs…`);
  for (const bloc of BLOCS_DATA) {
    process.stdout.write(`  ${bloc.slug.padEnd(25)}`);
    if (!dryRun) {
      await prisma.bloc.upsert({
        where: { slug: bloc.slug },
        create: {
          name: bloc.name,
          nameEn: bloc.nameEn,
          slug: bloc.slug,
          abbreviation: bloc.abbreviation,
          logoUrl: bloc.logoUrl,
          imageUrl: bloc.imageUrl,
          startDate: bloc.startDate ? new Date(bloc.startDate) : null,
          endDate: bloc.endDate ? new Date(bloc.endDate) : null,
          order: bloc.order,
        },
        update: {
          name: bloc.name,
          nameEn: bloc.nameEn,
          abbreviation: bloc.abbreviation,
          imageUrl: bloc.imageUrl,
          startDate: bloc.startDate ? new Date(bloc.startDate) : null,
          endDate: bloc.endDate ? new Date(bloc.endDate) : null,
          order: bloc.order,
        },
      });
    }
    console.log("✅");
  }

  if (dryRun) {
    console.log(`\n📋 ${SERIES_DATA.length} séries à seeder (dry-run)\n`);
    console.log("✅ Terminé (dry-run)");
    return;
  }

  // ── Séries ─────────────────────────────────────────────────────────────────
  const blocsInDb = await prisma.bloc.findMany({ select: { id: true, slug: true } });
  const blocBySlug = new Map(blocsInDb.map((b) => [b.slug, b.id]));

  console.log(`\n📋 Seeding ${SERIES_DATA.length} séries…`);
  let ok = 0;
  let skipped = 0;

  for (const serie of SERIES_DATA) {
    process.stdout.write(`  ${serie.slug.padEnd(40)}`);
    const blocId = blocBySlug.get(serie.blocSlug);
    if (!blocId) {
      console.log(`⚠ bloc "${serie.blocSlug}" introuvable`);
      skipped++;
      continue;
    }
    await prisma.serie.upsert({
      where: { slug: serie.slug },
      create: {
        blocId,
        name: serie.name,
        nameEn: serie.nameEn,
        slug: serie.slug,
        abbreviation: serie.abbreviation ?? null,
        imageUrl: serie.imageUrl ?? null,
        bannerUrl: null,
        releaseDate: serie.releaseDate ? new Date(serie.releaseDate) : null,
        cardCount: 0,
        order: serie.order,
      },
      update: {
        name: serie.name,
        nameEn: serie.nameEn,
        abbreviation: serie.abbreviation ?? null,
        imageUrl: serie.imageUrl ?? null,
        order: serie.order,
      },
    });
    console.log("✅");
    ok++;
  }

  console.log(`\n✅ ${ok} séries seedées, ${skipped} ignorées`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
