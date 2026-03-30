import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export function generateStaticParams() {
  return SERIES.map((s) => ({
    blocSlug: s.blocSlug,
    serieSlug: s.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serieSlug } = await params;
  const serie = SERIES.find((s) => s.slug === serieSlug);
  if (!serie) return { title: "Série introuvable | PokeItem" };
  return {
    title: `Cartes ${serie.name} | Collection PokeItem`,
    description: `Gérez votre collection de cartes de l'extension ${serie.name}.`,
  };
}

export default async function CollectionSerieCartesPage({ params }: PageProps) {
  const { blocSlug, serieSlug } = await params;

  const bloc = BLOCS.find((b) => b.slug === blocSlug);
  const serie = SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug);

  if (!bloc || !serie) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-[var(--text-secondary)]">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/collection" className="hover:text-blue-600 dark:hover:text-blue-400">
              Collection
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/collection/cartes" className="hover:text-blue-600 dark:hover:text-blue-400">
              Cartes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-[var(--text-primary)]">
            {serie.name}
          </li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {serie.name}
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Série {bloc.name} · {serie.abbreviation}
        </p>
      </div>

      {/* Placeholder — cards grid will go here once DB is seeded */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-20 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-[var(--text-secondary)] opacity-40"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <p className="text-lg font-semibold text-[var(--text-primary)]">
          Cartes à venir
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Les cartes de cette extension seront disponibles prochainement.
        </p>
      </div>
    </div>
  );
}
