// ---------------------------------------------------------------------------
// Pokecardex-style series list grouped by bloc
// Shows owned/total progress per series
// ---------------------------------------------------------------------------
'use client'
import Link from "next/link";
import Image from "next/image";
import type { BlocCardProgress } from "@/types/card";
import { CollectionValue } from "@/components/collection/CollectionValue";

interface BlocSerieCardListProps {
  blocs: BlocCardProgress[];
  /** Base URL prefix — "/collection/cartes" or "/portfolio/cartes" */
  baseUrl: string;
  /**
   * Show the per-serie market value chip next to the progress count.
   * Relevant on /portfolio/cartes (Classeur) where the viewer sees their
   * own holdings; hidden on /collection/cartes which is catalogue-only.
   * Defaults to true to preserve legacy call sites.
   */
  showMarketValue?: boolean;
}

export function BlocSerieCardList({ blocs, baseUrl, showMarketValue = true }: BlocSerieCardListProps) {
  return (
    <div className="space-y-10">
      {blocs.map((bloc) => (
        <section key={bloc.blocSlug}>
          {/* Bloc header */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {bloc.blocName}
            </h2>
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
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                        {/* Strip the " ED1" suffix from the display name; the
                            badge image below carries the same information
                            with more visual weight. */}
                        <span className="truncate">{serie.serieName.replace(/\s+ED1$/i, "")}</span>
                        {serie.serieSlug.endsWith("-1ed") && (
                          <Image
                            src="/images/badges/edition-1.png"
                            alt="Édition 1"
                            width={20}
                            height={20}
                            className="h-5 w-auto shrink-0 object-contain"
                          />
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-data text-xs text-[var(--text-secondary)]">
                          {serie.ownedCards}/{serie.totalCards || "?"}&nbsp;·&nbsp;{pct}%
                        </span>
                        {showMarketValue && serie.marketValue > 0 && (
                          <CollectionValue
                            value={serie.marketValue}
                            className="font-data text-xs font-semibold text-emerald-400"
                          />
                        )}
                        {/* Complete badge — gold filled circle + check, matches the CTA buttons */}
                        {serie.isComplete && (
                          <span
                            className="btn-gold inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                            aria-label="Série complète"
                            title="Série complète"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a1308" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m5 12 5 5L20 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #AA771C, #D4A853, #E7BA76)",
                        }}
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
                    className="shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--color-primary)] transition-colors"
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
