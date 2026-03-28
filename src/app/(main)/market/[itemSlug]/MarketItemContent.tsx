"use client";

import { ShoppingBag } from "lucide-react";

interface MarketItemContentProps {
  itemSlug: string;
  displayName: string;
}

export default function MarketItemContent({ displayName }: MarketItemContentProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Offres pour {displayName}
      </h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        Retrouvez les meilleures offres du marché pour cet item.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-[var(--bg-tertiary)] p-4 mb-4">
          <ShoppingBag className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Aucune annonce pour le moment
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-md">
          Les annonces seront disponibles une fois le scraping activé.
        </p>
      </div>
    </div>
  );
}
