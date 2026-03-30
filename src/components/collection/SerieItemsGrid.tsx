"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { ItemImage } from "@/components/shared/ItemImage";
import { AddToPortfolioModal } from "@/components/portfolio/AddToPortfolioModal";

interface ItemTypeData {
  type: string;
  label: string;
  description: string;
  typicalMsrp: number;
}

interface SerieItemsGridProps {
  itemTypes: ItemTypeData[];
  serieName: string;
  serieSlug: string;
  serieAbbreviation: string;
  /** Real DB items for this series (if any) */
  dbItems?: Array<{
    id: string;
    name: string;
    type: string;
    imageUrl: string | null;
    currentPrice: number | null;
    priceTrend: number | null;
    retailPrice: number | null;
    serie?: { name: string; abbreviation: string | null };
  }>;
  /** Item types that have an image file on disk */
  availableImageTypes?: string[];
}

const TYPE_SLUG: Record<string, string> = {
  BOOSTER: "booster",
  DUOPACK: "duopack",
  TRIPACK: "tripack",
  MINI_TIN: "mini-tin",
  POKEBALL_TIN: "pokeball-tin",
  BUNDLE: "bundle",
  BOX_SET: "box-set",
  ETB: "etb",
  BOOSTER_BOX: "booster-box",
  UPC: "upc",
  TIN: "tin",
  BLISTER: "blister",
  THEME_DECK: "theme-deck",
  TRAINER_KIT: "trainer-kit",
};

export function SerieItemsGrid({
  itemTypes,
  serieName,
  serieSlug,
  serieAbbreviation,
  dbItems,
  availableImageTypes,
}: SerieItemsGridProps) {
  const { data: session } = useSession();
  const params = useParams();
  const resolvedSerieSlug = serieSlug || (params?.serieSlug as string) || "";
  const [showOtherItems, setShowOtherItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    type: string;
    imageUrl?: string | null;
    currentPrice?: number | null;
    priceTrend?: number | null;
    retailPrice?: number | null;
    serie?: { name: string; abbreviation?: string | null };
    serieSlug?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const imageSet = new Set(availableImageTypes ?? []);

  const allItems = itemTypes.filter((it) => it.typicalMsrp > 0);
  const withImage = allItems.filter((it) => {
    const dbItem = dbItems?.find((i) => i.type === it.type);
    return dbItem?.imageUrl || imageSet.has(it.type);
  });
  const withoutImage = allItems.filter((it) => {
    const dbItem = dbItems?.find((i) => i.type === it.type);
    return !dbItem?.imageUrl && !imageSet.has(it.type);
  });

  function handleAddToPortfolio(itemType: ItemTypeData) {
    const dbItem = dbItems?.find((i) => i.type === itemType.type);

    setSelectedItem({
      id: dbItem?.id ?? "",
      name: dbItem?.name ?? `${serieName} — ${itemType.label}`,
      type: itemType.type,
      imageUrl: dbItem?.imageUrl,
      currentPrice: dbItem?.currentPrice,
      priceTrend: dbItem?.priceTrend,
      retailPrice: dbItem?.retailPrice ?? itemType.typicalMsrp,
      serie: { name: serieName, abbreviation: serieAbbreviation },
      serieSlug: resolvedSerieSlug,
    });
    setIsModalOpen(true);
  }

  function renderItemCard(itemType: ItemTypeData) {
    const dbItem = dbItems?.find((i) => i.type === itemType.type);
    const displayPrice = itemType.typicalMsrp;

    return (
      <Card
        key={itemType.type}
        className="group flex flex-col overflow-hidden"
      >
        {/* Image */}
        <ItemImage
          src={dbItem?.imageUrl}
          slug={`${resolvedSerieSlug}-${TYPE_SLUG[itemType.type] || itemType.type.toLowerCase()}`}
          alt={ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
          size="xl"
          className="aspect-[4/3] rounded-t-xl group-hover:scale-[1.02] transition-transform duration-300"
        />

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
              {ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
            </h3>
          </div>
          <p className="mt-1 flex-1 text-xs text-[var(--text-secondary)] line-clamp-2">
            {itemType.description}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-data text-base font-bold text-[var(--text-primary)]">
              {formatPrice(displayPrice)}
            </span>
            <button
              type="button"
              onClick={() => handleAddToPortfolio(itemType)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Portfolio
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {withImage.map(renderItemCard)}
      </div>

      {withoutImage.length > 0 && (
        <div className="mt-6">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showOtherItems}
              onChange={(e) => setShowOtherItems(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-default)] text-blue-600 focus:ring-blue-500"
            />
            Autres items ({withoutImage.length})
          </label>

          {showOtherItems && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {withoutImage.map(renderItemCard)}
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <AddToPortfolioModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
        />
      )}
    </>
  );
}
