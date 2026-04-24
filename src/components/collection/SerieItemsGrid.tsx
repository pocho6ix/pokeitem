"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
import { typeToBadgeLabel } from "@/lib/items-catalog";
import { formatPrice } from "@/lib/utils";
import { ItemImage } from "@/components/shared/ItemImage";
import { AddToPortfolioModal } from "@/components/portfolio/AddToPortfolioModal";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/subscription/PaywallModal";
import { isNative } from "@/lib/native";

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
  /**
   * Parent bloc slug, needed to build the canonical detail URL
   * `/collection/produits/{bloc}/{serie}/{item}` shown by the
   * "Voir les détails" CTA. Required so the link matches the same
   * path the sitemap emits.
   */
  blocSlug: string;
  serieAbbreviation: string;
  /** Real DB items for this series (if any) */
  dbItems?: Array<{
    id: string;
    /**
     * Canonical item slug from Prisma (same column the sitemap walks via
     * `getSealedProductsForSitemap`). Nullable — some items may be
     * seeded without one; when absent, the detail CTA is skipped.
     */
    slug: string | null;
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
  blocSlug,
  serieAbbreviation,
  dbItems,
  availableImageTypes,
}: SerieItemsGridProps) {
  const params = useParams();
  const resolvedSerieSlug = serieSlug || (params?.serieSlug as string) || "";
  // Hide the "Voir les détails" CTA inside the native Capacitor build —
  // the /collection/produits/[bloc]/[serie]/[item] SEO page is web-only.
  const isWeb = !isNative();
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

  const { canAddSealed, usage } = useSubscription();
  const { paywallState, showPaywall, closePaywall } = usePaywall();

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
    if (!canAddSealed) {
      showPaywall('SEALED_LIMIT_REACHED', usage.sealedItems.current, usage.sealedItems.limit ?? 5);
      return;
    }

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
    const displayPrice = dbItem?.currentPrice ?? itemType.typicalMsrp;
    const label = ITEM_TYPE_LABELS[itemType.type] ?? itemType.label;
    // Only render the type badge when it adds info — for BOOSTER/ETB/…
    // badge == label (redundant). Useful for BOX_SET ("Coffret"), TRAINER_KIT
    // ("Trainer"), THEME_DECK ("Deck"), etc.
    const shortBadge = typeToBadgeLabel(itemType.type, label);
    const showBadge = shortBadge !== label;

    return (
      <Card
        key={itemType.type}
        className="group flex flex-col overflow-hidden !bg-[var(--bg-card)]"
      >
        {/* Image — white bg preserved per product decision. The type badge
            used to sit in this corner but overlapped images of wider types
            (ETB, Display, Trainer Kit) and floated away from narrow ones
            (booster pack). Moved to the content area below. */}
        <ItemImage
          src={dbItem?.imageUrl}
          slug={`${resolvedSerieSlug}-${TYPE_SLUG[itemType.type] || itemType.type.toLowerCase()}`}
          alt={label}
          size="xl"
          className="aspect-square w-full rounded-t-xl group-hover:scale-[1.02] transition-transform duration-300"
        />

        {/* Content — name+badge → price → actions, with a clear vertical
            rhythm and actions stacked full-width. The stacked layout
            guarantees zero collision between the price and the Portfolio
            button regardless of how narrow the card gets (fixes the
            overlap + truncation seen at grid-cols-3 on iPhone SE). */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {label}
            </h3>
            {showBadge && (
              <span className="shrink-0 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                {shortBadge}
              </span>
            )}
          </div>

          <div className="font-data text-base font-bold tabular-nums text-[var(--text-primary)]">
            {formatPrice(displayPrice)}
          </div>

          <div className="mt-auto flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleAddToPortfolio(itemType)}
              className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg btn-gold px-3 text-xs font-semibold text-black"
            >
              + Portfolio
            </button>
            {/* "Voir les détails" CTA (web only, DB slug required) */}
            {isWeb && dbItem?.slug && (
              <Link
                href={`/collection/produits/${blocSlug}/${resolvedSerieSlug}/${dbItem.slug}`}
                className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:border-white/30 hover:bg-[var(--bg-card-hover)]"
              >
                Détails
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
            <div className="mt-4 grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        current={paywallState.current}
        limit={paywallState.limit}
        onClose={closePaywall}
      />
    </>
  );
}
