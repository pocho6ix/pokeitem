// ---------------------------------------------------------------------------
// Static data – Item type definitions with metadata
// ---------------------------------------------------------------------------

import { ItemType } from '@/types/item';

export interface ItemTypeInfo {
  type: ItemType;
  label: string;
  description: string;
  typicalContent: string;
  typicalMsrp: number;
  icon: string;
}

export const ITEM_TYPES: ItemTypeInfo[] = [
  {
    type: ItemType.BOOSTER,
    label: 'Booster',
    description: 'Paquet de cartes aléatoires scellé',
    typicalContent: '10 cartes dont 1 rare ou supérieure',
    typicalMsrp: 4.5,
    icon: 'Package',
  },
  {
    type: ItemType.DISPLAY,
    label: 'Display',
    description: 'Boîte complète de 36 boosters',
    typicalContent: '36 boosters scellés sous emballage',
    typicalMsrp: 159.99,
    icon: 'Boxes',
  },
  {
    type: ItemType.ETB,
    label: 'Coffret Dresseur d\'Élite',
    description: 'Coffret contenant boosters, sleeves et accessoires',
    typicalContent: '9 boosters, 65 sleeves, dé, marqueurs de dégâts',
    typicalMsrp: 54.99,
    icon: 'Trophy',
  },
  {
    type: ItemType.COFFRET,
    label: 'Coffret',
    description: 'Coffret thématique avec carte promo',
    typicalContent: '4 boosters et 1 carte promo',
    typicalMsrp: 24.99,
    icon: 'Gift',
  },
  {
    type: ItemType.COFFRET_PREMIUM,
    label: 'Coffret Premium',
    description: 'Coffret haut de gamme avec contenu exclusif',
    typicalContent: '8+ boosters, carte promo, accessoires premium',
    typicalMsrp: 59.99,
    icon: 'Crown',
  },
  {
    type: ItemType.MINI_TIN,
    label: 'Mini Tin',
    description: 'Petite boîte métallique de collection',
    typicalContent: '2 boosters et 1 carte d\'art',
    typicalMsrp: 12.99,
    icon: 'Disc',
  },
  {
    type: ItemType.POKEBOX,
    label: 'Pokébox',
    description: 'Boîte métallique avec carte promo holographique',
    typicalContent: '4 boosters et 1 carte promo GX/V/ex',
    typicalMsrp: 24.99,
    icon: 'Square',
  },
  {
    type: ItemType.TRIPACK,
    label: 'Tripack',
    description: 'Pack de 3 boosters avec carte promo',
    typicalContent: '3 boosters, 1 carte promo, 1 pièce',
    typicalMsrp: 14.99,
    icon: 'Layers',
  },
  {
    type: ItemType.DUOPACK,
    label: 'Duopack',
    description: 'Pack de 2 boosters avec carte promo',
    typicalContent: '2 boosters et 1 carte promo',
    typicalMsrp: 9.99,
    icon: 'Copy',
  },
  {
    type: ItemType.DECK,
    label: 'Deck',
    description: 'Deck préconstruit prêt à jouer',
    typicalContent: '60 cartes, marqueurs de dégâts, guide de règles',
    typicalMsrp: 14.99,
    icon: 'LayoutList',
  },
  {
    type: ItemType.BUNDLE,
    label: 'Bundle',
    description: 'Lot spécial contenant plusieurs produits',
    typicalContent: '6 boosters et accessoires',
    typicalMsrp: 29.99,
    icon: 'PackageOpen',
  },
  {
    type: ItemType.VALISETTE,
    label: 'Valisette',
    description: 'Mallette de rangement avec boosters',
    typicalContent: '5 boosters, carte promo, valisette de rangement',
    typicalMsrp: 29.99,
    icon: 'Briefcase',
  },
  {
    type: ItemType.KIT_AVANT_PREMIERE,
    label: 'Kit Avant-Première',
    description: 'Kit de construction de deck pour événement avant-première',
    typicalContent: '4 boosters, kit de construction, carte promo estampillée',
    typicalMsrp: 34.99,
    icon: 'Rocket',
  },
  {
    type: ItemType.COLLECTION_FIGURINE,
    label: 'Collection avec Figurine',
    description: 'Coffret avec figurine et cartes',
    typicalContent: '4 boosters, 1 figurine et 1 carte promo',
    typicalMsrp: 29.99,
    icon: 'User',
  },
  {
    type: ItemType.POKEBALL_TIN,
    label: 'Pokéball Tin',
    description: 'Boîte en forme de Pokéball',
    typicalContent: '3 boosters dans une Pokéball métallique',
    typicalMsrp: 14.99,
    icon: 'Circle',
  },
  {
    type: ItemType.OTHER,
    label: 'Autre',
    description: 'Produit scellé divers',
    typicalContent: 'Variable',
    typicalMsrp: 0,
    icon: 'HelpCircle',
  },
];
