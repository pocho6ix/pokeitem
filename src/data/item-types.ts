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
    typicalMsrp: 4.5,
    icon: 'Package',
  },
  {
    type: ItemType.BOOSTER_BOX,
    label: 'Booster Box',
    description: 'Display de 36 boosters scellés',
    typicalContent: '36 boosters scellés sous emballage',
    typicalMsrp: 159.99,
    icon: 'Boxes',
  },
  {
    type: ItemType.ETB,
    label: 'Elite Trainer Box',
    description: 'Coffret contenant boosters, sleeves et accessoires',
    typicalContent: '9 boosters, 65 sleeves, dé, marqueurs de dégâts',
    typicalMsrp: 54.99,
    icon: 'Trophy',
  },
  {
    type: ItemType.BOX_SET,
    label: 'Box Set',
    description: 'Coffret thématique avec carte promo',
    typicalContent: '4 boosters et 1 carte promo',
    typicalMsrp: 34.99,
    icon: 'Gift',
  },
  {
    type: ItemType.UPC,
    label: 'Ultra Premium Collection',
    description: 'Coffret haut de gamme avec contenu exclusif',
    typicalContent: '16+ boosters, cartes métal, accessoires premium',
    typicalMsrp: 134.99,
    icon: 'Crown',
  },
  {
    type: ItemType.TIN,
    label: 'Tin',
    description: 'Boîte métallique de collection',
    typicalContent: '2-4 boosters et 1 carte promo',
    typicalMsrp: 14.99,
    icon: 'Disc',
  },
  {
    type: ItemType.BLISTER,
    label: 'Blister',
    description: 'Pack de 2-3 boosters avec carte promo',
    typicalContent: '2-3 boosters, 1 carte promo, 1 pièce',
    typicalMsrp: 13.99,
    icon: 'Layers',
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
    type: ItemType.BUNDLE,
    label: 'Bundle',
    description: 'Lot de 6 boosters et accessoires',
    typicalContent: '6 boosters et accessoires',
    typicalMsrp: 29.99,
    icon: 'PackageOpen',
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
