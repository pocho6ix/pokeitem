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
import { CardVersion, getSerieVersions } from "@/data/card-versions";
import { BackButton } from "@/components/ui/BackButton";
import { ClasseurCardGrid, type ClasseurCard, type MissingCard } from "@/components/cards/ClasseurCardGrid";
import { SYMBOL_SLUGS } from "@/data/symbol-slugs";
import { FlagFR } from "@/components/shared/FlagFR";
import { formatDateFR } from "@/lib/format-date";

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
            id:             true,
            number:         true,
            name:           true,
            rarity:         true,
            imageUrl:       true,
            price:          true,
            priceFr:        true,
            priceReverse:   true,
            isSpecial:      true,
            isFirstEdition: true,
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
      price:          price ?? null,
      isFrenchPrice,
      isSpecial:      uc.card.isSpecial,
      isFirstEdition: uc.card.isFirstEdition ?? false,
    };
  });

  // ── Full catalog (MissingCard[]) — for the "Manquantes" tab ────────────
  const allCards: MissingCard[] = (serieDb.cards ?? []).map((c) => {
    const price    = c.priceFr ?? c.price ?? null;
    const isFrenchPrice = c.priceFr != null;
    return {
      cardId:         c.id,
      number:         c.number,
      name:           c.name,
      rarity:         c.rarity as CardRarity,
      imageUrl:       c.imageUrl ?? null,
      isSpecial:      c.isSpecial,
      isFirstEdition: c.isFirstEdition ?? false,
      price:          price ?? null,
      isFrenchPrice,
    };
  });

  const ownedCount = new Set(cards.map((c) => c.cardId)).size;

  // ── Completion: user owns every applicable (cardId, version) slot ──────
  const serieVersions = getSerieVersions(serieSlug, blocSlug);
  const ownedSlots = new Set(userCards.map((uc) => `${uc.cardId}:${uc.version}`));
  let isSerieComplete = (serieDb.cards?.length ?? 0) > 0;
  if (isSerieComplete) {
    for (const c of serieDb.cards ?? []) {
      const applicable = c.isSpecial ? [CardVersion.NORMAL] : serieVersions;
      for (const v of applicable) {
        if (!ownedSlots.has(`${c.id}:${v}`)) {
          isSerieComplete = false;
          break;
        }
      }
      if (!isSerieComplete) break;
    }
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
          {formatDateFR(serieStatic.releaseDate) && (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <FlagFR size={9} className="rounded-[1px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.2)]" />
              <span>{formatDateFR(serieStatic.releaseDate)}</span>
            </p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {bloc.name} · {serieStatic.abbreviation}
                {allCards.length > 0 && (
                  <span className="ml-2 font-medium text-[var(--text-primary)]">
                    · {ownedCount} / {allCards.length} carte{allCards.length > 1 ? "s" : ""}
                  </span>
                )}
              </span>
              {SYMBOL_SLUGS.has(serieStatic.slug) && (
                <Image
                  src={`/images/symbols/${serieStatic.slug}.png`}
                  alt=""
                  width={26}
                  height={26}
                  className="h-[26px] w-[26px] shrink-0 object-contain opacity-80"
                />
              )}
            </p>
            {isSerieComplete && (
              <span className="btn-gold inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Complète
              </span>
            )}
          </div>
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
