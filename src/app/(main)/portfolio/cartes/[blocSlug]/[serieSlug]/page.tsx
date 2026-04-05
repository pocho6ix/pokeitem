import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { prisma } from "@/lib/prisma";
import { CardRarity, CardCondition } from "@/types/card";
import { CardVersion } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";
import { ClasseurCardGrid, type ClasseurCard } from "@/components/cards/ClasseurCardGrid";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

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
          isSpecial:    true,
        },
      },
    },
    orderBy: { card: { number: "asc" } },
  });

  const cards: ClasseurCard[] = userCards.map((uc) => {
    const version = uc.version as CardVersion;
    const price =
      version === CardVersion.REVERSE
        ? (uc.card.priceReverse ?? uc.card.price)
        : uc.card.price;

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
      isSpecial:  uc.card.isSpecial,
    };
  });

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
            {cards.length > 0 && (
              <span className="ml-2 font-medium text-[var(--text-primary)]">
                · {cards.length} carte{cards.length > 1 ? "s" : ""} possédée{cards.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      <ClasseurCardGrid cards={cards} blocSlug={blocSlug} serieSlug={serieSlug} />
    </div>
  );
}
