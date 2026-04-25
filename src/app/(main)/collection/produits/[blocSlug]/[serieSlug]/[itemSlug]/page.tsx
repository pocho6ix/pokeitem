import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { ItemImage } from "@/components/shared/ItemImage";
import { ItemBadge } from "@/components/portfolio/ItemBadge";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

interface ItemPageProps {
  params: Promise<{ blocSlug: string; serieSlug: string; itemSlug: string }>;
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function findSerie(blocSlug: string, serieSlug: string) {
  return SERIES.find((s) => s.blocSlug === blocSlug && s.slug === serieSlug);
}

/** Cheap Prisma lookup for an item by (blocSlug, serieSlug, itemSlug). */
async function findItem(blocSlug: string, serieSlug: string, itemSlug: string) {
  return prisma.item.findFirst({
    where: {
      slug: itemSlug,
      serie: { slug: serieSlug, bloc: { slug: blocSlug } },
    },
    select: {
      id:            true,
      name:          true,
      slug:          true,
      type:          true,
      imageUrl:      true,
      retailPrice:   true,
      cardmarketUrl: true,
      priceFrom:     true,
      priceSource:   true,
      priceTrend:    true,
      currentPrice:  true,
      priceUpdatedAt: true,
    },
  });
}

function formatEuro(v: number | null | undefined): string | null {
  if (v == null) return null;
  return v.toFixed(2).replace(".", ",") + "\u00A0€";
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { blocSlug, serieSlug, itemSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);
  if (!bloc || !serie) return { title: "Produit introuvable" };

  const item = await findItem(blocSlug, serieSlug, itemSlug);
  const displayName = item?.name ?? itemSlug;

  return {
    title: `${displayName} — ${serie.name}`,
    description:
      `${displayName} (${serie.name}, ${bloc.name}) : prix Cardmarket actuel, ` +
      `historique de cote et détails du produit scellé Pokémon TCG sur PokeItem.`,
    // The page now shows real info when the item exists in DB (image, price, CM
    // CTA), but still lacks composition/history/structured data. Keep noindex
    // until the full fiche refactor ships (see docs/audit-items.md §8).
    robots: { index: false, follow: true },
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { blocSlug, serieSlug, itemSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);

  if (!bloc || !serie) {
    notFound();
  }

  const item = await findItem(blocSlug, serieSlug, itemSlug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb — horizontal scroll on narrow viewports so the long
          series names don't wrap. Scrollbar visually hidden (Firefox via
          inline style, WebKit via the rule declared in globals.css). */}
      <nav
        className="scrollbar-hide mb-6 -mx-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 text-sm text-[var(--text-secondary)]"
        style={{ scrollbarWidth: "none" }}
      >
        <Link href="/collection/produits" className="hover:text-blue-600 transition-colors">
          Collection
        </Link>
        <span>/</span>
        <Link
          href={`/collection/produits/${bloc.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {bloc.name}
        </Link>
        <span>/</span>
        <Link
          href={`/collection/produits/${bloc.slug}/${serie.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {serie.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--text-primary)]">
          {item ? ITEM_TYPE_LABELS[item.type] ?? item.type : itemSlug}
        </span>
      </nav>

      {!item ? (
        /* Item not yet in DB — catalog is static-first (see docs/audit-items.md).
           Keep the "en construction" fallback until the static→DB seed lands. */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-16 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Détail de l&apos;item
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Cette page est en cours de construction. Le détail de l&apos;item
            sera bientôt disponible.
          </p>
          <Link
            href={`/collection/produits/${bloc.slug}/${serie.slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à {serie.name}
          </Link>
        </div>
      ) : (
        <>
          {/* Header card: image + name + meta */}
          <div className="flex flex-col gap-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] sm:flex-row">
            <ItemImage
              src={item.imageUrl}
              slug={item.slug}
              alt={item.name}
              size="lg"
              className="mx-auto h-48 w-48 shrink-0 rounded-xl border border-[var(--border-default)] sm:mx-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight text-[var(--text-primary)]">
                {item.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                <ItemBadge type={item.type} />
                {/* Serie logo when available, fallback to the FR name. */}
                {serie.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={serie.imageUrl}
                    alt={serie.name}
                    className="h-6 w-auto object-contain"
                  />
                ) : (
                  <span>{serie.name}</span>
                )}
              </div>

              {/* Price strip — only renders for DB rows with CM data. */}
              {(item.priceFrom != null || item.priceTrend != null) && (
                <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                    <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                      <span aria-hidden>
                        {item.priceSource === "EU" ? "🌐" : "🇫🇷"}
                      </span>
                      <span>Prix</span>
                    </dt>
                    <dd className="mt-1 font-data text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatEuro(item.priceFrom) ?? "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                      Tendance 30 j
                    </dt>
                    <dd className="mt-1 font-data text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatEuro(item.priceTrend) ?? "—"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          {/* Cardmarket CTA — partner logo only. */}
          {item.cardmarketUrl && (
            <a
              href={item.cardmarketUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label="Voir sur Cardmarket"
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 shadow-[var(--shadow-card)] transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cardmarket.png"
                alt="Cardmarket"
                className="h-5 w-auto object-contain"
              />
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
