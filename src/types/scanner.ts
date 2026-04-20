export interface CardCandidate {
  cardId: string;
  confidence: number;
  card: {
    id: string;
    name: string;
    number: string;
    imageUrl: string | null;
    price: number | null;
    rarity: string;
  };
  serie: {
    id: string;
    slug: string;
    name: string;
    blocSlug: string;
  };
}

export interface IdentifyResponse {
  level: "high" | "medium" | "low";
  topConfidence: number;
  candidates: CardCandidate[];
  raw: { name: string; number: string; setCode: string } | null;
  scanId: string;
}
