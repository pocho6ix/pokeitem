import type { CardRarity } from "@/types/card";

export interface RarityCard {
  id: string;
  name: string;
  number: string;
  rarity: CardRarity;
  imageUrl: string | null;
  price: number;
  priceFr: number | null;
  /** true when the displayed price is the NORMAL variant's FR price (shows 🇫🇷 flag). */
  isFrenchPrice: boolean;
  /** true when the displayed price is the reverse variant's price. */
  isReverse: boolean;
  serieName: string;
}

export interface RaritySection {
  rarityKey: CardRarity;
  cardCount: number;
  totalValue: number;
  cards: RarityCard[];
}
