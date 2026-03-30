// ---------------------------------------------------------------------------
// Pokecardex-style series list grouped by bloc
// Shows owned/total progress per series
// ---------------------------------------------------------------------------

import Link from "next/link";
import Image from "next/image";
import type { BlocCardProgress } from "@/types/card";

interface BlocSerieCardListProps {
  blocs: BlocCardProgress[];
  /** Base URL prefix — "/collection/cartes" or "/portfolio/cartes" */
  baseUrl: string;
}

export function BlocSerieCardList({ blocs, baseUrl }: BlocSerieCardListProps) {
  return (
    <div className="space-y-10">
      {blocs.map((bloc) => (
        <section key={bloc.blocSlug}>
          {/* Bloc header */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {bloc.blocName}
            </h2>
            {bloc.blocAbbreviation && (
              <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                {bloc.blocAbbreviation}
              </span>
            )}
          </div>

          {/* Series list */}
          <div className="divide-y divide-[var(--border-default)] rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
            {bloc.series.map((serie) => {
              const pct =
                serie.totalCards > 0
                  ? Math.round((serie.ownedCards / serie.totalCards) * 100)
                  : 0;

              return (
                <Link
                  key={serie.serieSlug}
                  href={`${baseUrl}/${bloc.blocSlug}/${serie.serieSlug}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  {/* Serie image */}
                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded">
                    {serie.serieImageUrl ? (
                      <Image
                        src={serie.serieImageUrl}
                        alt={serie.serieName}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--text-secondary)]">
                        {serie.serieAbbreviation ?? "?"}
                      </div>
                    )}
                  </div>

                  {/* Name + progress */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {serie.serieName}
                      </span>
                      <span className="shrink-0 font-data text-xs text-[var(--text-secondary)]">
                        {serie.ownedCards}/{serie.totalCards || "?"}&nbsp;·&nbsp;{pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              );
            })}

            {bloc.series.length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--text-secondary)]">
                Aucune extension dans cette série.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
