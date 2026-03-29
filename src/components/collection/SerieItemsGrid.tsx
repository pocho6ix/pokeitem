"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
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
  // Use prop first, fall back to URL param
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
    // Try to find a matching DB item
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
              <Card key={itemType.type} className="flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Badge className={ITEM_TYPE_COLORS[itemType.type] ?? ""}>
                    {ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
                  </Badge>
                </div>
                <h3 className="mb-1 font-semibold text-[var(--text-primary)]">
                  {itemType.label}
                </h3>
                <p className="mb-3 flex-1 text-sm text-[var(--text-secondary)]">
                  {itemType.description}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
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
