import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TabNav } from "@/components/ui/TabNav";

export const metadata: Metadata = {
  title: "Collection Pokemon TCG | PokeItem",
  description:
    "Explorez tous les items scelles par série et extension de la collection Pokemon TCG.",
};

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

export default function CollectionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Collection Pok&eacute;mon TCG
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Explorez tous les items scell&eacute;s par s&eacute;rie et extension
        </p>
      </div>

      <TabNav
        tabs={[
          { label: "Produits scellés", href: "/collection", active: true },
          { label: "Cartes", href: "/collection/cartes", active: false },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BLOCS.map((bloc, index) => {
          const seriesCount = getSeriesCount(bloc.slug);
          const gradient =
            GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

          return (
            <Link key={bloc.slug} href={`/collection/${bloc.slug}`}>
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
                    <Badge variant="secondary">{bloc.abbreviation}</Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {formatPeriod(bloc.startDate, bloc.endDate)}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {seriesCount > 0
                      ? `${seriesCount} extension${seriesCount > 1 ? "s" : ""}`
                      : "Aucune extension r\u00e9f\u00e9renc\u00e9e"}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
