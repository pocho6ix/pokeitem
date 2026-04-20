"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { DoublesGrid } from "@/components/cards/DoublesGrid";

export function PortfolioDoublesSerieClient() {
  const params = useParams<{ blocSlug: string; serieSlug: string }>();
  const blocSlug = params?.blocSlug;
  const serieSlug = params?.serieSlug;

  const bloc = blocSlug ? BLOCS.find((b) => b.slug === blocSlug) : undefined;
  const serieStatic = serieSlug
    ? SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug)
    : undefined;

  if (!bloc || !serieStatic) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Série introuvable.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 text-sm text-[var(--text-secondary)]"
      >
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/portfolio/doubles"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Doublons
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-[var(--text-primary)]">
            {serieStatic.name}
          </li>
        </ol>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-[var(--text-primary)]">
        Doublons — {serieStatic.name}
      </h1>

      {/* Full aggregation requires joined card data; a backend endpoint
          returning doubles grouped by serie will replace this stub. */}
      <DoublesGrid
        blocs={[]}
        totalDoubles={0}
        totalSeries={0}
        hideSeriesCount
      />
    </div>
  );
}
