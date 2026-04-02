import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { CardCollectionGrid } from "@/components/cards/CardCollectionGrid";
import { BackButton } from "@/components/ui/BackButton";
import type { CardRow, OwnedEntry } from "@/components/cards/CardCollectionGrid";
import { CardRarity } from "@/types/card";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export const revalidate = 0; // dynamic — owned data is per-user

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

  const bloc        = BLOCS.find((b) => b.slug === blocSlug);
  const serieStatic = SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug);
  if (!bloc || !serieStatic) notFound();

  // ── Auth + user data ────────────────────────────────────────────────────
  const session  = await getServerSession(authOptions);
  const userId   = (session?.user as { id?: string } | undefined)?.id ?? null;

  // ── Fetch cards from DB ─────────────────────────────────────────────────
  const serieDb = await prisma.serie.findUnique({
    where: { slug: serieSlug },
    include: {
      cards: {
        orderBy: { number: "asc" },
      },
    },
  });

  const dbCards = serieDb?.cards ?? [];

  // ── Fetch user's owned cards (if authenticated) ────────────────────────
  let initialOwned: OwnedEntry[] = [];

  if (userId && serieDb) {
    const userCards = await prisma.userCard.findMany({
      where: { userId, card: { serieId: serieDb.id } },
      select: { id: true, cardId: true, quantity: true, condition: true, language: true, foil: true, version: true },
    });
    initialOwned = userCards as OwnedEntry[];
  }

  // ── Shape cards for the grid ────────────────────────────────────────────
  const cards: CardRow[] = dbCards.map((c) => ({
    id:           c.id,
    number:       c.number,
    name:         c.name,
    rarity:       c.rarity as CardRarity,
    imageUrl:     c.imageUrl,
    price:        c.price ?? null,
    priceReverse: c.priceReverse ?? null,
    isSpecial:    c.isSpecial,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Back */}
      <div className="mb-4">
        <BackButton />
      </div>

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

      {/* Card grid (interactive) or empty state */}
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
          <p className="text-lg font-semibold text-[var(--text-primary)]">Cartes à venir</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Les cartes de cette extension seront disponibles prochainement.
          </p>
        </div>
      ) : (
        <CardCollectionGrid
          cards={cards}
          serieSlug={serieSlug}
          blocSlug={blocSlug}
          initialOwned={initialOwned}
          isAuthenticated={!!userId}
        />
      )}
    </div>
  );
}
