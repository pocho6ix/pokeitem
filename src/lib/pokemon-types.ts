export interface TypeConfig {
  key: string;
  label: string;
  image: string;
  color: string;
  sortOrder: number;
}

export const POKEMON_TYPES: TypeConfig[] = [
  { key: "Plante",      label: "Plante",      image: "/types/grass.png",     color: "#78C850", sortOrder: 1 },
  { key: "Feu",         label: "Feu",         image: "/types/fire.png",      color: "#F08030", sortOrder: 2 },
  { key: "Eau",         label: "Eau",         image: "/types/water.png",     color: "#6890F0", sortOrder: 3 },
  { key: "Électrique",  label: "Électrique",  image: "/types/lightning.png", color: "#F8D030", sortOrder: 4 },
  { key: "Psy",         label: "Psy",         image: "/types/psychic.png",   color: "#F85888", sortOrder: 5 },
  { key: "Combat",      label: "Combat",      image: "/types/fighting.png",  color: "#C03028", sortOrder: 6 },
  { key: "Incolore",    label: "Incolore",    image: "/types/colorless.png", color: "#A8A878", sortOrder: 7 },
  { key: "Obscurité",   label: "Obscurité",   image: "/types/darkness.png",  color: "#705848", sortOrder: 8 },
  { key: "Métal",       label: "Métal",       image: "/types/metal.png",     color: "#B8B8D0", sortOrder: 9 },
  { key: "Dragon",      label: "Dragon",      image: "/types/dragon.png",    color: "#7038F8", sortOrder: 10 },
  { key: "Fée",         label: "Fée",         image: "/types/fairy.png",     color: "#EE99AC", sortOrder: 11 },
];

export const POKEMON_TYPE_MAP = Object.fromEntries(
  POKEMON_TYPES.map((t) => [t.key, t])
) as Record<string, TypeConfig>;
