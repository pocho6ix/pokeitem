import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { getCachedSerieCards } from "@/lib/cached-queries";
import { getPriceForVersion } from "@/lib/display-price";
import { CardRarity, CardCondition } from "@/types/card";
import { CardVersion } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";
import { ClasseurCardGrid, type ClasseurCard, type MissingCard } from "@/components/cards/ClasseurCardGrid";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export const revalidate = 0; // dynamic — owned data is per-user

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serieSlug } = await params;
  const serie = SERIES.find((s) => s.slug === serieSlug);
  if (!serie) return { title: "Série introuvable | PokeItem" };
  return {
    title: `Mon Classeur — ${serie.name}`,
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

  // ── Fetch full serie catalog (cached 1h) + user's owned cards ─────────
  const [serieDb, userCards] = await Promise.all([
    getCachedSerieCards(serieSlug),
    prisma.userCard.findMany({
      where: { userId, card: { serie: { slug: serieSlug } } },
      include: {
        card: {
          select: {
            id:           true,
            number:       true,
            name:         true,
            rarity:       true,
            imageUrl:     true,
            price:        true,
            priceFr:      true,
            priceReverse: true,
            isSpecial:    true,
          },
        },
      },
      orderBy: { card: { number: "asc" } },
    }),
  ]);

  if (!serieDb) notFound();

  // ── Owned cards (ClasseurCard[]) ────────────────────────────────────────
  const cards: ClasseurCard[] = userCards.map((uc) => {
    const version = uc.version as CardVersion;
    const price = getPriceForVersion(uc.card, version);
    const isFrenchPrice =
      version === CardVersion.NORMAL && uc.card.priceFr != null;
    return {
      id:         uc.id,
      cardId:     uc.card.id,
      version,
      condition:  (uc.condition as CardCondition) ?? CardCondition.NEAR_MINT,
      gradeValue: uc.gradeValue ?? null,
      number:     uc.card.number,
      name:       uc.card.name,
      rarity:     uc.card.rarity as CardRarity,
      imageUrl:   uc.card.imageUrl,
      price:      price ?? null,
      isFrenchPrice,
      isSpecial:  uc.card.isSpecial,
    };
  });

  // ── Full catalog (MissingCard[]) — for the "Manquantes" tab ────────────
  const allCards: MissingCard[] = (serieDb.cards ?? []).map((c) => {
    const price    = c.priceFr ?? c.price ?? null;
    const isFrenchPrice = c.priceFr != null;
    return {
      cardId:       c.id,
      number:       c.number,
      name:         c.name,
      rarity:       c.rarity as CardRarity,
      imageUrl:     c.imageUrl ?? null,
      isSpecial:    c.isSpecial,
      price:        price ?? null,
      isFrenchPrice,
    };
  });

  const ownedCount = new Set(cards.map((c) => c.cardId)).size;

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

      {/* Serie header */}
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
            {allCards.length > 0 && (
              <span className="ml-2 font-medium text-[var(--text-primary)]">
                · {ownedCount} / {allCards.length} carte{allCards.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      <ClasseurCardGrid
        cards={cards}
        allCards={allCards.length > 0 ? allCards : undefined}
        blocSlug={blocSlug}
        serieSlug={serieSlug}
      />
    </div>
  );
}
