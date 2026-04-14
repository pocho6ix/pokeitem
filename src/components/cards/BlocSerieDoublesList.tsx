// ---------------------------------------------------------------------------
// List of series that contain duplicate cards, grouped by bloc.
// Mirrors BlocSerieCardList's look & feel so "mes doubles" feels consistent
// with "mes cartes" (list view → drill into a serie).
// ---------------------------------------------------------------------------
"use client";
import Link from "next/link";
import Image from "next/image";
import { CollectionValue } from "@/components/collection/CollectionValue";

export interface DoublesSerieRow {
  serieSlug:         string;
  serieName:         string;
  serieAbbreviation: string | null;
  serieImageUrl:     string | null;
  /** Number of distinct (cardId, version) pairs with quantity > 1 */
  distinctDoubles:   number;
  /** Sum of (quantity - 1) — total number of "extra copies" you could trade/sell */
  extraCopies:       number;
  /** Total monetary value of those extra copies */
  extraValue:        number;
}

export interface DoublesBloc {
  blocSlug:         string;
  blocName:         string;
  blocAbbreviation: string | null;
  series:           DoublesSerieRow[];
}

interface BlocSerieDoublesListProps {
  blocs: DoublesBloc[];
}

export function BlocSerieDoublesList({ blocs }: BlocSerieDoublesListProps) {
  if (blocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]">
            <rect width="8" height="10" x="2"  y="7" rx="1"/>
            <rect width="8" height="10" x="14" y="7" rx="1"/>
          </svg>
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Aucun doublon</p>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Vos doublons apparaîtront ici dès que vous possèderez plus d&apos;un exemplaire d&apos;une même carte.
        </p>
      </div>
    );
  }

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
            {bloc.series.map((serie) => (
              <Link
                key={serie.serieSlug}
                href={`/portfolio/doubles/${bloc.blocSlug}/${serie.serieSlug}`}
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

                {/* Name + counts */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                      {serie.serieName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-data text-xs text-[var(--text-secondary)]">
                        {serie.distinctDoubles}&nbsp;carte{serie.distinctDoubles > 1 ? "s" : ""}
                        &nbsp;·&nbsp;
                        {serie.extraCopies}&nbsp;copie{serie.extraCopies > 1 ? "s" : ""}
                      </span>
                      {serie.extraValue > 0 && (
                        <CollectionValue
                          value={serie.extraValue}
                          className="font-data text-xs font-semibold text-emerald-400"
                        />
                      )}
                    </div>
                  </div>

                  {/* Subtle subtitle explaining the numbers */}
                  <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                    Valeur des exemplaires en surplus
                  </p>
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
