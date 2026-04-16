import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { SYMBOL_SLUGS } from "@/data/symbol-slugs";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
} from "@/lib/seo/structured-data";

interface BlocPageProps {
  params: Promise<{ blocSlug: string }>;
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function getSeriesForBloc(blocSlug: string) {
  return SERIES.filter((s) => s.blocSlug === blocSlug);
}

export function generateStaticParams() {
  return BLOCS.map((b) => ({ blocSlug: b.slug }));
}

export async function generateMetadata({ params }: BlocPageProps): Promise<Metadata> {
  const { blocSlug } = await params;
  const bloc = findBloc(blocSlug);
  if (!bloc) return { title: "Série introuvable | PokeItem" };

  const title = `${bloc.name} — Toutes les extensions | PokeItem`;
  const description = `Explorez toutes les extensions de la série ${bloc.name} (${bloc.nameEn}) sur PokeItem : produits scellés, prix et historique.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://app.pokeitem.fr/collection/produits/${blocSlug}`,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://app.pokeitem.fr/collection/produits/${blocSlug}`,
    },
  };
}

export default async function BlocPage({ params }: BlocPageProps) {
  const { blocSlug } = await params;
  const bloc = findBloc(blocSlug);

  if (!bloc) {
    notFound();
  }

  const series = getSeriesForBloc(bloc.slug);

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { name: "Accueil", url: "/" },
    { name: "Collection", url: "/collection/produits" },
    { name: bloc.name, url: `/collection/produits/${bloc.slug}` },
  ]);

  const itemListLd = generateItemListJsonLd(
    `Extensions de la série ${bloc.name}`,
    series.map((s) => ({
      name: s.name,
      url: `/collection/produits/${bloc.slug}/${s.slug}`,
    }))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/collection/produits" className="hover:text-blue-600 transition-colors">
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
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Série {bloc.nameEn} &mdash;{" "}
          {new Date(bloc.startDate).getFullYear()}
          {bloc.endDate
            ? ` - ${new Date(bloc.endDate).getFullYear()}`
            : " - Aujourd'hui"}
        </p>
      </div>

      {/* Extensions grid */}
      {series.length === 0 ? (
        <p className="text-[var(--text-secondary)]">
          Aucune extension référencée pour cette série.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((serie) => (
            <Link
              key={serie.slug}
              href={`/collection/produits/${bloc.slug}/${serie.slug}`}
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
                    {SYMBOL_SLUGS.has(serie.slug) ? (
                      <Image
                        src={`/images/symbols/${serie.slug}.png`}
                        alt={`Symbole ${serie.name}`}
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Badge variant="default">{serie.abbreviation}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {serie.releaseDate ? <>Sortie le{" "}{new Date(serie.releaseDate).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}</> : "Série promotionnelle"}
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
