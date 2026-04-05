export type FilterCategory = "pokemon_type" | "trainer_type" | "energy_type";

export interface TypeConfig {
  key: string;
  label: string;
  image?: string;
  abbreviation?: string;
  filterCategory: FilterCategory;
  color?: string;
  sortOrder: number;
  /** Card field to match against */
  matchField: "types" | "trainerType" | "energyType";
  /** Value to match (French, as stored in DB from TCGdex) */
  matchValue: string;
}

export const POKEMON_TYPES: TypeConfig[] = [
  // ── Types Pokémon (énergie) ──────────────────────────────────
  { key: "Plante",      label: "Plante",      image: "/types/grass.png",     filterCategory: "pokemon_type", color: "#78C850", sortOrder: 1,  matchField: "types", matchValue: "Plante" },
  { key: "Feu",         label: "Feu",         image: "/types/fire.png",      filterCategory: "pokemon_type", color: "#F08030", sortOrder: 2,  matchField: "types", matchValue: "Feu" },
  { key: "Eau",         label: "Eau",         image: "/types/water.png",     filterCategory: "pokemon_type", color: "#6890F0", sortOrder: 3,  matchField: "types", matchValue: "Eau" },
  { key: "Électrique",  label: "Électrique",  image: "/types/lightning.png", filterCategory: "pokemon_type", color: "#F8D030", sortOrder: 4,  matchField: "types", matchValue: "Électrique" },
  { key: "Psy",         label: "Psy",         image: "/types/psychic.png",   filterCategory: "pokemon_type", color: "#F85888", sortOrder: 5,  matchField: "types", matchValue: "Psy" },
  { key: "Combat",      label: "Combat",      image: "/types/fighting.png",  filterCategory: "pokemon_type", color: "#C03028", sortOrder: 6,  matchField: "types", matchValue: "Combat" },
  { key: "Incolore",    label: "Incolore",    image: "/types/colorless.png", filterCategory: "pokemon_type", color: "#A8A878", sortOrder: 7,  matchField: "types", matchValue: "Incolore" },
  { key: "Obscurité",   label: "Obscurité",   image: "/types/darkness.png",  filterCategory: "pokemon_type", color: "#705848", sortOrder: 8,  matchField: "types", matchValue: "Obscurité" },
  { key: "Métal",       label: "Métal",       image: "/types/metal.png",     filterCategory: "pokemon_type", color: "#B8B8D0", sortOrder: 9,  matchField: "types", matchValue: "Métal" },
  { key: "Dragon",      label: "Dragon",      image: "/types/dragon.png",    filterCategory: "pokemon_type", color: "#7038F8", sortOrder: 10, matchField: "types", matchValue: "Dragon" },
  { key: "Fée",         label: "Fée",         image: "/types/fairy.png",     filterCategory: "pokemon_type", color: "#EE99AC", sortOrder: 11, matchField: "types", matchValue: "Fée" },

  // ── Sous-types Dresseur ──────────────────────────────────────
  { key: "Supporter",      label: "Supporter",       image: "/types/supporter.svg",      abbreviation: "Su",   filterCategory: "trainer_type", sortOrder: 20, matchField: "trainerType", matchValue: "Supporter" },
  { key: "Objet",          label: "Objet",           image: "/types/item.svg",           abbreviation: "O",    filterCategory: "trainer_type", sortOrder: 21, matchField: "trainerType", matchValue: "Objet" },
  { key: "Stade",          label: "Stade",           image: "/types/stadium.svg",        abbreviation: "St",   filterCategory: "trainer_type", sortOrder: 22, matchField: "trainerType", matchValue: "Stade" },
  { key: "Outil",          label: "Outil Pokémon",   image: "/types/tool.svg",           abbreviation: "To",   filterCategory: "trainer_type", sortOrder: 23, matchField: "trainerType", matchValue: "Outil" },

  // ── Sous-type Énergie ────────────────────────────────────────
  { key: "Spécial",        label: "Énergie spéciale", image: "/types/special-energy.svg", abbreviation: "E Sp", filterCategory: "energy_type",  sortOrder: 30, matchField: "energyType", matchValue: "Spécial" },
];

export const POKEMON_TYPE_MAP = Object.fromEntries(
  POKEMON_TYPES.map((t) => [t.key, t])
) as Record<string, TypeConfig>;
