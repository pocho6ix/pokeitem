// ---------------------------------------------------------------------------
// Static data – Item type definitions with metadata (CardMarket convention)
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
    description: 'Paquet de 10 cartes aléatoires scellé',
    typicalContent: '10 cartes dont 1 rare ou supérieure',
    typicalMsrp: 6.99,
    icon: 'Package',
  },
  {
    type: ItemType.DUOPACK,
    label: 'Duopack',
    description: '2 boosters avec 1 carte promo',
    typicalContent: '2 boosters et 1 carte promo',
    typicalMsrp: 12.99,
    icon: 'Layers',
  },
  {
    type: ItemType.TRIPACK,
    label: 'Tripack',
    description: '3 boosters avec 1 carte promo, emballage cartonné plastifié',
    typicalContent: '3 boosters et 1 carte promo',
    typicalMsrp: 19.99,
    icon: 'Layers',
  },
  {
    type: ItemType.MINI_TIN,
    label: 'Mini Tin',
    description: 'Petite boîte métallique de collection',
    typicalContent: '2 boosters et 1 carte art',
    typicalMsrp: 11.99,
    icon: 'Disc',
  },
  {
    type: ItemType.POKEBALL_TIN,
    label: 'Tin Pokéball',
    description: 'Boîte métallique en forme de Pokéball',
    typicalContent: '3 boosters',
    typicalMsrp: 16.99,
    icon: 'Disc',
  },
  {
    type: ItemType.BUNDLE,
    label: 'Bundle',
    description: 'Lot de 6 boosters et accessoires',
    typicalContent: '6 boosters et accessoires',
    typicalMsrp: 34.99,
    icon: 'PackageOpen',
  },
  {
    type: ItemType.BOX_SET,
    label: 'Coffret Collection',
    description: 'Coffret thématique avec carte promo (Pokébox)',
    typicalContent: '4 boosters et 1 carte promo',
    typicalMsrp: 25.99,
    icon: 'Gift',
  },
  {
    type: ItemType.ETB,
    label: 'ETB',
    description: 'Coffret Dresseur d\'Élite — boosters, sleeves et accessoires',
    typicalContent: '9 boosters, 65 sleeves, dé, marqueurs de dégâts',
    typicalMsrp: 109.99,
    icon: 'Trophy',
  },
  {
    type: ItemType.BOOSTER_BOX,
    label: 'Display',
    description: 'Display de 36 boosters scellés',
    typicalContent: '36 boosters scellés sous emballage',
    typicalMsrp: 259.99,
    icon: 'Boxes',
  },
  {
    type: ItemType.UPC,
    label: 'UPC',
    description: 'Coffret haut de gamme avec contenu exclusif',
    typicalContent: '16+ boosters, cartes métal, accessoires premium',
    typicalMsrp: 159.99,
    icon: 'Crown',
  },
  {
    type: ItemType.TIN,
    label: 'Tin',
    description: 'Boîte métallique de collection',
    typicalContent: '2-4 boosters et 1 carte promo',
    typicalMsrp: 16.99,
    icon: 'Disc',
  },
  {
    type: ItemType.THEME_DECK,
    label: 'Theme Deck',
    description: 'Deck préconstruit prêt à jouer',
    typicalContent: '60 cartes, marqueurs de dégâts, guide de règles',
    typicalMsrp: 14.99,
    icon: 'LayoutList',
  },
  {
    type: ItemType.TRAINER_KIT,
    label: 'Trainer Kit',
    description: "Kit de construction de deck pour événement avant-première",
    typicalContent: '4 boosters, kit de construction, carte promo estampillée',
    typicalMsrp: 34.99,
    icon: 'Rocket',
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
