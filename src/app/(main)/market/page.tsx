"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { SearchBar } from "@/components/shared/SearchBar";
import { formatPrice } from "@/lib/utils";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, MARKET_SOURCES, CONDITION_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MarketListing {
  id: string;
  title: string;
  price: number;
  sourceId: string;
  type: string;
  condition: string;
  url: string;
}

const MOCK_LISTINGS: MarketListing[] = [
  { id: "1", title: "Display Ecarlate et Violet 151", price: 225, sourceId: "cardmarket", type: "DISPLAY", condition: "SEALED", url: "#" },
  { id: "2", title: "ETB Evolutions a Paldea", price: 64.9, sourceId: "ebay", type: "ETB", condition: "SEALED", url: "#" },
  { id: "3", title: "Coffret Ultra Premium Dracaufeu", price: 169, sourceId: "leboncoin", type: "COFFRET_PREMIUM", condition: "SEALED", url: "#" },
  { id: "4", title: "Display Flammes Obsidiennes", price: 185, sourceId: "vinted", type: "DISPLAY", condition: "SEALED", url: "#" },
  { id: "5", title: "Pokebox Pikachu EX", price: 24.5, sourceId: "amazon", type: "POKEBOX", condition: "SEALED", url: "#" },
  { id: "6", title: "Tripack Evolutions a Paldea", price: 14.9, sourceId: "cardmarket", type: "TRIPACK", condition: "SEALED", url: "#" },
];

// ---------------------------------------------------------------------------
// MarketCard (inline)
// ---------------------------------------------------------------------------

function MarketCard({ listing }: { listing: MarketListing }) {
  const source = MARKET_SOURCES.find((s) => s.id === listing.sourceId);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Image placeholder */}
      <div className="flex h-40 items-center justify-center bg-[var(--bg-subtle)]">
        <span className="text-xs text-[var(--text-tertiary)]">Image</span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
          {listing.title}
        </h3>
        <p className="font-data text-lg font-bold text-[var(--text-primary)]">
          {formatPrice(listing.price)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {source && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: source.color }}
            >
              {source.name}
            </span>
          )}
          <Badge className={ITEM_TYPE_COLORS[listing.type]}>
            {ITEM_TYPE_LABELS[listing.type]}
          </Badge>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          {CONDITION_LABELS[listing.condition] ?? listing.condition}
        </p>
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Voir l&apos;annonce
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = MOCK_LISTINGS.filter((l) => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (sourceFilter && l.sourceId !== sourceFilter) return false;
    if (typeFilter && l.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Market</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Trouvez les meilleures offres
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchBar
          placeholder="Rechercher une annonce..."
          value={search}
          onChange={setSearch}
          className="sm:max-w-xs"
        />
        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">Toutes les sources</option>
          {MARKET_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-tertiary)]">
          Aucune annonce trouvee.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <MarketCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
