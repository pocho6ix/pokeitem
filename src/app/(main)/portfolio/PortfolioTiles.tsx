"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Copy, Package, Star, ArrowLeftRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { CollectionTile } from "@/components/portfolio/CollectionTile";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchApi } from "@/lib/api";

interface StatsData {
  totalItems: number;
  cardCount?: number;
  doublesCount?: number;
  cardValue?: number | null;
  doublesValue?: number | null;
  itemsValue?: number | null;
  totalValue?: number;
  wishlistCount?: number;
}

const GOLD_GRADIENT = "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)";

export function PortfolioTiles() {
  const router = useRouter();
  const pathname = usePathname();
  const isSubPage = pathname !== "/portfolio";
  const { isPro } = useSubscription();

  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchApi("/api/portfolio/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StatsData | null) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  // Next.js preserves scroll position across client-side navigations. When the
  // user taps "Classeur" from the mobile nav, they expect to land at the top of
  // the page — specifically on the tiles, which are the primary affordance.
  // Force a reset on mount for the root page only.
  useEffect(() => {
    if (!isSubPage && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [isSubPage]);

  if (isSubPage) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
        Mes collections
      </h2>
      <div className="flex flex-col gap-2">
        <CollectionTile
          title="Mes cartes"
          icon={BookOpen}
          imageUrl="/images/tiles/mes-cartes.png"
          accentColor="#E7BA76"
          count={stats?.cardCount}
          countLabel="cartes"
          value={stats?.cardValue ?? null}
          onPress={() => router.push("/portfolio/cartes")}
        />
        <CollectionTile
          title="Mes doubles"
          icon={Copy}
          imageUrl="/images/tiles/mes-doubles.png"
          accentColor="#60A5FA"
          count={stats?.doublesCount}
          countLabel="doublons"
          value={stats?.doublesValue ?? null}
          onPress={() => router.push("/portfolio/doubles")}
        />
        <CollectionTile
          title="Mes items"
          icon={Package}
          imageUrl="/images/tiles/mes-items.png"
          accentColor="#4ADE80"
          count={stats?.totalItems}
          countLabel="produits"
          value={stats?.itemsValue ?? null}
          onPress={() => router.push("/portfolio/items")}
        />
        <CollectionTile
          title="Liste de souhaits"
          icon={Star}
          imageUrl="/images/tiles/liste-de-souhait.png"
          accentColor="#C084FC"
          count={stats?.wishlistCount ?? 0}
          countLabel="cartes"
          value={null}
          onPress={() => router.push("/portfolio/souhaits")}
        />
      </div>

      {/* Echanges banner */}
      <button
        onClick={() => router.push(isPro ? "/echanges" : "/pricing")}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E7BA76]/40 bg-[#E7BA76]/8 px-4 py-3 text-left transition-colors hover:border-[#E7BA76]/70 hover:bg-[#E7BA76]/12"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7BA76]/20">
            <ArrowLeftRight className="h-5 w-5 text-[#E7BA76]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Chercher un échange</p>
            <p className="text-xs text-[var(--text-secondary)]">Trouve un dresseur et vois ce que vous pouvez faire</p>
          </div>
        </div>
        {isPro ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-tertiary)]"><path d="m9 18 6-6-6-6"/></svg>
        ) : (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
            style={{ background: GOLD_GRADIENT, color: "#1A1A1A" }}
          >
            ★ PREMIUM
          </span>
        )}
      </button>
    </div>
  );
}
