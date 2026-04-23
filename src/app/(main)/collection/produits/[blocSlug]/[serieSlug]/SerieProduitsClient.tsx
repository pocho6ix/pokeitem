"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { ITEM_TYPES } from "@/data/item-types";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
import { ITEM_IMAGES_BY_SERIE } from "@/data/item-images-map.generated";
import { Badge } from "@/components/ui/Badge";
import { SYMBOL_SLUGS } from "@/data/symbol-slugs";
import { SerieItemsGrid } from "@/components/collection/SerieItemsGrid";
import { BackButton } from "@/components/ui/BackButton";
import { fetchApi } from "@/lib/api";

type DbItem = {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  imageUrl: string | null;
  currentPrice: number | null;
  priceTrend: number | null;
  retailPrice: number | null;
  serie?: { name: string; abbreviation: string | null };
};

export function SerieProduitsClient() {
  const params = useParams<{ blocSlug: string; serieSlug: string }>();
  const blocSlug = params?.blocSlug;
  const serieSlug = params?.serieSlug;

  const bloc = blocSlug ? BLOCS.find((b) => b.slug === blocSlug) : undefined;
  const serieStatic = serieSlug
    ? SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug)
    : undefined;

  const [items, setItems] = useState<DbItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serieSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi(
          `/api/items?serieSlug=${encodeURIComponent(serieSlug)}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch (err) {
        console.error("serie produits load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serieSlug]);

  if (!bloc || !serieStatic) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Série introuvable.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 text-sm text-[var(--text-secondary)]"
      >
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/collection/produits"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Produits scellés
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-[var(--text-primary)]">
            {serieStatic.name}
          </li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center gap-4">
        {serieStatic.imageUrl && (
          <div className="relative h-14 w-24 shrink-0">
            <Image
              src={serieStatic.imageUrl}
              alt={serieStatic.name}
              fill
              sizes="96px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {serieStatic.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
            <span>
              Série {bloc.name} · {serieStatic.abbreviation}
            </span>
            {SYMBOL_SLUGS.has(serieStatic.slug) && (
              <Image
                src={`/images/symbols/${serieStatic.slug}.png`}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain opacity-80"
              />
            )}
            {items.length > 0 && (
              <Badge variant="secondary">{items.length} produits</Badge>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">
          Chargement…
        </div>
      ) : (
        <SerieItemsGrid
          itemTypes={ITEM_TYPES.map((t) => ({
            type: t.type,
            label: ITEM_TYPE_LABELS[t.type as keyof typeof ITEM_TYPE_LABELS] ?? t.type,
            description: t.description ?? "",
            typicalMsrp: t.typicalMsrp ?? 0,
          }))}
          serieName={serieStatic.name}
          serieSlug={serieSlug!}
          blocSlug={blocSlug!}
          serieAbbreviation={serieStatic.abbreviation ?? ""}
          dbItems={items}
          availableImageTypes={[...(ITEM_IMAGES_BY_SERIE[serieSlug!] ?? [])]}
        />
      )}
    </div>
  );
}
