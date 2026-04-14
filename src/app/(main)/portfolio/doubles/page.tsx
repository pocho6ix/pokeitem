import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardVersion } from "@/data/card-versions";
import { getPriceForVersion } from "@/lib/display-price";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { CollectionValue } from "@/components/collection/CollectionValue";
import {
  BlocSerieDoublesList,
  type DoublesBloc,
  type DoublesSerieRow,
} from "@/components/cards/BlocSerieDoublesList";

export const metadata: Metadata = {
  title: "Doubles — Mon Classeur | PokeItem",
  description: "Consultez vos cartes en doublon (quantité > 1) dans votre collection.",
};

export const revalidate = 0;

export default async function PortfolioDoublesPage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) redirect("/connexion");

  // All rows where the user owns >1 copy. Each row represents a (card, version)
  // pair with its quantity → the "extras" are (quantity - 1) copies.
  const doubles = await prisma.userCard.findMany({
    where: { userId, quantity: { gt: 1 } },
    select: {
      quantity: true,
      version:  true,
      card: {
        select: {
          serieId:      true,
          price:        true,
          priceFr:      true,
          priceReverse: true,
          serie: {
            select: {
              slug: true,
              name: true,
              abbreviation: true,
              bloc: { select: { slug: true, name: true, abbreviation: true } },
            },
          },
        },
      },
    },
  });

  // ── Aggregate per serie ────────────────────────────────────────────────
  interface SerieAgg {
    bloc: { slug: string; name: string; abbreviation: string | null };
    serie: { slug: string; name: string; abbreviation: string | null };
    distinctDoubles: number;
    extraCopies:     number;
    extraValue:      number;
  }
  const bySerie = new Map<string, SerieAgg>();

  let globalExtraCopies = 0;
  let globalExtraValue  = 0;

  for (const uc of doubles) {
    const extras   = uc.quantity - 1;
    const unit     = getPriceForVersion(uc.card, uc.version as CardVersion);
    const extraVal = unit * extras;

    globalExtraCopies += extras;
    globalExtraValue  += extraVal;

    const key = uc.card.serie.slug;
    const agg = bySerie.get(key) ?? {
      bloc: {
        slug: uc.card.serie.bloc.slug,
        name: uc.card.serie.bloc.name,
        abbreviation: uc.card.serie.bloc.abbreviation ?? null,
      },
      serie: {
        slug: uc.card.serie.slug,
        name: uc.card.serie.name,
        abbreviation: uc.card.serie.abbreviation ?? null,
      },
      distinctDoubles: 0,
      extraCopies:     0,
      extraValue:      0,
    };
    agg.distinctDoubles += 1;
    agg.extraCopies     += extras;
    agg.extraValue      += extraVal;
    bySerie.set(key, agg);
  }

  // ── Lookups for sort + image ───────────────────────────────────────────
  const imageUrlBySlug = new Map(SERIES.map((s) => [s.slug, s.imageUrl]));
  const releaseBySlug  = new Map(
    SERIES.map((s) => [s.slug, s.releaseDate ? new Date(s.releaseDate).getTime() : 0])
  );
  const orderBySlug = new Map(SERIES.map((s) => [s.slug, s.order ?? 999]));

  // ── Build bloc groups in the same order BLOCS defines ──────────────────
  const blocsOut: DoublesBloc[] = [];
  for (const bloc of BLOCS) {
    const seriesForBloc: DoublesSerieRow[] = [];
    for (const agg of bySerie.values()) {
      if (agg.bloc.slug !== bloc.slug) continue;
      seriesForBloc.push({
        serieSlug:         agg.serie.slug,
        serieName:         agg.serie.name,
        serieAbbreviation: agg.serie.abbreviation,
        serieImageUrl:     imageUrlBySlug.get(agg.serie.slug) ?? null,
        distinctDoubles:   agg.distinctDoubles,
        extraCopies:       agg.extraCopies,
        extraValue:        Math.round(agg.extraValue * 100) / 100,
      });
    }
    if (seriesForBloc.length === 0) continue;

    // Most-recent first, like mes cartes
    seriesForBloc.sort((a, b) => {
      const da = releaseBySlug.get(a.serieSlug) ?? 0;
      const db = releaseBySlug.get(b.serieSlug) ?? 0;
      if (db !== da) return db - da;
      return (orderBySlug.get(a.serieSlug) ?? 999) - (orderBySlug.get(b.serieSlug) ?? 999);
    });

    blocsOut.push({
      blocSlug:         bloc.slug,
      blocName:         bloc.name,
      blocAbbreviation: bloc.abbreviation ?? null,
      series:           seriesForBloc,
    });
  }

  const totalDistinct = doubles.length;
  const totalSeries   = bySerie.size;
  const roundedValue  = Math.round(globalExtraValue * 100) / 100;

  return (
    <>
      <Link href="/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Classeur
      </Link>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>

      {/* ── KPI summary ──────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
            Cartes en doublon
          </p>
          <p className="mt-0.5 font-data text-2xl font-bold text-blue-700 dark:text-blue-300">
            {totalDistinct}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Extensions concernées
          </p>
          <p className="mt-0.5 font-data text-2xl font-bold text-[var(--text-primary)]">
            {totalSeries}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Valeur des surplus
          </p>
          <CollectionValue
            value={roundedValue}
            className="mt-0.5 block font-data text-2xl font-bold text-emerald-700 dark:text-emerald-300"
          />
          <p className="mt-0.5 text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
            {globalExtraCopies}&nbsp;copie{globalExtraCopies > 1 ? "s" : ""} en surplus
          </p>
        </div>
      </div>

      <BlocSerieDoublesList blocs={blocsOut} />
    </>
  );
}
