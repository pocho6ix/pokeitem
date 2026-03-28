import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface BlocPageProps {
  params: Promise<{ blocSlug: string }>;
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function getSeriesForBloc(blocSlug: string) {
  return SERIES.filter((s) => s.blocSlug === blocSlug);
}

export async function generateMetadata({ params }: BlocPageProps): Promise<Metadata> {
  const { blocSlug } = await params;
  const bloc = findBloc(blocSlug);
  if (!bloc) return { title: "Bloc introuvable | PokeItem" };
  return {
    title: `${bloc.name} | Collection | PokeItem`,
    description: `Toutes les series du bloc ${bloc.name} de la collection Pokemon TCG.`,
  };
}

export default async function BlocPage({ params }: BlocPageProps) {
  const { blocSlug } = await params;
  const bloc = findBloc(blocSlug);

  if (!bloc) {
    notFound();
  }

  const series = getSeriesForBloc(bloc.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/collection" className="hover:text-blue-600 transition-colors">
          Collection
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--text-primary)]">
          {bloc.name}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {bloc.name}
          </h1>
          <Badge variant="secondary">{bloc.abbreviation}</Badge>
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Bloc {bloc.nameEn} &mdash;{" "}
          {new Date(bloc.startDate).getFullYear()}
          {bloc.endDate
            ? ` - ${new Date(bloc.endDate).getFullYear()}`
            : " - Aujourd'hui"}
        </p>
      </div>

      {/* Series grid */}
      {series.length === 0 ? (
        <p className="text-[var(--text-secondary)]">
          Aucune s&eacute;rie r&eacute;f&eacute;renc&eacute;e pour ce bloc.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((serie) => (
            <Link
              key={serie.slug}
              href={`/collection/${bloc.slug}/${serie.slug}`}
            >
              <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
                <div className="h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center p-4">
                  {serie.imageUrl ? (
                    <Image
                      src={serie.imageUrl}
                      alt={serie.name}
                      width={240}
                      height={70}
                      className="h-auto max-h-20 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-[var(--text-secondary)] opacity-40 group-hover:opacity-60 transition-opacity">
                      {serie.abbreviation}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                      {serie.name}
                    </h2>
                    <Badge variant="default">{serie.abbreviation}</Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Sortie le{" "}
                    {new Date(serie.releaseDate).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
