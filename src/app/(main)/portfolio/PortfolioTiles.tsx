"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Copy, Package, Star } from "lucide-react";
import { usePathname } from "next/navigation";
import { CollectionTile } from "@/components/portfolio/CollectionTile";

interface StatsData {
  totalItems: number;
  cardCount?: number;
  doublesCount?: number;
  cardValue?: number | null;
  doublesValue?: number | null;
  totalValue?: number;
  wishlistCount?: number;
}

export function PortfolioTiles() {
  const router = useRouter();
  const pathname = usePathname();
  const isSubPage = pathname !== "/portfolio";

  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/portfolio/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StatsData | null) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

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
          value={stats?.totalValue ?? null}
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
    </div>
  );
}
