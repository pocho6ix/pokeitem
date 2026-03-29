import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { ITEM_TYPES } from "@/data/item-types";
import { Badge } from "@/components/ui/Badge";
import { SerieItemsGrid } from "@/components/collection/SerieItemsGrid";
import { prisma } from "@/lib/prisma";

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

  // Fetch real items from DB for this series (if any)
  let dbItems: Array<{
    id: string;
    name: string;
    type: string;
    imageUrl: string | null;
    currentPrice: number | null;
    priceTrend: number | null;
    retailPrice: number | null;
    serie: { name: string; abbreviation: string | null } | null;
  }> = [];

  try {
    const dbSerie = await prisma.serie.findFirst({
      where: { slug: serieSlug },
    });
    if (dbSerie) {
      dbItems = await prisma.item.findMany({
        where: { serieId: dbSerie.id },
        select: {
          id: true,
          name: true,
          type: true,
          imageUrl: true,
          currentPrice: true,
          priceTrend: true,
          retailPrice: true,
          serie: { select: { name: true, abbreviation: true } },
        },
      });
    }
  } catch {
    // DB not available, continue with static data
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

      <SerieItemsGrid
        itemTypes={ITEM_TYPES}
        serieName={serie.name}
        serieAbbreviation={serie.abbreviation}
        dbItems={dbItems.map((i) => ({
          ...i,
          serie: i.serie ?? undefined,
        }))}
      />
    </div>
  );
}
