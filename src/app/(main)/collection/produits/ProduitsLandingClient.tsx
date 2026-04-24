"use client";

// ---------------------------------------------------------------------------
// Client shell for /collection/produits — hosts the Par-type / Par-série sub
// tabs. Lives as a client component so the iOS/Capacitor static export
// (`next build && output: 'export'`) can still hydrate the view toggle from
// `?view=series` at runtime. The server page keeps the <Metadata> plumbing.
// ---------------------------------------------------------------------------

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { Card } from "@/components/ui/Card";
import { ItemsCatalogGrid } from "@/components/collection/ItemsCatalogGrid";

function formatPeriod(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  if (!endDate) return `${start} - Aujourd'hui`;
  const end = new Date(endDate).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  return `${start} - ${end}`;
}

function getSeriesCount(blocSlug: string): number {
  return SERIES.filter((s) => s.blocSlug === blocSlug).length;
}

const GRADIENT_PALETTES = [
  "from-blue-500/20 to-purple-500/20",
  "from-red-500/20 to-orange-500/20",
  "from-green-500/20 to-teal-500/20",
  "from-amber-500/20 to-yellow-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-indigo-500/20 to-blue-500/20",
  "from-violet-500/20 to-fuchsia-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-emerald-500/20 to-green-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-teal-500/20 to-cyan-500/20",
  "from-fuchsia-500/20 to-pink-500/20",
  "from-sky-500/20 to-indigo-500/20",
];

const EXCLUDED_BLOCS = new Set(["collection-mcdo", "pokemon-organized-play"]);

export function ProduitsLandingClient() {
  const params = useSearchParams();
  const view = params.get("view");
  const mode = view === "series" ? "series" : "catalogue";

  const visibleBlocs = BLOCS.filter((b) => !EXCLUDED_BLOCS.has(b.slug));

  return (
    <>
      {/* Sub-tab switch: catalogue flat (default) vs bloc drill-down */}
      <div className="mb-6 inline-flex rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] p-1">
        <Link
          href="/collection/produits"
          scroll={false}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "catalogue"
              ? "bg-[#E7BA76] text-black"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Par type
        </Link>
        <Link
          href="/collection/produits?view=series"
          scroll={false}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "series"
              ? "bg-[#E7BA76] text-black"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Par série
        </Link>
      </div>

      {mode === "catalogue" ? (
        <ItemsCatalogGrid />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleBlocs.map((bloc, index) => {
            const seriesCount = getSeriesCount(bloc.slug);
            const gradient =
              GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

            return (
              <Link key={bloc.slug} href={`/collection/produits/${bloc.slug}`}>
                <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
                  <div
                    className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}
                  >
                    {bloc.imageUrl ? (
                      <Image
                        src={bloc.imageUrl}
                        alt={bloc.name}
                        width={280}
                        height={80}
                        className="h-auto max-h-24 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-4xl font-extrabold text-[var(--text-secondary)] opacity-40 group-hover:opacity-60 transition-opacity">
                        {bloc.abbreviation}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                        {bloc.name}
                      </h2>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {formatPeriod(bloc.startDate, bloc.endDate)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {seriesCount > 0
                        ? `${seriesCount} extension${seriesCount > 1 ? "s" : ""}`
                        : "Aucune extension référencée"}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
