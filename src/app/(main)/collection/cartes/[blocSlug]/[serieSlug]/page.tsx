import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export const revalidate = 3600;

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
    description: `Consultez et gérez vos cartes de l'extension ${serie.name} sur PokeItem.`,
  };
}

export default async function CollectionSerieCartesPage({ params }: PageProps) {
  const { blocSlug, serieSlug } = await params;

  const bloc = BLOCS.find((b) => b.slug === blocSlug);
  const serieStatic = SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug);
  if (!bloc || !serieStatic) notFound();

  // Fetch cards from DB
  const serieDb = await prisma.serie.findUnique({
    where: { slug: serieSlug },
    include: {
      cards: {
        orderBy: [
          // Sort numerically when possible (e.g. "001" < "012" < "100")
          { number: "asc" },
        ],
      },
    },
  });

  const cards = serieDb?.cards ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-[var(--text-secondary)]">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/collection/cartes" className="hover:text-blue-600 dark:hover:text-blue-400">
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
            {serieStatic.name}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        {serieStatic.imageUrl && (
          <div className="relative h-14 w-24 shrink-0">
            <Image
              src={serieStatic.imageUrl}
              alt={serieStatic.name}
              fill
              sizes="96px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {serieStatic.name}
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Série {bloc.name} · {serieStatic.abbreviation}
            {cards.length > 0 && (
              <span className="ml-2 font-medium text-[var(--text-primary)]">
                · {cards.length} cartes
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Card grid */}
      {cards.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {cards.map((card) => (
            <div
              key={card.id}
              className="group relative cursor-pointer"
              title={`${card.number} · ${card.name}`}
            >
              {/* Card image */}
              <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-subtle)] shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={`${card.name} — ${card.number}`}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12.5vw"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                      {card.number}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                      {card.name}
                    </span>
                  </div>
                )}
                {/* Number badge */}
                <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
                  {card.number}
                </div>
              </div>

              {/* Card name */}
              <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">
                {card.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
