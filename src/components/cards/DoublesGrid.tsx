'use client'
import { useState, useTransition, useMemo, lazy, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CardVersion } from '@/data/card-versions'
import { CollectionValue } from '@/components/collection/CollectionValue'

const CardDetailModal = lazy(() =>
  import('./CardDetailModal').then((m) => ({ default: m.CardDetailModal }))
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoubleRow {
  id: string
  cardId: string
  cardName: string
  cardNumber: string
  cardImageUrl: string | null
  cardPrice: number | null
  isFrenchPrice: boolean
  cardIsSpecial: boolean
  serieSlug: string
  serieName: string
  blocSlug: string
  blocName: string
  version: CardVersion
  quantity: number
}

export interface SerieGroup {
  serieSlug: string
  serieName: string
  cards: DoubleRow[]
}

export interface BlocGroup {
  blocSlug: string
  blocName: string
  series: SerieGroup[]
}

// ─── Version badge ────────────────────────────────────────────────────────────

const VERSION_BADGE_IMG: Record<CardVersion, string> = {
  [CardVersion.NORMAL]:             '/badge_normale.png',
  [CardVersion.FIRST_EDITION]:      '/images/badges/first-edition.png',
  [CardVersion.REVERSE]:            '/badge_reverse.png',
  [CardVersion.REVERSE_POKEBALL]:   '/badge_pokeball.png',
  [CardVersion.REVERSE_MASTERBALL]: '/badge_masterball.png',
}

function VersionCountBadge({ version, quantity }: { version: CardVersion; quantity: number }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-black/60 pl-0.5 pr-1 py-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VERSION_BADGE_IMG[version]}
        alt=""
        className="h-4 w-4 rounded-full object-cover shrink-0"
      />
      <span className="text-[8px] font-bold leading-none text-white">×{quantity}</span>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoublesGridProps {
  blocs: BlocGroup[]
  totalDoubles: number
  totalSeries: number
  /** Total monetary value of the "extra copies" (sum of (quantity-1) × price) */
  extraValue?: number
  /** Hide the "Extensions" KPI — useful on a single-serie detail page */
  hideSeriesCount?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DoublesGrid({
  blocs: initialBlocs,
  totalDoubles: initialTotal,
  totalSeries,
  extraValue,
  hideSeriesCount = false,
}: DoublesGridProps) {
  const router = useRouter()
  const [blocs, setBlocs] = useState(initialBlocs)
  const [totalDoubles, setTotalDoubles] = useState(initialTotal)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const allRows = useMemo(
    () => blocs.flatMap((b) => b.series.flatMap((s) => s.cards)),
    [blocs]
  )

  const handleCardClick = (row: DoubleRow) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(row.id)) next.delete(row.id)
        else next.add(row.id)
        return next
      })
    } else {
      setDetailCardId(row.cardId)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) return
    const toDelete = allRows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({ cardId: r.cardId, version: r.version as string }))

    // Optimistic update
    const deletedIds = new Set(selectedIds)
    setBlocs((prev) =>
      prev
        .map((bloc) => ({
          ...bloc,
          series: bloc.series
            .map((serie) => ({
              ...serie,
              cards: serie.cards.filter((c) => !deletedIds.has(c.id)),
            }))
            .filter((s) => s.cards.length > 0),
        }))
        .filter((b) => b.series.length > 0)
    )
    setTotalDoubles((prev) => prev - deletedIds.size)
    setSelectedIds(new Set())
    setSelectMode(false)

    startTransition(async () => {
      await fetch('/api/cards/collection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: toDelete }),
      })
      router.refresh()
    })
  }

  if (blocs.length === 0) {
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
    )
  }

  return (
    <div className="relative pb-24">
      {/* Summary + select toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total doublons</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalDoubles}</p>
        </div>
        {!hideSeriesCount && (
          <div className="rounded-xl bg-[var(--bg-secondary)] px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Extensions</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalSeries}</p>
          </div>
        )}
        {typeof extraValue === 'number' && extraValue > 0 && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
              Valeur des surplus
            </p>
            <CollectionValue
              value={extraValue}
              className="font-data text-2xl font-bold text-emerald-600 dark:text-emerald-300"
            />
          </div>
        )}
        <button
          onClick={toggleSelectMode}
          className={`ml-auto rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            selectMode
              ? 'border-red-500/50 bg-red-500/10 text-red-400'
              : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {selectMode ? 'Annuler' : 'Sélectionner'}
        </button>
      </div>

      {/* Blocs → Series → Cards */}
      <div className="space-y-10">
        {blocs.map((bloc) => (
          <div key={bloc.blocSlug}>
            <h2 className="mb-4 border-b border-[var(--border-default)] pb-2 text-base font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {bloc.blocName}
            </h2>
            <div className="space-y-8">
              {bloc.series.map((serie) => (
                <section key={serie.serieSlug}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-primary)]">{serie.serieName}</h3>
                    <Link
                      href={`/collection/cartes/${serie.cards[0].blocSlug}/${serie.serieSlug}`}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Voir l&apos;extension →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {serie.cards.map((card) => {
                      const isSelected = selectedIds.has(card.id)
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          title={`${card.cardNumber} · ${card.cardName} (×${card.quantity})`}
                          className="group text-left"
                        >
                          <div className={`relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md ${
                            isSelected ? 'ring-2 ring-red-500' : ''
                          }`}>
                            {isSelected && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-500/30">
                                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            )}
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
                            <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                              {card.cardNumber}
                            </div>
                            <div className="absolute bottom-1 right-1">
                              {card.cardIsSpecial ? (
                                <span className="rounded px-1 py-px text-[8px] font-bold leading-none bg-[#E7BA76] text-black shadow-sm">
                                  ×{card.quantity}
                                </span>
                              ) : (
                                <VersionCountBadge version={card.version} quantity={card.quantity} />
                              )}
                            </div>
                          </div>
                          <p className="mt-1 truncate text-center text-[10px] text-[var(--text-secondary)]">{card.cardName}</p>
                          <p className="truncate text-center text-[9px] text-[var(--text-tertiary)]">
                            {card.cardPrice != null
                              ? <span className="inline-flex items-center gap-0.5">
                                  {card.isFrenchPrice ? '🇫🇷 ' : card.version !== CardVersion.NORMAL
                                    ? <img src="/reverse-badge.png" alt="R" className="w-3 h-3 object-contain" />
                                    : null}
                                  {card.cardPrice.toFixed(2)}&nbsp;€
                                </span>
                              : '–\u00a0€'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating action bar (selection mode) */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 shadow-xl">
          <span className="text-sm text-[var(--text-secondary)]">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Supprimer
          </button>
        </div>
      )}

      {/* Card detail modal */}
      {detailCardId && (
        <Suspense fallback={null}>
          <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
        </Suspense>
      )}
    </div>
  )
}
