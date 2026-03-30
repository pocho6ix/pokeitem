/**
 * File d'attente des séries à traiter par Ivan.
 *
 * Chaque entrée contient les infos nécessaires pour écrire l'article.
 * L'agent pioche la prochaine série non traitée chaque jour.
 *
 * Ordre : du plus récent au plus ancien (intérêt SEO + actualité)
 */

export interface SerieEntry {
  slug: string;
  name: string;
  nameEn: string;
  bloc: string;
  abbreviation: string;
  releaseDate: string;
  cardCount?: number;
  notableCards?: string[];
  notableItems?: string[];
  keyFacts?: string[];
}

export const SERIES_QUEUE: SerieEntry[] = [
  // ─── MÉGA-ÉVOLUTION ─────────────────────────────────────
  {
    slug: "equilibre-parfait",
    name: "Équilibre Parfait",
    nameEn: "Perfect Balance",
    bloc: "Méga-Évolution",
    abbreviation: "ME03",
    releaseDate: "27 mars 2026",
    notableCards: ["Méga-Zygarde-ex", "Méga-Staross-ex", "Méga-Mélodelfe-ex", "Méga-Airmure-ex"],
    notableItems: ["ETB Équilibre Parfait", "Booster Box", "Bundle", "Mini Tins"],
    keyFacts: [
      "Première extension à se dérouler à Illumis",
      "Inspirée du jeu vidéo Légendes Pokémon : Z-A",
      "Introduction de Méga-Zygarde-ex avec PV élevés",
    ],
  },
  {
    slug: "heros-transcendants",
    name: "Héros Transcendants",
    nameEn: "Ascended Heroes",
    bloc: "Méga-Évolution",
    abbreviation: "ME2.5",
    releaseDate: "30 janvier 2026",
    notableCards: ["Pokémon-ex Méga-Évolution", "Pokémon de Dresseurs"],
    notableItems: ["ETB Héros Transcendants", "Booster Box", "Mini Tins", "Coffrets Collection"],
    keyFacts: [
      "Extension spéciale 2.5 du bloc Méga-Évolution",
      "Inspirée de Légendes Pokémon : Z-A",
      "Nouveaux personnages et lieux du JCC",
    ],
  },
  {
    slug: "flammes-fantasmagoriques",
    name: "Flammes Fantasmagoriques",
    nameEn: "Phantasmal Flames",
    bloc: "Méga-Évolution",
    abbreviation: "ME02",
    releaseDate: "14 novembre 2025",
    notableItems: ["ETB", "Booster Box", "UPC Flammes Fantasmagoriques"],
    keyFacts: ["Deuxième extension du bloc Méga-Évolution", "Développement des mécaniques Méga"],
  },
  {
    slug: "mega-evolution",
    name: "Méga-Évolution",
    nameEn: "Mega Evolution",
    bloc: "Méga-Évolution",
    abbreviation: "ME01",
    releaseDate: "26 septembre 2025",
    notableCards: ["Méga-Lucario-ex", "Méga-Latias-ex"],
    notableItems: ["ETB Méga-Lucario", "Booster Box", "Coffret Méga-Latias ex", "Deck Méga-Combat"],
    keyFacts: [
      "Retour des Méga-Évolutions dans le JCC",
      "Premier set du nouveau bloc post Écarlate & Violet",
      "Introduction de la 10e génération dans le TCG",
    ],
  },

  // ─── ÉCARLATE & VIOLET ──────────────────────────────────
  {
    slug: "evolutions-prismatiques",
    name: "Évolutions Prismatiques",
    nameEn: "Prismatic Evolutions",
    bloc: "Écarlate & Violet",
    abbreviation: "EV8.5",
    releaseDate: "17 janvier 2025",
    cardCount: 180,
    notableCards: ["Évoli et ses évolutions en illustrations spéciales", "Cartes illustration rare Évoli"],
    notableItems: ["ETB", "Booster Box (Bundle)", "Binder Collection", "Surprise Box"],
    keyFacts: [
      "Extension spéciale dédiée à Évoli et ses évolutions",
      "L'un des sets les plus hyped de 2025",
      "Demande très forte, ruptures de stock fréquentes",
      "Bundle (Booster Box) très recherché des collectionneurs",
    ],
  },
  {
    slug: "etincelles-deferlantes",
    name: "Étincelles Déferlantes",
    nameEn: "Surging Sparks",
    bloc: "Écarlate & Violet",
    abbreviation: "EV08",
    releaseDate: "8 novembre 2024",
    cardCount: 252,
    notableCards: ["Pikachu ex SAR", "Dracaufeu ex"],
    notableItems: ["ETB", "Booster Box", "Bundle", "Mini Tins"],
    keyFacts: ["Set principal pour la rotation compétitive 2025", "252 cartes dont de nombreuses secrètes"],
  },
  {
    slug: "couronne-stellaire",
    name: "Couronne Stellaire",
    nameEn: "Stellar Crown",
    bloc: "Écarlate & Violet",
    abbreviation: "EV07",
    releaseDate: "13 septembre 2024",
    cardCount: 175,
  },
  {
    slug: "fable-nebuleuse",
    name: "Fable Nébuleuse",
    nameEn: "Shrouded Fable",
    bloc: "Écarlate & Violet",
    abbreviation: "EV6.5",
    releaseDate: "2 août 2024",
  },
  {
    slug: "mascarade-crepusculaire",
    name: "Mascarade Crépusculaire",
    nameEn: "Twilight Masquerade",
    bloc: "Écarlate & Violet",
    abbreviation: "EV06",
    releaseDate: "24 mai 2024",
    cardCount: 226,
  },
  {
    slug: "forces-temporelles",
    name: "Forces Temporelles",
    nameEn: "Temporal Forces",
    bloc: "Écarlate & Violet",
    abbreviation: "EV05",
    releaseDate: "22 mars 2024",
    cardCount: 218,
  },
  {
    slug: "destinees-de-paldea",
    name: "Destinées de Paldea",
    nameEn: "Paldean Fates",
    bloc: "Écarlate & Violet",
    abbreviation: "EV4.5",
    releaseDate: "26 janvier 2024",
    cardCount: 245,
    notableCards: ["Carmadura ex shiny", "Palmaval ex shiny"],
    keyFacts: ["Extension spéciale avec des Pokémon shiny", "Très populaire auprès des collectionneurs"],
  },
  {
    slug: "faille-paradoxe",
    name: "Faille Paradoxe",
    nameEn: "Paradox Rift",
    bloc: "Écarlate & Violet",
    abbreviation: "EV04",
    releaseDate: "3 novembre 2023",
    cardCount: 266,
  },
  {
    slug: "pokemon-151",
    name: "Pokémon 151",
    nameEn: "Pokémon 151",
    bloc: "Écarlate & Violet",
    abbreviation: "EV3.5",
    releaseDate: "22 septembre 2023",
    cardCount: 207,
    notableCards: ["Dracaufeu ex SAR", "Mew ex", "Les 151 Pokémon de Kanto illustrés"],
    notableItems: ["ETB", "Booster Box (Bundle)", "UPC Pokémon 151", "Pokéball Tins", "Mini Tins"],
    keyFacts: [
      "Hommage aux 151 Pokémon originaux de Kanto",
      "L'UPC 151 est devenu un des items scellés les plus recherchés",
      "Boosters non vendus à l'unité (uniquement en coffrets/bundles)",
      "Plus-value significative sur le marché secondaire",
    ],
  },
  {
    slug: "flammes-obsidiennes",
    name: "Flammes Obsidiennes",
    nameEn: "Obsidian Flames",
    bloc: "Écarlate & Violet",
    abbreviation: "EV03",
    releaseDate: "11 août 2023",
    cardCount: 230,
    notableCards: ["Dracaufeu ex Teracristal Sombre"],
    keyFacts: ["Première apparition du Dracaufeu ex Tera dans le bloc EV"],
  },
  {
    slug: "evolutions-a-paldea",
    name: "Évolutions à Paldea",
    nameEn: "Paldea Evolved",
    bloc: "Écarlate & Violet",
    abbreviation: "EV02",
    releaseDate: "9 juin 2023",
    cardCount: 279,
  },
  {
    slug: "ecarlate-et-violet",
    name: "Écarlate et Violet",
    nameEn: "Scarlet & Violet",
    bloc: "Écarlate & Violet",
    abbreviation: "EV01",
    releaseDate: "31 mars 2023",
    cardCount: 198,
    keyFacts: ["Premier set du bloc Écarlate & Violet", "Introduction des Pokémon-ex de 9e génération"],
  },

  // ─── ÉPÉE & BOUCLIER ───────────────────────────────────
  { slug: "zenith-supreme", name: "Zénith Suprême", nameEn: "Crown Zenith", bloc: "Épée & Bouclier", abbreviation: "EB12.5", releaseDate: "20 janvier 2023", keyFacts: ["Dernière extension du bloc EB", "Galerie spéciale Galarian Gallery"] },
  { slug: "tempete-argentee", name: "Tempête Argentée", nameEn: "Silver Tempest", bloc: "Épée & Bouclier", abbreviation: "EB12", releaseDate: "11 novembre 2022" },
  { slug: "origine-perdue", name: "Origine Perdue", nameEn: "Lost Origin", bloc: "Épée & Bouclier", abbreviation: "EB11", releaseDate: "9 septembre 2022", notableCards: ["Giratina VSTAR"] },
  { slug: "pokemon-go", name: "Pokémon GO", nameEn: "Pokémon GO", bloc: "Épée & Bouclier", abbreviation: "EB10.5", releaseDate: "1 juillet 2022", keyFacts: ["Collaboration avec le jeu mobile Pokémon GO"] },
  { slug: "astres-radieux", name: "Astres Radieux", nameEn: "Astral Radiance", bloc: "Épée & Bouclier", abbreviation: "EB10", releaseDate: "27 mai 2022" },
  { slug: "brillantes-etoiles", name: "Brillantes Étoiles", nameEn: "Brilliant Stars", bloc: "Épée & Bouclier", abbreviation: "EB09.5", releaseDate: "25 février 2022", notableCards: ["Dracaufeu VSTAR", "Arceus VSTAR"] },
  { slug: "stars-etincelantes", name: "Stars Étincelantes", nameEn: "Shining Fates", bloc: "Épée & Bouclier", abbreviation: "EB09", releaseDate: "19 novembre 2021" },
  { slug: "poing-de-fusion", name: "Poing de Fusion", nameEn: "Fusion Strike", bloc: "Épée & Bouclier", abbreviation: "EB08", releaseDate: "12 novembre 2021", notableCards: ["Mew VMAX"] },
  { slug: "evolution-celeste", name: "Évolution Céleste", nameEn: "Evolving Skies", bloc: "Épée & Bouclier", abbreviation: "EB07", releaseDate: "27 août 2021", notableCards: ["Rayquaza VMAX alt art", "Noctali VMAX alt art"], keyFacts: ["Considéré comme l'un des meilleurs sets modernes", "Alt arts très recherchés", "Prix des Booster Box en forte hausse"] },
  { slug: "regne-de-glace", name: "Règne de Glace", nameEn: "Chilling Reign", bloc: "Épée & Bouclier", abbreviation: "EB06", releaseDate: "18 juin 2021" },
  { slug: "styles-de-combat", name: "Styles de Combat", nameEn: "Battle Styles", bloc: "Épée & Bouclier", abbreviation: "EB05", releaseDate: "19 mars 2021" },
  { slug: "destinees-radieuses", name: "Destinées Radieuses", nameEn: "Shining Fates", bloc: "Épée & Bouclier", abbreviation: "EB04.5", releaseDate: "19 février 2021", keyFacts: ["Extension shiny très populaire", "Dracaufeu VMAX shiny très recherché"] },
  { slug: "voltage-eclatant", name: "Voltage Éclatant", nameEn: "Vivid Voltage", bloc: "Épée & Bouclier", abbreviation: "EB04", releaseDate: "13 novembre 2020", notableCards: ["Pikachu VMAX Rainbow rare"] },
  { slug: "la-voie-du-maitre", name: "La Voie du Maître", nameEn: "Champion's Path", bloc: "Épée & Bouclier", abbreviation: "EB03.5", releaseDate: "25 septembre 2020", notableCards: ["Dracaufeu VMAX shiny"] },
  { slug: "tenebres-embrasees", name: "Ténèbres Embrasées", nameEn: "Darkness Ablaze", bloc: "Épée & Bouclier", abbreviation: "EB03", releaseDate: "14 août 2020", notableCards: ["Dracaufeu VMAX"] },
  { slug: "clash-des-rebelles", name: "Clash des Rebelles", nameEn: "Rebel Clash", bloc: "Épée & Bouclier", abbreviation: "EB02", releaseDate: "1 mai 2020" },
  { slug: "epee-et-bouclier", name: "Épée et Bouclier", nameEn: "Sword & Shield", bloc: "Épée & Bouclier", abbreviation: "EB01", releaseDate: "7 février 2020", keyFacts: ["Premier set du bloc EB", "Introduction des cartes V et VMAX"] },
  { slug: "celebrations", name: "Célébrations", nameEn: "Celebrations", bloc: "Épée & Bouclier", abbreviation: "CEL", releaseDate: "8 octobre 2021", notableCards: ["Dracaufeu Set de Base réimpression", "Mew Gold"], keyFacts: ["25e anniversaire du TCG Pokémon", "Réimpressions de cartes classiques", "Items très recherchés des collectionneurs"] },

  // ─── SOLEIL & LUNE ──────────────────────────────────────
  { slug: "soleil-et-lune", name: "Soleil et Lune", nameEn: "Sun & Moon", bloc: "Soleil & Lune", abbreviation: "SL01", releaseDate: "3 février 2017", keyFacts: ["Premier set du bloc SL", "Introduction des cartes GX"] },
  { slug: "gardiens-ascendants", name: "Gardiens Ascendants", nameEn: "Guardians Rising", bloc: "Soleil & Lune", abbreviation: "SL02", releaseDate: "5 mai 2017" },
  { slug: "ombres-ardentes", name: "Ombres Ardentes", nameEn: "Burning Shadows", bloc: "Soleil & Lune", abbreviation: "SL03", releaseDate: "4 août 2017", notableCards: ["Dracaufeu GX Rainbow Rare"] },
  { slug: "invasion-carmin", name: "Invasion Carmin", nameEn: "Crimson Invasion", bloc: "Soleil & Lune", abbreviation: "SL04", releaseDate: "3 novembre 2017" },
  { slug: "ultra-prisme", name: "Ultra-Prisme", nameEn: "Ultra Prism", bloc: "Soleil & Lune", abbreviation: "SL05", releaseDate: "2 février 2018" },
  { slug: "lumiere-interdite", name: "Lumière Interdite", nameEn: "Forbidden Light", bloc: "Soleil & Lune", abbreviation: "SL06", releaseDate: "4 mai 2018" },
  { slug: "tempete-celeste", name: "Tempête Céleste", nameEn: "Celestial Storm", bloc: "Soleil & Lune", abbreviation: "SL07", releaseDate: "3 août 2018" },
  { slug: "tonnerre-perdu", name: "Tonnerre Perdu", nameEn: "Lost Thunder", bloc: "Soleil & Lune", abbreviation: "SL08", releaseDate: "2 novembre 2018" },
  { slug: "duo-de-choc", name: "Duo de Choc", nameEn: "Team Up", bloc: "Soleil & Lune", abbreviation: "SL09", releaseDate: "1 février 2019" },
  { slug: "alliance-infaillible", name: "Alliance Infaillible", nameEn: "Unbroken Bonds", bloc: "Soleil & Lune", abbreviation: "SL10", releaseDate: "3 mai 2019" },
  { slug: "harmonie-des-esprits", name: "Harmonie des Esprits", nameEn: "Unified Minds", bloc: "Soleil & Lune", abbreviation: "SL11", releaseDate: "2 août 2019" },
  { slug: "eclipse-cosmique", name: "Éclipse Cosmique", nameEn: "Cosmic Eclipse", bloc: "Soleil & Lune", abbreviation: "SL12", releaseDate: "1 novembre 2019" },
  { slug: "destinees-occultes", name: "Destinées Occultes", nameEn: "Hidden Fates", bloc: "Soleil & Lune", abbreviation: "SL12.5", releaseDate: "15 novembre 2019", notableCards: ["Dracaufeu GX shiny"], keyFacts: ["Très populaire, prix en hausse constante"] },

  // ─── XY ─────────────────────────────────────────────────
  { slug: "xy", name: "XY", nameEn: "XY", bloc: "XY", abbreviation: "XY01", releaseDate: "5 février 2014", keyFacts: ["Premier set du bloc XY", "Introduction des cartes EX full art"] },
  { slug: "evolutions", name: "Évolutions", nameEn: "Evolutions", bloc: "XY", abbreviation: "XY12", releaseDate: "2 novembre 2016", notableCards: ["Dracaufeu EX full art", "Réimpressions du Set de Base"], keyFacts: ["Hommage au Set de Base original", "L'un des sets XY les plus recherchés", "Booster Box en forte plus-value"] },

  // ─── NOIR & BLANC ───────────────────────────────────────
  { slug: "noir-et-blanc", name: "Noir & Blanc", nameEn: "Black & White", bloc: "Noir & Blanc", abbreviation: "NB01", releaseDate: "25 mars 2011", keyFacts: ["Premier set du bloc NB", "Introduction des cartes full art"] },

  // ─── WIZARDS (WOTC) ─────────────────────────────────────
  { slug: "set-de-base", name: "Set de Base", nameEn: "Base Set", bloc: "Wizards of the Coast", abbreviation: "BS", releaseDate: "9 janvier 1999", notableCards: ["Dracaufeu holographique", "Tortank holographique", "Florizarre holographique"], notableItems: ["Display Set de Base 1ère édition", "Booster Set de Base", "Starter Deck"], keyFacts: ["Tout premier set Pokémon TCG", "Le Dracaufeu holo 1ère édition est la carte la plus chère au monde", "Display scellé 1ère édition : 300 000$+", "Booster scellé 1ère édition : 5 000$+"] },
  { slug: "jungle", name: "Jungle", nameEn: "Jungle", bloc: "Wizards of the Coast", abbreviation: "JU", releaseDate: "16 juin 1999", notableCards: ["Aquali holo", "Voltali holo", "Pyroli holo"] },
  { slug: "fossile", name: "Fossile", nameEn: "Fossil", bloc: "Wizards of the Coast", abbreviation: "FO", releaseDate: "8 octobre 1999", notableCards: ["Dracolosse holo", "Hypnomade holo"] },
  { slug: "team-rocket", name: "Team Rocket", nameEn: "Team Rocket", bloc: "Wizards of the Coast", abbreviation: "TR", releaseDate: "24 avril 2000", notableCards: ["Dracaufeu Obscur holo"], keyFacts: ["Première extension avec des Pokémon Obscurs"] },
  { slug: "gym-heroes", name: "Gym Heroes", nameEn: "Gym Heroes", bloc: "Wizards of the Coast", abbreviation: "GH", releaseDate: "14 août 2000" },
  { slug: "gym-challenge", name: "Gym Challenge", nameEn: "Gym Challenge", bloc: "Wizards of the Coast", abbreviation: "GC", releaseDate: "16 octobre 2000" },
];

/**
 * Retourne la prochaine série à traiter.
 * Vérifie les fichiers JSON déjà générés et retourne la première série sans article.
 */
export function getNextSerie(existingSlugs: Set<string>): SerieEntry | null {
  for (const serie of SERIES_QUEUE) {
    const articleSlug = `guide-${serie.slug}`;
    if (!existingSlugs.has(articleSlug)) {
      return serie;
    }
  }
  return null;
}
