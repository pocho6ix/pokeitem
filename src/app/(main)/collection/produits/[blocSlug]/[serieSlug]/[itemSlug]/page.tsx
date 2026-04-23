import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";

interface ItemPageProps {
  params: Promise<{ blocSlug: string; serieSlug: string; itemSlug: string }>;
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function findSerie(blocSlug: string, serieSlug: string) {
  return SERIES.find((s) => s.blocSlug === blocSlug && s.slug === serieSlug);
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { blocSlug, serieSlug, itemSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);
  if (!bloc || !serie) return { title: "Produit introuvable" };
  return {
    title: `${itemSlug} — ${serie.name}`,
    description: `${itemSlug} (${serie.name}, ${bloc.name}) : prix Cardmarket actuel, historique de cote, description et détails du produit scellé Pokémon TCG sur PokeItem.`,
    // The JSX body below is still a placeholder ("Détail de l'item — en
    // cours de construction"). Indexing it as-is would hand Google a
    // Soft-404 / thin-content signal across ~70 URLs and drag the
    // domain down. `follow: true` keeps the outbound breadcrumb + back
    // link in the crawl graph so internal equity keeps flowing while
    // we build the real fiche. Drop `robots` entirely (or flip to
    // `index: true`) once the page ships real content.
    robots: { index: false, follow: true },
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { blocSlug, serieSlug, itemSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);

  if (!bloc || !serie) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/collection/produits" className="hover:text-blue-600 transition-colors">
          Collection
        </Link>
        <span>/</span>
        <Link
          href={`/collection/produits/${bloc.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {bloc.name}
        </Link>
        <span>/</span>
        <Link
          href={`/collection/produits/${bloc.slug}/${serie.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {serie.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--text-primary)]">
          {itemSlug}
        </span>
      </nav>

      {/* Placeholder content.
          TODO — when the real item fiche ships (image, prix, composition,
          CreativeWork/Product JSON-LD, etc.), also remove the
          `robots: { index: false, follow: true }` entry in
          `generateMetadata` above so the page becomes indexable. The URL
          is already in the sitemap and already maillée from SerieItemsGrid;
          only the noindex flag holds indexation back. */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] p-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Détail de l&apos;item
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Cette page est en cours de construction. Le détail de l&apos;item
          sera bientôt disponible.
        </p>
        <Link
          href={`/collection/produits/${bloc.slug}/${serie.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          &larr; Retour à {serie.name}
        </Link>
      </div>
    </div>
  );
}
