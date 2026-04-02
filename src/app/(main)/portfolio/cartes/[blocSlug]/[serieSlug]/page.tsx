import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { CARD_RARITY_SYMBOL, CardRarity } from "@/types/card";
import { CARD_VERSION_LABELS, CardVersion } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serieSlug } = await params;
  const serie = SERIES.find((s) => s.slug === serieSlug);
  if (!serie) return { title: "Série introuvable | PokeItem" };
  return {
    title: `Mon Classeur — ${serie.name} | PokeItem`,
  };
}

export default async function ClasseurExtensionPage({ params }: PageProps) {
  const { blocSlug, serieSlug } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) redirect("/connexion");

  const bloc        = BLOCS.find((b) => b.slug === blocSlug);
  const serieStatic = SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug);
  if (!bloc || !serieStatic) notFound();

  // Fetch only the cards owned by the user in this serie
  const serieDb = await prisma.serie.findUnique({
    where: { slug: serieSlug },
    select: { id: true, cardCount: true },
  });

  if (!serieDb) notFound();

  const userCards = await prisma.userCard.findMany({
    where: { userId, card: { serieId: serieDb.id } },
    include: {
      card: {
        select: {
          id:           true,
          number:       true,
          name:         true,
          rarity:       true,
          imageUrl:     true,
          price:        true,
          priceReverse: true,
        },
      },
    },
    orderBy: { card: { number: "asc" } },
  });

  function formatEur(value: number | null | undefined) {
    if (!value) return null;
    return value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-5 text-sm text-[var(--text-secondary)]">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/portfolio/cartes" className="hover:text-[var(--text-primary)]">
              Classeur
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/portfolio/cartes" className="hover:text-[var(--text-primary)]">
              {bloc.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-[var(--text-primary)]">{serieStatic.name}</li>
        </ol>
      </nav>

      {/* Back + serie header */}
      <div className="mb-6 flex items-center gap-4">
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{serieStatic.name}</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {bloc.name} · {serieStatic.abbreviation}
            {userCards.length > 0 && (
              <span className="ml-2 font-medium text-[var(--text-primary)]">
                · {userCards.length} carte{userCards.length > 1 ? "s" : ""} possédée{userCards.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {userCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] py-16 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Aucune carte possédée
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Ajoutez des cartes depuis la{" "}
            <Link
              href={`/collection/cartes/${blocSlug}/${serieSlug}`}
              className="text-blue-400 hover:underline"
            >
              Collection
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {userCards.map((uc) => {
            const version = uc.version as CardVersion;
            const rarity  = uc.card.rarity as CardRarity;
            const price   =
              version === CardVersion.REVERSE
                ? (uc.card.priceReverse ?? uc.card.price)
                : uc.card.price;

            return (
              <Link
                key={uc.id}
                href={`/carte/${uc.card.id}`}
                className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden hover:border-[var(--border-focus)] transition-colors"
              >
                {/* Card image */}
                <div className="relative aspect-[2/3] bg-[var(--bg-subtle)]">
                  {uc.card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uc.card.imageUrl}
                      alt={uc.card.name}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--text-tertiary)] text-xs">
                      {uc.card.number}
                    </div>
                  )}
                  {/* Version badge */}
                  {version !== CardVersion.NORMAL && (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {version === CardVersion.REVERSE ? "REV" :
                       version === CardVersion.REVERSE_POKEBALL ? "BALL" : "MBALL"}
                    </span>
                  )}
                </div>

                {/* Card info */}
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {uc.card.name}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {CARD_RARITY_SYMBOL[rarity]} {uc.card.number}
                    </span>
                    {price !== null && price !== undefined && price > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400">
                        {formatEur(price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
