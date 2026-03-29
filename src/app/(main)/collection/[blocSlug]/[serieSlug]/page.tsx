import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { ITEM_TYPES } from "@/data/item-types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

interface SeriePageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function findSerie(blocSlug: string, serieSlug: string) {
  return SERIES.find((s) => s.blocSlug === blocSlug && s.slug === serieSlug);
}

export async function generateMetadata({ params }: SeriePageProps): Promise<Metadata> {
  const { blocSlug, serieSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);
  if (!bloc || !serie) return { title: "Serie introuvable | PokeItem" };
  return {
    title: `${serie.name} | ${bloc.name} | PokeItem`,
    description: `Decouvrez les items scelles de la serie ${serie.name} du bloc ${bloc.name}.`,
  };
}

export default async function SeriePage({ params }: SeriePageProps) {
  const { blocSlug, serieSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);

  if (!bloc || !serie) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/collection" className="hover:text-blue-600 transition-colors">
          Collection
        </Link>
        <span>/</span>
        <Link
          href={`/collection/${bloc.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {bloc.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--text-primary)]">
          {serie.name}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {serie.name}
          </h1>
          <Badge variant="default">{serie.abbreviation}</Badge>
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Sortie le{" "}
          {new Date(serie.releaseDate).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" "}&mdash; Bloc {bloc.name}
        </p>
      </div>

      {/* Item types grid */}
      <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
        Types de produits disponibles
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ITEM_TYPES.filter((it) => it.typicalMsrp > 0).map((itemType) => (
          <Card key={itemType.type} className="flex flex-col p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge
                className={ITEM_TYPE_COLORS[itemType.type] ?? ""}
              >
                {ITEM_TYPE_LABELS[itemType.type] ?? itemType.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              {itemType.label}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3 flex-1">
              {itemType.description}
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                ~{formatPrice(itemType.typicalMsrp)}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Portfolio
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
