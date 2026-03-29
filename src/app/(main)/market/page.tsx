"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { SearchBar } from "@/components/shared/SearchBar";
import { formatPrice } from "@/lib/utils";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, CONDITION_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Category filter pills
// ---------------------------------------------------------------------------

const MARKET_CATEGORIES = [
  { label: "Tous", value: "all" },
  { label: "Boosters", value: "BOOSTER" },
  { label: "Booster Boxes", value: "BOOSTER_BOX" },
  { label: "ETB", value: "ETB" },
  { label: "Box Sets", value: "BOX_SET" },
  { label: "UPC", value: "UPC" },
  { label: "Tins", value: "TIN" },
  { label: "Blisters", value: "BLISTER" },
  { label: "Bundles", value: "BUNDLE" },
  { label: "Theme Decks", value: "THEME_DECK" },
  { label: "Trainer Kits", value: "TRAINER_KIT" },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MarketItem {
  id: string;
  title: string;
  type: string;
  priceFrom: number;
  priceTrend: number;
  sellers: number;
  condition: string;
  cardmarketUrl: string;
  imageUrl: string | null;
}

const MOCK_ITEMS: MarketItem[] = [
  { id: "1", title: "Booster Box Pokémon 151", type: "BOOSTER_BOX", priceFrom: 189.0, priceTrend: 225.0, sellers: 493, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "2", title: "ETB Évolutions Prismatiques", type: "ETB", priceFrom: 79.0, priceTrend: 95.0, sellers: 312, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "3", title: "Booster Box Étincelles Déferlantes", type: "BOOSTER_BOX", priceFrom: 132.0, priceTrend: 158.0, sellers: 205, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "4", title: "UPC Dracaufeu Écarlate & Violet", type: "UPC", priceFrom: 155.0, priceTrend: 174.0, sellers: 89, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "5", title: "ETB Méga-Évolution", type: "ETB", priceFrom: 54.0, priceTrend: 79.82, sellers: 493, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "6", title: "Tin Pikachu EX", type: "TIN", priceFrom: 14.5, priceTrend: 21.0, sellers: 178, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "7", title: "Blister Flammes Obsidiennes", type: "BLISTER", priceFrom: 11.9, priceTrend: 14.5, sellers: 267, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "8", title: "Booster Box Évolution Céleste", type: "BOOSTER_BOX", priceFrom: 280.0, priceTrend: 310.0, sellers: 156, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
  { id: "9", title: "Bundle Forces Temporelles", type: "BUNDLE", priceFrom: 25.0, priceTrend: 29.9, sellers: 134, condition: "SEALED", cardmarketUrl: "#", imageUrl: null },
];

// ---------------------------------------------------------------------------
// MarketCard
// ---------------------------------------------------------------------------

function MarketCard({ item }: { item: MarketItem }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Image placeholder */}
      <div className="flex h-44 items-center justify-center bg-[var(--bg-subtle)]">
        <span className="text-xs text-[var(--text-tertiary)]">Image</span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
          {item.title}
        </h3>
        <Badge className={ITEM_TYPE_COLORS[item.type]}>
          {ITEM_TYPE_LABELS[item.type]}
        </Badge>

        <div className="mt-1">
          <p className="text-xs text-[var(--text-tertiary)]">À partir de</p>
          <p className="font-data text-lg font-bold text-[var(--text-primary)]">
            {formatPrice(item.priceFrom)}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Trend: {formatPrice(item.priceTrend)}</span>
          <span>{item.sellers} vendeurs</span>
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <a
            href={item.cardmarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            CardMarket
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Portfolio
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trend-desc");

  const filtered = MOCK_ITEMS.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && item.type !== categoryFilter) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "price-asc": return a.priceFrom - b.priceFrom;
      case "price-desc": return b.priceFrom - a.priceFrom;
      case "trend-desc": return b.priceTrend - a.priceTrend;
      case "sellers-desc": return b.sellers - a.sellers;
      default: return 0;
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Market</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Trouvez les meilleures offres sur CardMarket
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchBar
          placeholder="Rechercher un item..."
          value={search}
          onChange={setSearch}
          className="sm:max-w-xs"
        />
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="trend-desc">Prix Trend ↓</option>
          <option value="price-asc">Prix ↑</option>
          <option value="price-desc">Prix ↓</option>
          <option value="sellers-desc">Vendeurs ↓</option>
        </Select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {MARKET_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat.value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-tertiary)]">
          Aucun item trouvé.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MarketCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
