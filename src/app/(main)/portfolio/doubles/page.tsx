import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardVersion, CARD_VERSION_LABELS } from "@/data/card-versions";

export const metadata: Metadata = {
  title: "Doubles — Mon Classeur | PokeItem",
  description: "Consultez vos cartes en doublon (quantité > 1) dans votre collection.",
};

export const revalidate = 0;

// ─── Version badge styles ─────────────────────────────────────────────────────

const VERSION_BADGE: Record<CardVersion, { label: string; cls: string }> = {
  [CardVersion.NORMAL]:             { label: "N",  cls: "bg-blue-600" },
  [CardVersion.REVERSE]:            { label: "R",  cls: "bg-violet-600" },
  [CardVersion.REVERSE_POKEBALL]:   { label: "RP", cls: "bg-purple-600" },
  [CardVersion.REVERSE_MASTERBALL]: { label: "RM", cls: "bg-amber-500" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoubleRow {
  id: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  cardImageUrl: string | null;
  cardPrice: number | null;
  serieSlug: string;
  serieName: string;
  blocSlug: string;
  version: CardVersion;
  quantity: number;
}

interface SerieGroup {
  serieSlug: string;
  serieName: string;
  blocSlug: string;
  cards: DoubleRow[];
}

export default async function PortfolioDoublesPage() {
  const session = await getServerSession(authOptions);
  const userId  = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) redirect("/connexion");

  // Fetch all UserCard rows with quantity > 1
  const doubles = await prisma.userCard.findMany({
    where: {
      userId,
      quantity: { gt: 1 },
    },
    select: {
      id:       true,
      cardId:   true,
      quantity: true,
      version:  true,
      card: {
        select: {
          name:     true,
          number:   true,
          imageUrl: true,
          price:    true,
          serie: {
            select: {
              slug: true,
              name: true,
              bloc: { select: { slug: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { card: { serie: { name: "asc" } } },
      { card: { number: "asc" } },
    ],
  });

  // Shape into DoubleRow[]
  const rows: DoubleRow[] = doubles.map((uc) => ({
    id:           uc.id,
    cardId:       uc.cardId,
    cardName:     uc.card.name,
    cardNumber:   uc.card.number,
    cardImageUrl: uc.card.imageUrl,
    cardPrice:    uc.card.price ?? null,
    serieSlug:    uc.card.serie.slug,
    serieName:    uc.card.serie.name,
    blocSlug:     uc.card.serie.bloc.slug,
    version:      (uc.version ?? CardVersion.NORMAL) as CardVersion,
    quantity:     uc.quantity,
  }));

  // Group by serie
  const groupMap = new Map<string, SerieGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.serieSlug)) {
      groupMap.set(row.serieSlug, {
        serieSlug: row.serieSlug,
        serieName: row.serieName,
        blocSlug:  row.blocSlug,
        cards:     [],
      });
    }
    groupMap.get(row.serieSlug)!.cards.push(row);
  }
  const groups = Array.from(groupMap.values());

  // ── Render ──────────────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]">
            <rect width="8" height="10" x="2"  y="7" rx="1"/>
            <rect width="8" height="10" x="14" y="7" rx="1"/>
          </svg>
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Aucun doublon</p>
        <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
          Vos doublons apparaissent ici quand vous possédez plus d&apos;un exemplaire d&apos;une même carte.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total doublons</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{rows.length}</p>
        </div>
        <div className="rounded-xl bg-[var(--bg-secondary)] px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Extensions</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{groups.length}</p>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.serieSlug}>
            {/* Serie header */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">{group.serieName}</h2>
              <Link
                href={`/collection/cartes/${group.blocSlug}/${group.serieSlug}`}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Voir l&apos;extension →
              </Link>
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {group.cards.map((card) => {
                const badge = VERSION_BADGE[card.version];
                return (
                  <Link
                    key={card.id}
                    href={`/collection/cartes/${card.blocSlug}/${card.serieSlug}`}
                    className="group"
                    title={`${card.cardNumber} · ${card.cardName} (×${card.quantity})`}
                  >
                    {/* Card image */}
                    <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                      {card.cardImageUrl ? (
                        <Image
                          src={card.cardImageUrl}
                          alt={`${card.cardName} — ${card.cardNumber}`}
                          fill
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12.5vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                          <span className="text-xs font-bold text-[var(--text-secondary)]">{card.cardNumber}</span>
                          <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{card.cardName}</span>
                        </div>
                      )}

                      {/* Number badge — bottom left */}
                      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                        {card.cardNumber}
                      </div>

                      {/* Version + quantity — bottom right */}
                      <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
                        <span className={`rounded px-1 py-px text-[8px] font-bold leading-none text-white shadow-sm ${badge.cls}`}>
                          {badge.label}×{card.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Name + price */}
                    <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.cardName}</p>
                    <p className="truncate text-center text-[9px] text-[var(--text-tertiary)]">
                      {card.cardPrice != null ? `${card.cardPrice.toFixed(2)}\u00a0€` : "–\u00a0€"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
