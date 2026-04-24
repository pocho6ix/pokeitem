"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ItemDetailForm } from "@/components/portfolio/ItemDetailForm";
import { fetchApi } from "@/lib/api";

type PortfolioItemDTO = {
  id: string;
  quantity: number;
  purchasePrice: number | null;
  currentPrice: number | null;
  currentPriceUpdatedAt: string | null;
  item: {
    id: string;
    name: string;
    slug: string;
    type: string;
    imageUrl: string | null;
    retailPrice: number | null;
    cardmarketUrl: string | null;
    serieName: string | null;
    blocName: string | null;
  };
};

export function ItemDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [portfolioItem, setPortfolioItem] = useState<PortfolioItemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi("/api/portfolio");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        const row = (data?.items ?? []).find(
          (pi: { id: string }) => pi.id === id,
        );
        if (!row) {
          setNotFound(true);
        } else {
          setPortfolioItem({
            id: row.id,
            quantity: row.quantity,
            purchasePrice: row.purchasePrice ?? null,
            currentPrice: row.currentPrice ?? null,
            currentPriceUpdatedAt: row.currentPriceUpdatedAt ?? null,
            item: {
              id: row.item.id,
              name: row.item.name,
              slug: row.item.slug,
              type: row.item.type,
              imageUrl: row.item.imageUrl,
              retailPrice: row.item.retailPrice,
              cardmarketUrl: row.item.cardmarketUrl ?? null,
              serieName: row.item.serie?.name ?? null,
              blocName: row.item.serie?.bloc?.name ?? null,
            },
          });
        }
      } catch {
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Chargement…
      </div>
    );
  }

  if (notFound || !portfolioItem) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Item introuvable.
      </div>
    );
  }

  return <ItemDetailForm portfolioItem={portfolioItem} />;
}
