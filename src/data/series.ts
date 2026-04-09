// ---------------------------------------------------------------------------
// Static data – All Pokémon TCG series (French market)
// ---------------------------------------------------------------------------

import type { Serie } from '@/types/item';

type SerieStatic = Omit<Serie, 'id' | 'blocId' | 'cardCount' | 'bannerUrl' | 'bloc' | 'items' | 'releaseDate'> & {
  blocSlug: string;
  releaseDate: string | null;
};

// ==========================================================================
// Méga-Évolution (ME)
// ==========================================================================

const MEGA_EVOLUTION_SERIES: SerieStatic[] = [
  { name: 'Équilibre Parfait', nameEn: 'Perfect Balance', slug: 'equilibre-parfait', abbreviation: 'ME03', blocSlug: 'mega-evolution', imageUrl: '/images/series/equilibre-parfait.png', releaseDate: '2026-03-27', order: 0 },
  { name: 'Héros Transcendants', nameEn: 'Transcendent Heroes', slug: 'heros-transcendants', abbreviation: 'ME2.5', blocSlug: 'mega-evolution', imageUrl: '/images/series/heros-transcendants.png', releaseDate: '2026-01-30', order: 1 },
  { name: 'Flammes Fantasmagoriques', nameEn: 'Phantasmagoric Flames', slug: 'flammes-fantasmagoriques', abbreviation: 'ME02', blocSlug: 'mega-evolution', imageUrl: '/images/series/flammes-fantasmagoriques.png', releaseDate: '2025-11-14', order: 2 },
  { name: 'Méga-Évolution', nameEn: 'Mega Evolution', slug: 'mega-evolution', abbreviation: 'ME01', blocSlug: 'mega-evolution', imageUrl: '/images/series/mega-evolution.png', releaseDate: '2025-09-26', order: 3 },
  { name: 'Énergies Méga-Évolution', nameEn: 'Mega Evolution Energies', slug: 'energies-mega-evolution', abbreviation: 'MEE', blocSlug: 'mega-evolution', imageUrl: '/images/series/energies-mega-evolution.png', releaseDate: null, order: 20 },
  { name: 'Promos Méga-Évolution', nameEn: 'Mega Evolution Promos', slug: 'promos-mega-evolution', abbreviation: 'MEP', blocSlug: 'mega-evolution', imageUrl: '/images/series/promos-mega-evolution.png', releaseDate: null, order: 21 },
];

// ==========================================================================
// Écarlate & Violet (EV)
// ==========================================================================

const ECARLATE_VIOLET_SERIES: SerieStatic[] = [
  { name: 'Flamme Blanche', nameEn: 'White Flame', slug: 'flamme-blanche', abbreviation: 'EV10.5W', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/flamme-blanche.png', releaseDate: '2025-07-01', order: 0 },
  { name: 'Foudre Noire', nameEn: 'Black Lightning', slug: 'foudre-noire', abbreviation: 'EV10.5B', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/foudre-noire.png', releaseDate: '2025-07-01', order: 0 },
  { name: 'Rivalités Destinées', nameEn: 'Destined Rivals', slug: 'rivalites-destinees', abbreviation: 'EV10', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/rivalites-destinees.png', releaseDate: '2025-05-30', order: 1 },
  { name: 'Aventures Ensemble', nameEn: 'Adventures Together', slug: 'aventures-ensemble', abbreviation: 'EV09', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/aventures-ensemble.png', releaseDate: '2025-03-28', order: 2 },
  { name: 'Évolutions Prismatiques', nameEn: 'Prismatic Evolutions', slug: 'evolutions-prismatiques', abbreviation: 'EV8.5', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/evolutions-prismatiques.png', releaseDate: '2025-01-17', order: 3 },
  { name: 'Étincelles Déferlantes', nameEn: 'Surging Sparks', slug: 'etincelles-deferlantes', abbreviation: 'EV08', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/etincelles-deferlantes.png', releaseDate: '2024-11-08', order: 4 },
  { name: 'Couronne Stellaire', nameEn: 'Stellar Crown', slug: 'couronne-stellaire', abbreviation: 'EV07', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/couronne-stellaire.png', releaseDate: '2024-09-13', order: 5 },
  { name: 'Fable Nébuleuse', nameEn: 'Shrouded Fable', slug: 'fable-nebuleuse', abbreviation: 'EV6.5', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/fable-nebuleuse.png', releaseDate: '2024-08-02', order: 6 },
  { name: 'Mascarade Crépusculaire', nameEn: 'Twilight Masquerade', slug: 'mascarade-crepusculaire', abbreviation: 'EV06', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/mascarade-crepusculaire.png', releaseDate: '2024-05-24', order: 7 },
  { name: 'Forces Temporelles', nameEn: 'Temporal Forces', slug: 'forces-temporelles', abbreviation: 'EV05', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/forces-temporelles.png', releaseDate: '2024-03-22', order: 8 },
  { name: 'Destinées de Paldea', nameEn: 'Paldean Fates', slug: 'destinees-de-paldea', abbreviation: 'EV4.5', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/destinees-de-paldea.png', releaseDate: '2024-01-26', order: 9 },
  { name: 'Faille Paradoxe', nameEn: 'Paradox Rift', slug: 'faille-paradoxe', abbreviation: 'EV04', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/faille-paradoxe.png', releaseDate: '2023-11-03', order: 10 },
  { name: 'Pokémon 151', nameEn: '151', slug: 'pokemon-151', abbreviation: 'EV3.5', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/pokemon-151.png', releaseDate: '2023-09-22', order: 11 },
  { name: 'Flammes Obsidiennes', nameEn: 'Obsidian Flames', slug: 'flammes-obsidiennes', abbreviation: 'EV03', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/flammes-obsidiennes.png', releaseDate: '2023-08-11', order: 12 },
  { name: 'Évolutions à Paldea', nameEn: 'Paldea Evolved', slug: 'evolutions-a-paldea', abbreviation: 'EV02', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/evolutions-a-paldea.png', releaseDate: '2023-06-09', order: 13 },
  { name: 'Écarlate et Violet', nameEn: 'Scarlet & Violet', slug: 'ecarlate-et-violet', abbreviation: 'EV01', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/ecarlate-et-violet.png', releaseDate: '2023-03-31', order: 14 },
  { name: 'Promos Écarlate et Violet', nameEn: 'Scarlet & Violet Promos', slug: 'promos-ecarlate-et-violet', abbreviation: 'SVP', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/promos-ecarlate-et-violet.png', releaseDate: null, order: 20 },
  { name: 'Énergies Écarlate et Violet', nameEn: 'Scarlet & Violet Energies', slug: 'energies-ecarlate-et-violet', abbreviation: 'SVE', blocSlug: 'ecarlate-violet', imageUrl: '/images/series/energies-ecarlate-et-violet.png', releaseDate: null, order: 21 },
];

// ==========================================================================
// Épée & Bouclier (EB)
// ==========================================================================

const EPEE_BOUCLIER_SERIES: SerieStatic[] = [
  { name: 'Zénith Suprême', nameEn: 'Crown Zenith', slug: 'zenith-supreme', abbreviation: 'EB12.5', blocSlug: 'epee-bouclier', imageUrl: '/images/series/zenith-supreme.png', releaseDate: '2023-01-20', order: 0 },
  { name: 'Tempête Argentée', nameEn: 'Silver Tempest', slug: 'tempete-argentee', abbreviation: 'EB12', blocSlug: 'epee-bouclier', imageUrl: '/images/series/tempete-argentee.png', releaseDate: '2022-11-11', order: 1 },
  { name: 'Origine Perdue', nameEn: 'Lost Origin', slug: 'origine-perdue', abbreviation: 'EB11', blocSlug: 'epee-bouclier', imageUrl: '/images/series/origine-perdue.png', releaseDate: '2022-09-09', order: 2 },
  { name: 'Pokémon GO', nameEn: 'Pokémon GO', slug: 'pokemon-go', abbreviation: 'EB10.5', blocSlug: 'epee-bouclier', imageUrl: '/images/series/pokemon-go.png', releaseDate: '2022-07-01', order: 3 },
  { name: 'Astres Radieux', nameEn: 'Astral Radiance', slug: 'astres-radieux', abbreviation: 'EB10', blocSlug: 'epee-bouclier', imageUrl: '/images/series/astres-radieux.png', releaseDate: '2022-05-27', order: 4 },
  { name: 'Stars Étincelantes', nameEn: 'Shining Fates', slug: 'stars-etincelantes', abbreviation: 'EB09', blocSlug: 'epee-bouclier', imageUrl: '/images/series/stars-etincelantes.png', releaseDate: '2021-11-19', order: 6 },
  { name: 'Poing de Fusion', nameEn: 'Fusion Strike', slug: 'poing-de-fusion', abbreviation: 'EB08', blocSlug: 'epee-bouclier', imageUrl: '/images/series/poing-de-fusion.png', releaseDate: '2021-11-12', order: 7 },
  { name: 'Évolution Céleste', nameEn: 'Evolving Skies', slug: 'evolution-celeste', abbreviation: 'EB07', blocSlug: 'epee-bouclier', imageUrl: '/images/series/evolution-celeste.png', releaseDate: '2021-08-27', order: 8 },
  { name: 'Règne de Glace', nameEn: 'Chilling Reign', slug: 'regne-de-glace', abbreviation: 'EB06', blocSlug: 'epee-bouclier', imageUrl: '/images/series/regne-de-glace.png', releaseDate: '2021-06-18', order: 9 },
  { name: 'Styles de Combat', nameEn: 'Battle Styles', slug: 'styles-de-combat', abbreviation: 'EB05', blocSlug: 'epee-bouclier', imageUrl: '/images/series/styles-de-combat.png', releaseDate: '2021-03-19', order: 10 },
  { name: 'Destinées Radieuses', nameEn: 'Shining Fates', slug: 'destinees-radieuses', abbreviation: 'EB04.5', blocSlug: 'epee-bouclier', imageUrl: '/images/series/destinees-radieuses.png', releaseDate: '2021-02-19', order: 11 },
  { name: 'Voltage Éclatant', nameEn: 'Vivid Voltage', slug: 'voltage-eclatant', abbreviation: 'EB04', blocSlug: 'epee-bouclier', imageUrl: '/images/series/voltage-eclatant.png', releaseDate: '2020-11-13', order: 12 },
  { name: 'La Voie du Maître', nameEn: "Champion's Path", slug: 'la-voie-du-maitre', abbreviation: 'EB03.5', blocSlug: 'epee-bouclier', imageUrl: '/images/series/la-voie-du-maitre.png', releaseDate: '2020-09-25', order: 13 },
  { name: 'Ténèbres Embrasées', nameEn: 'Darkness Ablaze', slug: 'tenebres-embrasees', abbreviation: 'EB03', blocSlug: 'epee-bouclier', imageUrl: '/images/series/tenebres-embrasees.png', releaseDate: '2020-08-14', order: 14 },
  { name: 'Clash des Rebelles', nameEn: 'Rebel Clash', slug: 'clash-des-rebelles', abbreviation: 'EB02', blocSlug: 'epee-bouclier', imageUrl: '/images/series/clash-des-rebelles.png', releaseDate: '2020-05-01', order: 15 },
  { name: 'Épée et Bouclier', nameEn: 'Sword & Shield', slug: 'epee-et-bouclier', abbreviation: 'EB01', blocSlug: 'epee-bouclier', imageUrl: '/images/series/epee-et-bouclier.png', releaseDate: '2020-02-07', order: 16 },
  { name: 'Célébrations', nameEn: 'Celebrations', slug: 'celebrations', abbreviation: 'EB-CEL', blocSlug: 'epee-bouclier', imageUrl: '/images/series/celebrations.png', releaseDate: '2021-10-08', order: 17 },
  { name: 'Promos Épée et Bouclier', nameEn: 'Sword & Shield Promos', slug: 'promos-epee-et-bouclier', abbreviation: 'SWSHP', blocSlug: 'epee-bouclier', imageUrl: '/images/series/promos-epee-et-bouclier.png', releaseDate: null, order: 20 },
];

// ==========================================================================
// Soleil & Lune (SL)
// ==========================================================================

const SOLEIL_LUNE_SERIES: SerieStatic[] = [
  { name: 'Destinées Occultes', nameEn: 'Hidden Fates', slug: 'destinees-occultes', abbreviation: 'SL12.5', blocSlug: 'soleil-lune', imageUrl: '/images/series/destinees-occultes.png', releaseDate: '2019-11-15', order: 0 },
  { name: 'Éclipse Cosmique', nameEn: 'Cosmic Eclipse', slug: 'eclipse-cosmique', abbreviation: 'SL12', blocSlug: 'soleil-lune', imageUrl: '/images/series/eclipse-cosmique.png', releaseDate: '2019-11-01', order: 1 },
  { name: 'Méga-Donjon', nameEn: 'Mega Dungeon', slug: 'mega-donjon', abbreviation: 'SL11.5', blocSlug: 'soleil-lune', imageUrl: null, releaseDate: '2019-08-02', order: 2 },
  { name: 'Harmonie des Esprits', nameEn: 'Unified Minds', slug: 'harmonie-des-esprits', abbreviation: 'SL11', blocSlug: 'soleil-lune', imageUrl: '/images/series/harmonie-des-esprits.png', releaseDate: '2019-08-02', order: 3 },
  { name: 'Alliance Infaillible', nameEn: 'Unbroken Bonds', slug: 'alliance-infaillible', abbreviation: 'SL10', blocSlug: 'soleil-lune', imageUrl: '/images/series/alliance-infaillible.png', releaseDate: '2019-05-03', order: 4 },
  { name: 'Duo de Choc', nameEn: 'Team Up', slug: 'duo-de-choc', abbreviation: 'SL09', blocSlug: 'soleil-lune', imageUrl: '/images/series/duo-de-choc.png', releaseDate: '2019-02-01', order: 5 },
  { name: 'Tonnerre Perdu', nameEn: 'Lost Thunder', slug: 'tonnerre-perdu', abbreviation: 'SL08', blocSlug: 'soleil-lune', imageUrl: '/images/series/tonnerre-perdu.png', releaseDate: '2018-11-02', order: 6 },
  { name: 'Majesté des Dragons', nameEn: 'Dragon Majesty', slug: 'majeste-des-dragons', abbreviation: 'SL07.5', blocSlug: 'soleil-lune', imageUrl: '/images/series/majeste-des-dragons.png', releaseDate: '2018-09-07', order: 7 },
  { name: 'Tempête Céleste', nameEn: 'Celestial Storm', slug: 'tempete-celeste', abbreviation: 'SL07', blocSlug: 'soleil-lune', imageUrl: '/images/series/tempete-celeste.png', releaseDate: '2018-08-03', order: 8 },
  { name: 'Lumière Interdite', nameEn: 'Forbidden Light', slug: 'lumiere-interdite', abbreviation: 'SL06', blocSlug: 'soleil-lune', imageUrl: '/images/series/lumiere-interdite.png', releaseDate: '2018-05-04', order: 9 },
  { name: 'Ultra-Prisme', nameEn: 'Ultra Prism', slug: 'ultra-prisme', abbreviation: 'SL05', blocSlug: 'soleil-lune', imageUrl: '/images/series/ultra-prisme.png', releaseDate: '2018-02-02', order: 10 },
  { name: 'Invasion Carmin', nameEn: 'Crimson Invasion', slug: 'invasion-carmin', abbreviation: 'SL04', blocSlug: 'soleil-lune', imageUrl: '/images/series/invasion-carmin.png', releaseDate: '2017-11-03', order: 11 },
  { name: 'Ombres Ardentes', nameEn: 'Burning Shadows', slug: 'ombres-ardentes', abbreviation: 'SL03', blocSlug: 'soleil-lune', imageUrl: '/images/series/ombres-ardentes.png', releaseDate: '2017-08-04', order: 12 },
  { name: 'Gardiens Ascendants', nameEn: 'Guardians Rising', slug: 'gardiens-ascendants', abbreviation: 'SL02', blocSlug: 'soleil-lune', imageUrl: '/images/series/gardiens-ascendants.png', releaseDate: '2017-05-05', order: 13 },
  { name: 'Soleil et Lune', nameEn: 'Sun & Moon', slug: 'soleil-et-lune', abbreviation: 'SL01', blocSlug: 'soleil-lune', imageUrl: '/images/series/soleil-et-lune.png', releaseDate: '2017-02-03', order: 14 },
  { name: 'Légendes Brillantes', nameEn: 'Shining Legends', slug: 'legendes-brillantes', abbreviation: 'SL-LB', blocSlug: 'soleil-lune', imageUrl: '/images/series/legendes-brillantes.png', releaseDate: '2017-10-06', order: 15 },
  { name: 'Promos Soleil et Lune', nameEn: 'Sun & Moon Promos', slug: 'promos-soleil-et-lune', abbreviation: 'SMP', blocSlug: 'soleil-lune', imageUrl: '/images/series/promos-soleil-et-lune.png', releaseDate: null, order: 20 },
];

// ==========================================================================
// XY
// ==========================================================================

const XY_SERIES: SerieStatic[] = [
  { name: 'Évolutions', nameEn: 'Evolutions', slug: 'evolutions-xy', abbreviation: 'XY12', blocSlug: 'xy', imageUrl: '/images/series/evolutions-xy.png', releaseDate: '2016-11-02', order: 0 },
  { name: 'Offensive Vapeur', nameEn: 'Steam Siege', slug: 'offensive-vapeur', abbreviation: 'XY11', blocSlug: 'xy', imageUrl: '/images/series/offensive-vapeur.png', releaseDate: '2016-08-03', order: 1 },
  { name: 'Impact des Destins', nameEn: 'Fates Collide', slug: 'impact-des-destins', abbreviation: 'XY10', blocSlug: 'xy', imageUrl: '/images/series/impact-des-destins.png', releaseDate: '2016-05-04', order: 2 },
  { name: 'Rupture TURBO', nameEn: 'BREAKpoint', slug: 'rupture-turbo', abbreviation: 'XY09', blocSlug: 'xy', imageUrl: '/images/series/rupture-turbo.png', releaseDate: '2016-02-03', order: 3 },
  { name: 'Impulsion TURBO', nameEn: 'BREAKthrough', slug: 'impulsion-turbo', abbreviation: 'XY08', blocSlug: 'xy', imageUrl: '/images/series/impulsion-turbo.png', releaseDate: '2015-11-04', order: 4 },
  { name: 'Origines Antiques', nameEn: 'Ancient Origins', slug: 'origines-antiques', abbreviation: 'XY07', blocSlug: 'xy', imageUrl: '/images/series/origines-antiques.png', releaseDate: '2015-08-12', order: 5 },
  { name: 'Ciel Rugissant', nameEn: 'Roaring Skies', slug: 'ciel-rugissant', abbreviation: 'XY06', blocSlug: 'xy', imageUrl: '/images/series/ciel-rugissant.png', releaseDate: '2015-05-06', order: 6 },
  { name: 'Primo-Choc', nameEn: 'Primal Clash', slug: 'primo-choc', abbreviation: 'XY05', blocSlug: 'xy', imageUrl: '/images/series/primo-choc.png', releaseDate: '2015-02-04', order: 7 },
  { name: 'Vigueur Spectrale', nameEn: 'Phantom Forces', slug: 'vigueur-spectrale', abbreviation: 'XY04', blocSlug: 'xy', imageUrl: '/images/series/vigueur-spectrale.png', releaseDate: '2014-11-05', order: 8 },
  { name: 'Poings Furieux', nameEn: 'Furious Fists', slug: 'poings-furieux', abbreviation: 'XY03', blocSlug: 'xy', imageUrl: '/images/series/poings-furieux.png', releaseDate: '2014-08-13', order: 9 },
  { name: 'Étincelles', nameEn: 'Flashfire', slug: 'etincelles-xy', abbreviation: 'XY02', blocSlug: 'xy', imageUrl: '/images/series/etincelles-xy.png', releaseDate: '2014-05-07', order: 10 },
  { name: 'XY', nameEn: 'XY', slug: 'xy-base', abbreviation: 'XY01', blocSlug: 'xy', imageUrl: '/images/series/xy-base.png', releaseDate: '2014-02-05', order: 11 },
  { name: 'Générations', nameEn: 'Generations', slug: 'generations', abbreviation: 'XY-GEN', blocSlug: 'xy', imageUrl: '/images/series/generations.png', releaseDate: '2016-02-22', order: 12 },
  { name: 'Double Danger', nameEn: 'Double Crisis', slug: 'double-danger', abbreviation: 'XY-DD', blocSlug: 'xy', imageUrl: '/images/series/double-danger.png', releaseDate: '2015-03-11', order: 13 },
  { name: 'Promos X&Y', nameEn: 'XY Promos', slug: 'promos-xy', abbreviation: 'XYP', blocSlug: 'xy', imageUrl: '/images/series/promos-xy.png', releaseDate: null, order: 20 },
  { name: 'Bienvenue à Kalos', nameEn: 'Welcome to Kalos', slug: 'bienvenue-a-kalos', abbreviation: 'XY0', blocSlug: 'xy', imageUrl: '/images/series/bienvenue-a-kalos.png', releaseDate: null, order: 21 },
];

// ==========================================================================
// Noir & Blanc (NB)
// ==========================================================================

const NOIR_BLANC_SERIES: SerieStatic[] = [
  { name: 'Legendary Treasures', nameEn: 'Legendary Treasures', slug: 'legendary-treasures', abbreviation: 'NB11', blocSlug: 'noir-blanc', imageUrl: '/images/series/legendary-treasures.png', releaseDate: '2013-11-06', order: 0 },
  { name: 'Explosion Plasma', nameEn: 'Plasma Blast', slug: 'explosion-plasma', abbreviation: 'NB10', blocSlug: 'noir-blanc', imageUrl: '/images/series/explosion-plasma.png', releaseDate: '2013-08-07', order: 1 },
  { name: 'Glaciation Plasma', nameEn: 'Plasma Freeze', slug: 'glaciation-plasma', abbreviation: 'NB09', blocSlug: 'noir-blanc', imageUrl: '/images/series/glaciation-plasma.png', releaseDate: '2013-05-08', order: 2 },
  { name: 'Tempête Plasma', nameEn: 'Plasma Storm', slug: 'tempete-plasma', abbreviation: 'NB08', blocSlug: 'noir-blanc', imageUrl: '/images/series/tempete-plasma.png', releaseDate: '2013-02-06', order: 3 },
  { name: 'Frontières Franchies', nameEn: 'Boundaries Crossed', slug: 'frontieres-franchies', abbreviation: 'NB07', blocSlug: 'noir-blanc', imageUrl: '/images/series/frontieres-franchies.png', releaseDate: '2012-11-07', order: 4 },
  { name: 'Dragons Exaltés', nameEn: 'Dragons Exalted', slug: 'dragons-exaltes', abbreviation: 'NB06', blocSlug: 'noir-blanc', imageUrl: '/images/series/dragons-exaltes.png', releaseDate: '2012-08-15', order: 5 },
  { name: 'Explorateurs Obscurs', nameEn: 'Dark Explorers', slug: 'explorateurs-obscurs', abbreviation: 'NB05', blocSlug: 'noir-blanc', imageUrl: '/images/series/explorateurs-obscurs.png', releaseDate: '2012-05-09', order: 6 },
  { name: 'Destinées Futures', nameEn: 'Next Destinies', slug: 'destinees-futures', abbreviation: 'NB04', blocSlug: 'noir-blanc', imageUrl: '/images/series/destinees-futures.png', releaseDate: '2012-02-08', order: 7 },
  { name: 'Nobles Victoires', nameEn: 'Noble Victories', slug: 'nobles-victoires', abbreviation: 'NB03', blocSlug: 'noir-blanc', imageUrl: '/images/series/nobles-victoires.png', releaseDate: '2011-11-16', order: 8 },
  { name: 'Pouvoirs Émergents', nameEn: 'Emerging Powers', slug: 'pouvoirs-emergents', abbreviation: 'NB02', blocSlug: 'noir-blanc', imageUrl: '/images/series/pouvoirs-emergents.png', releaseDate: '2011-08-31', order: 9 },
  { name: 'Noir & Blanc', nameEn: 'Black & White', slug: 'noir-et-blanc', abbreviation: 'NB01', blocSlug: 'noir-blanc', imageUrl: '/images/series/noir-et-blanc.png', releaseDate: '2011-03-25', order: 10 },
  { name: 'Promos Noir et Blanc', nameEn: 'Black & White Promos', slug: 'promos-noir-et-blanc', abbreviation: 'BWP', blocSlug: 'noir-blanc', imageUrl: '/images/series/promos-noir-et-blanc.png', releaseDate: null, order: 20 },
  { name: 'Coffre des Dragons', nameEn: 'Dragon Vault', slug: 'coffre-des-dragons', abbreviation: 'DV1', blocSlug: 'noir-blanc', imageUrl: '/images/series/coffre-des-dragons.png', releaseDate: null, order: 21 },
];

// ==========================================================================
// HeartGold SoulSilver (HGSS)
// ==========================================================================

const HGSS_SERIES: SerieStatic[] = [
  { name: 'Triomphe', nameEn: 'Triumphant', slug: 'triomphe', abbreviation: 'HGSS04', blocSlug: 'heartgold-soulsilver', imageUrl: '/images/series/triomphe.png', releaseDate: '2010-11-03', order: 0 },
  { name: 'Indomptable', nameEn: 'Undaunted', slug: 'indomptable', abbreviation: 'HGSS03', blocSlug: 'heartgold-soulsilver', imageUrl: '/images/series/indomptable.png', releaseDate: '2010-08-18', order: 1 },
  { name: 'Déchaînement', nameEn: 'Unleashed', slug: 'dechainement', abbreviation: 'HGSS02', blocSlug: 'heartgold-soulsilver', imageUrl: '/images/series/dechainement.png', releaseDate: '2010-05-26', order: 2 },
  { name: 'HeartGold SoulSilver', nameEn: 'HeartGold SoulSilver', slug: 'heartgold-soulsilver-base', abbreviation: 'HGSS01', blocSlug: 'heartgold-soulsilver', imageUrl: '/images/series/heartgold-soulsilver-base.png', releaseDate: '2010-02-10', order: 3 },
  { name: 'Promos HeartGold SoulSilver', nameEn: 'HeartGold SoulSilver Promos', slug: 'promos-heartgold-soulsilver', abbreviation: 'HGSSP', blocSlug: 'heartgold-soulsilver', imageUrl: '/images/series/promos-heartgold-soulsilver.png', releaseDate: null, order: 20 },
];

// ==========================================================================
// Platine (PL)
// ==========================================================================

const PLATINE_SERIES: SerieStatic[] = [
  { name: 'Arceus', nameEn: 'Arceus', slug: 'arceus', abbreviation: 'PL04', blocSlug: 'platine', imageUrl: '/images/series/arceus.png', releaseDate: '2009-11-04', order: 0 },
  { name: 'Rivaux Émergeants', nameEn: 'Rising Rivals', slug: 'rivaux-emergeants', abbreviation: 'PL03', blocSlug: 'platine', imageUrl: '/images/series/rivaux-emergeants.png', releaseDate: '2009-08-19', order: 1 },
  { name: 'Vainqueurs Suprêmes', nameEn: 'Supreme Victors', slug: 'vainqueurs-supremes', abbreviation: 'PL02', blocSlug: 'platine', imageUrl: '/images/series/vainqueurs-supremes.png', releaseDate: '2009-05-20', order: 2 },
  { name: 'Platine', nameEn: 'Platinum', slug: 'platine-base', abbreviation: 'PL01', blocSlug: 'platine', imageUrl: '/images/series/platine-base.png', releaseDate: '2009-02-11', order: 3 },
];

// ==========================================================================
// Diamant & Perle (DP)
// ==========================================================================

const DIAMANT_PERLE_SERIES: SerieStatic[] = [
  { name: 'Tempête', nameEn: 'Stormfront', slug: 'tempete-dp', abbreviation: 'DP07', blocSlug: 'diamant-perle', imageUrl: '/images/series/tempete-dp.png', releaseDate: '2009-02-11', order: 0 },
  { name: 'Éveil des Légendes', nameEn: 'Legends Awakened', slug: 'eveil-des-legendes', abbreviation: 'DP06', blocSlug: 'diamant-perle', imageUrl: '/images/series/eveil-des-legendes.png', releaseDate: '2008-11-05', order: 1 },
  { name: 'Aube Majestueuse', nameEn: 'Majestic Dawn', slug: 'aube-majestueuse', abbreviation: 'DP05', blocSlug: 'diamant-perle', imageUrl: '/images/series/aube-majestueuse.png', releaseDate: '2008-08-20', order: 2 },
  { name: 'Grands Envols', nameEn: 'Great Encounters', slug: 'grands-envols', abbreviation: 'DP04', blocSlug: 'diamant-perle', imageUrl: '/images/series/grands-envols.png', releaseDate: '2008-05-14', order: 3 },
  { name: 'Merveilles Secrètes', nameEn: 'Secret Wonders', slug: 'merveilles-secretes', abbreviation: 'DP03', blocSlug: 'diamant-perle', imageUrl: '/images/series/merveilles-secretes.png', releaseDate: '2007-11-07', order: 4 },
  { name: 'Trésors Mystérieux', nameEn: 'Mysterious Treasures', slug: 'tresors-mysterieux', abbreviation: 'DP02', blocSlug: 'diamant-perle', imageUrl: '/images/series/tresors-mysterieux.png', releaseDate: '2007-08-22', order: 5 },
  { name: 'Diamant & Perle', nameEn: 'Diamond & Pearl', slug: 'diamant-et-perle', abbreviation: 'DP01', blocSlug: 'diamant-perle', imageUrl: '/images/series/diamant-et-perle.png', releaseDate: '2007-05-23', order: 6 },
  { name: 'Promos Diamant et Perle', nameEn: 'Diamond & Pearl Promos', slug: 'promos-diamant-et-perle', abbreviation: 'DPP', blocSlug: 'diamant-perle', imageUrl: '/images/series/promos-diamant-et-perle.png', releaseDate: null, order: 20 },
];

// ==========================================================================
// EX
// ==========================================================================

const EX_SERIES: SerieStatic[] = [
  { name: 'Gardiens du Pouvoir', nameEn: 'Power Keepers', slug: 'gardiens-du-pouvoir', abbreviation: 'EX16', blocSlug: 'ex', imageUrl: '/images/series/gardiens-du-pouvoir.png', releaseDate: '2006-11-08', order: 0 },
  { name: 'Créateurs de Légendes', nameEn: 'Legend Maker', slug: 'createurs-de-legendes', abbreviation: 'EX15', blocSlug: 'ex', imageUrl: '/images/series/createurs-de-legendes.png', releaseDate: '2006-08-30', order: 1 },
  { name: 'Fantômes Holon', nameEn: 'Holon Phantoms', slug: 'fantomes-holon', abbreviation: 'EX14', blocSlug: 'ex', imageUrl: '/images/series/fantomes-holon.png', releaseDate: '2006-05-10', order: 2 },
  { name: 'Espèces Delta', nameEn: 'Delta Species', slug: 'especes-delta', abbreviation: 'EX13', blocSlug: 'ex', imageUrl: '/images/series/especes-delta.png', releaseDate: '2006-02-08', order: 3 },
  { name: 'Forces Cachées', nameEn: 'Unseen Forces', slug: 'forces-cachees', abbreviation: 'EX12', blocSlug: 'ex', imageUrl: '/images/series/forces-cachees.png', releaseDate: '2005-11-09', order: 4 },
  { name: 'Gardiens de Cristal', nameEn: 'Crystal Guardians', slug: 'gardiens-de-cristal', abbreviation: 'EX11', blocSlug: 'ex', imageUrl: '/images/series/gardiens-de-cristal.png', releaseDate: '2005-08-31', order: 5 },
  { name: 'Tempête de Sable', nameEn: 'Sandstorm', slug: 'tempete-de-sable', abbreviation: 'EX10', blocSlug: 'ex', imageUrl: '/images/series/tempete-de-sable.png', releaseDate: '2005-05-18', order: 6 },
  { name: 'Émeraude', nameEn: 'Emerald', slug: 'emeraude', abbreviation: 'EX09', blocSlug: 'ex', imageUrl: '/images/series/emeraude.png', releaseDate: '2005-05-09', order: 7 },
  { name: 'Deoxys', nameEn: 'Deoxys', slug: 'deoxys', abbreviation: 'EX08', blocSlug: 'ex', imageUrl: '/images/series/deoxys.png', releaseDate: '2005-02-09', order: 8 },
  { name: 'Team Rocket Returns', nameEn: 'Team Rocket Returns', slug: 'team-rocket-returns', abbreviation: 'EX07', blocSlug: 'ex', imageUrl: '/images/series/team-rocket-returns.png', releaseDate: '2004-11-08', order: 9 },
  { name: 'Fire Red & Leaf Green', nameEn: 'FireRed & LeafGreen', slug: 'fire-red-leaf-green', abbreviation: 'EX06', blocSlug: 'ex', imageUrl: '/images/series/fire-red-leaf-green.png', releaseDate: '2004-08-30', order: 10 },
  { name: 'Légendes Oubliées', nameEn: 'Hidden Legends', slug: 'legendes-oubliees', abbreviation: 'EX05', blocSlug: 'ex', imageUrl: '/images/series/legendes-oubliees.png', releaseDate: '2004-06-12', order: 11 },
  { name: 'Dragon', nameEn: 'Dragon', slug: 'dragon-ex', abbreviation: 'EX03', blocSlug: 'ex', imageUrl: '/images/series/dragon-ex.png', releaseDate: '2003-11-24', order: 12 },
  { name: 'Groudon vs Kyogre', nameEn: 'Magma vs Aqua', slug: 'groudon-vs-kyogre', abbreviation: 'EX02', blocSlug: 'ex', imageUrl: '/images/series/groudon-vs-kyogre.png', releaseDate: '2003-09-17', order: 13 },
  { name: 'Rubis & Saphir', nameEn: 'Ruby & Sapphire', slug: 'rubis-et-saphir', abbreviation: 'EX01', blocSlug: 'ex', imageUrl: '/images/series/rubis-et-saphir.png', releaseDate: '2003-06-18', order: 14 },
];

// ==========================================================================
// Wizards of the Coast (WOTC)
// ==========================================================================

const WOTC_SERIES: SerieStatic[] = [
  { name: 'Aquapolis', nameEn: 'Aquapolis', slug: 'aquapolis', abbreviation: 'WOTC-AQ', blocSlug: 'wotc', imageUrl: '/images/series/aquapolis.png', releaseDate: '2003-01-15', order: 0 },
  { name: 'Skyridge', nameEn: 'Skyridge', slug: 'skyridge', abbreviation: 'WOTC-SK', blocSlug: 'wotc', imageUrl: '/images/series/skyridge.png', releaseDate: '2003-12-17', order: 1 },
  { name: 'Expédition', nameEn: 'Expedition', slug: 'expedition', abbreviation: 'WOTC-EX', blocSlug: 'wotc', imageUrl: '/images/series/expedition.png', releaseDate: '2002-09-15', order: 2 },
  { name: 'Gym Challenge', nameEn: 'Gym Challenge', slug: 'gym-challenge', abbreviation: 'WOTC-GC', blocSlug: 'wotc', imageUrl: '/images/series/gym-challenge.png', releaseDate: '2000-10-16', order: 3 },
  { name: 'Gym Heroes', nameEn: 'Gym Heroes', slug: 'gym-heroes', abbreviation: 'WOTC-GH', blocSlug: 'wotc', imageUrl: '/images/series/gym-heroes.png', releaseDate: '2000-08-14', order: 4 },
  { name: 'Team Rocket', nameEn: 'Team Rocket', slug: 'team-rocket', abbreviation: 'WOTC-TR', blocSlug: 'wotc', imageUrl: '/images/series/team-rocket.png', releaseDate: '2000-04-24', order: 5 },
  { name: 'Set de base 2', nameEn: 'Base Set 2', slug: 'set-de-base-2', abbreviation: 'WOTC-B2', blocSlug: 'wotc', imageUrl: '/images/series/set-de-base-2.png', releaseDate: '2000-02-24', order: 6 },
  { name: 'Fossile', nameEn: 'Fossil', slug: 'fossile', abbreviation: 'WOTC-FO', blocSlug: 'wotc', imageUrl: '/images/series/fossile.png', releaseDate: '1999-10-08', order: 7 },
  { name: 'Jungle', nameEn: 'Jungle', slug: 'jungle', abbreviation: 'WOTC-JU', blocSlug: 'wotc', imageUrl: '/images/series/jungle.png', releaseDate: '1999-06-16', order: 8 },
  { name: 'Set de base', nameEn: 'Base Set', slug: 'set-de-base', abbreviation: 'WOTC-BS', blocSlug: 'wotc', imageUrl: '/images/series/set-de-base.png', releaseDate: '1999-01-09', order: 9 },
  { name: 'Promos Nintendo', nameEn: 'Nintendo Promos', slug: 'promos-nintendo', abbreviation: 'NP', blocSlug: 'wotc', imageUrl: '/images/series/promos-nintendo.png', releaseDate: null, order: 20 },
];

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export const SERIES: SerieStatic[] = [
  ...MEGA_EVOLUTION_SERIES,
  ...ECARLATE_VIOLET_SERIES,
  ...EPEE_BOUCLIER_SERIES,
  ...SOLEIL_LUNE_SERIES,
  ...XY_SERIES,
  ...NOIR_BLANC_SERIES,
  ...HGSS_SERIES,
  ...PLATINE_SERIES,
  ...DIAMANT_PERLE_SERIES,
  ...EX_SERIES,
  ...WOTC_SERIES,
];

export {
  MEGA_EVOLUTION_SERIES,
  ECARLATE_VIOLET_SERIES,
  EPEE_BOUCLIER_SERIES,
  SOLEIL_LUNE_SERIES,
  XY_SERIES,
  NOIR_BLANC_SERIES,
  HGSS_SERIES,
  PLATINE_SERIES,
  DIAMANT_PERLE_SERIES,
  EX_SERIES,
  WOTC_SERIES,
};
