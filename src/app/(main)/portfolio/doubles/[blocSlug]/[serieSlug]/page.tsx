import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { CardVersion } from "@/data/card-versions";
import { getPriceForVersion } from "@/lib/display-price";
import { DoublesGrid, type BlocGroup } from "@/components/cards/DoublesGrid";

interface PageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serieSlug } = await params;
  const serie = SERIES.find((s) => s.slug === serieSlug);
  if (!serie) return { title: "Série introuvable" };
  return {
    title: `Doublons — ${serie.name}`,
    description: `Vos cartes en doublon pour l'extension ${serie.name} : quantités, versions et cote Cardmarket pour chaque carte, idéal pour préparer vos échanges.`,
    robots: { index: false, follow: true },
  };
}

export default async function DoublesSerieDetailPage({ params }: PageProps) {
  const { blocSlug, serieSlug } = await params;

  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (!userId) redirect("/connexion");

  const bloc        = BLOCS.find((b) => b.slug === blocSlug);
  const serieStatic = SERIES.find((s) => s.slug === serieSlug && s.blocSlug === blocSlug);
  if (!bloc || !serieStatic) notFound();

  const doubles = await prisma.userCard.findMany({
    where: {
      userId,
      quantity: { gt: 1 },
      card: { serie: { slug: serieSlug } },
    },
    select: {
      id:       true,
      cardId:   true,
      quantity: true,
      version:  true,
      card: {
        select: {
          name:         true,
          number:       true,
          imageUrl:     true,
          price:        true,
          priceFr:      true,
          priceReverse: true,
          isSpecial:    true,
          serie: {
            select: {
              slug: true,
              name: true,
              bloc: { select: { slug: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ card: { number: "asc" } }],
  });

  // ── Turn into the BlocGroup shape that DoublesGrid expects ────────────
  const rows = doubles.map((uc) => {
    const version = (uc.version ?? CardVersion.NORMAL) as CardVersion;
    const isFrenchPrice = version === CardVersion.NORMAL && uc.card.priceFr != null;
    return {
      id:            uc.id,
      cardId:        uc.cardId,
      cardName:      uc.card.name,
      cardNumber:    uc.card.number,
      cardImageUrl:  uc.card.imageUrl,
      cardPrice:     getPriceForVersion(uc.card, version) || null,
      isFrenchPrice,
      cardIsSpecial: uc.card.isSpecial,
      serieSlug:     uc.card.serie.slug,
      serieName:     uc.card.serie.name,
      blocSlug:      uc.card.serie.bloc.slug,
      blocName:      uc.card.serie.bloc.name,
      version,
      quantity:      uc.quantity,
    };
  });

  const extraValue = rows.reduce((sum, r) => {
    const extras = r.quantity - 1;
    return sum + (r.cardPrice ?? 0) * extras;
  }, 0);
  const extraCopies = rows.reduce((sum, r) => sum + (r.quantity - 1), 0);

  const blocs: BlocGroup[] = rows.length === 0
    ? []
    : [{
        blocSlug: bloc.slug,
        blocName: bloc.name,
        series: [{
          serieSlug: serieStatic.slug,
          serieName: serieStatic.name,
          cards: rows,
        }],
      }];

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-5 text-sm text-[var(--text-secondary)]">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/portfolio" className="hover:text-[var(--text-primary)]">
              Classeur
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/portfolio/doubles" className="hover:text-[var(--text-primary)]">
              Doublons
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
            {bloc.name} · {serieStatic.abbreviation ?? ""} · Doublons
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Aucun doublon dans cette extension</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Toutes vos cartes de cette série sont en un seul exemplaire.
          </p>
        </div>
      ) : (
        <DoublesGrid
          blocs={blocs}
          totalDoubles={rows.length}
          totalSeries={1}
          extraValue={extraValue}
          hideSeriesCount
        />
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {extraCopies}&nbsp;copie{extraCopies > 1 ? "s" : ""} en surplus au total.
      </p>
    </>
  );
}
