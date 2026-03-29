"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
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
}

export function SerieItemsGrid({
  itemTypes,
  serieName,
  serieSlug,
  serieAbbreviation,
  dbItems,
}: SerieItemsGridProps) {
  const { data: session } = useSession();
  const params = useParams();
  const resolvedSerieSlug = serieSlug || (params?.serieSlug as string) || "";
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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {itemTypes
          .filter((it) => it.typicalMsrp > 0)
          .map((itemType) => {
            const dbItem = dbItems?.find((i) => i.type === itemType.type);
            const displayPrice =
              dbItem?.currentPrice ?? dbItem?.priceTrend ?? itemType.typicalMsrp;

            return (
              <Card
                key={itemType.type}
                className="group flex flex-col overflow-hidden"
              >
                {/* Image */}
                <ItemImage
                  src={dbItem?.imageUrl}
                  alt={ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
                  size="xl"
                  className="aspect-[4/3] rounded-t-xl group-hover:scale-[1.02] transition-transform duration-300"
                />

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
                    {ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
                  </h3>
                  <p className="mt-1 flex-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                    {itemType.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-data text-base font-bold text-[var(--text-primary)]">
                      ~{formatPrice(displayPrice)}
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
          })}
      </div>

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
