'use client'
import { useState, useEffect, lazy, Suspense, memo } from 'react'
import { CardRarity, CARD_RARITY_LABELS, CARD_RARITY_IMAGE } from '@/types/card'
import type { RaritySection, RarityCard } from '@/app/api/binder/cards-by-rarity/route'

const DARK_ICON_OVERLAY = new Set([CardRarity.COMMON, CardRarity.UNCOMMON, CardRarity.RARE])

const CardDetailModal = lazy(() =>
  import('./CardDetailModal').then((m) => ({ default: m.CardDetailModal }))
)

// Display order: rarest first, PROMO at end
const DISPLAY_ORDER: CardRarity[] = [
  CardRarity.MEGA_ATTAQUE_RARE,
  CardRarity.MEGA_HYPER_RARE,
  CardRarity.HYPER_RARE,
  CardRarity.NOIR_BLANC_RARE,
  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  CardRarity.ILLUSTRATION_RARE,
  CardRarity.ULTRA_RARE,
  CardRarity.ACE_SPEC_RARE,
  CardRarity.DOUBLE_RARE,
  CardRarity.RARE,
  CardRarity.UNCOMMON,
  CardRarity.COMMON,
  CardRarity.PROMO,
]


// ─── Single card cell ────────────────────────────────────────────────────────
// memo: card data never changes during a session — avoids re-renders when parent
// state changes (e.g. modal open/close, section expand)

const CardCell = memo(function CardCell({ card, onCardClick }: { card: RarityCard; onCardClick: (id: string) => void }) {
  const isDark = DARK_ICON_OVERLAY.has(card.rarity)
  // API already computes the effective price for the owned version (normal FR,
  // normal trend, or reverse). Trust it and flag the source for display.
  const displayPrice = card.price
  const isFr = card.isFrenchPrice

  return (
    <button className="flex flex-col items-center gap-0.5 text-left w-full" onClick={() => onCardClick(card.id)}>
      {/* Card image with overlays */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-[#1A2332] transition-transform active:scale-95"
        style={{ aspectRatio: '63/88' }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-[var(--text-secondary)]">
            {card.name}
          </div>
        )}

        {/* Number + rarity badge — bottom left */}
        <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
          <span>{card.number}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CARD_RARITY_IMAGE[card.rarity]}
            alt=""
            className="h-3 w-auto object-contain opacity-90"
            style={isDark
              ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))' }
              : undefined}
          />
        </div>
      </div>

      {/* Name */}
      <span className="w-full truncate text-center text-[10px] text-[var(--text-secondary)]">
        {card.name}
      </span>

      {/* Price */}
      <span className="truncate text-center text-[9px] text-[var(--text-tertiary)] flex items-center justify-center gap-0.5">
        {displayPrice > 0
          ? <>{isFr ? '🇫🇷 ' : card.isReverse ? <img src="/reverse-badge.png" alt="R" className="w-3 h-3 object-contain" /> : null}{displayPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</>
          : '—'}
      </span>
    </button>
  )
})

// ─── Rarity section ──────────────────────────────────────────────────────────
// memo: section object is stable — avoids re-rendering all sections when the
// modal opens/closes or another section expands

const RaritySectionBlock = memo(function RaritySectionBlock({ section, onCardClick }: { section: RaritySection; onCardClick: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const displayCards = expanded ? section.cards : section.cards.slice(0, 16)
  const label = CARD_RARITY_LABELS[section.rarityKey]
  const imageSrc = CARD_RARITY_IMAGE[section.rarityKey]
  const isDark = DARK_ICON_OVERLAY.has(section.rarityKey)

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="mb-4 mt-6 flex flex-wrap items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={label}
          style={{
            height: 22,
            width: 'auto',
            objectFit: 'contain',
            filter: isDark
              ? 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))'
              : undefined,
          }}
        />
        <span className="text-lg font-bold text-[var(--text-primary)]">{label}</span>
        <span className="text-sm text-[var(--text-secondary)]">
          {section.cardCount} carte{section.cardCount > 1 ? 's' : ''} ·{' '}
          <span className="font-semibold text-emerald-400">
            {section.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </span>
      </div>

      {/* Card grid — 3 on mobile, 8 on desktop */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 sm:gap-3">
        {displayCards.map((card) => (
          <CardCell key={card.id} card={card} onCardClick={onCardClick} />
        ))}
      </div>

      {/* Expand button */}
      {section.cards.length > 16 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-xl border border-[#1E2D3D] py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[#2A3F55] hover:text-[var(--text-primary)]"
        >
          Voir tout ({section.cards.length})
        </button>
      )}
    </div>
  )
})

// ─── Main view ───────────────────────────────────────────────────────────────

export function BinderRarityView() {
  const [sections, setSections] = useState<RaritySection[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/binder/cards-by-rarity')
      .then((r) => r.json())
      .then((data) => { setSections(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mt-6 space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="mb-4 h-6 w-48 rounded bg-white/5" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 sm:gap-3">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="rounded-lg bg-white/5" style={{ aspectRatio: '63/88' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!sections?.length) {
    return (
      <p className="py-10 text-center text-sm text-[var(--text-secondary)]">
        Aucune carte dans votre collection.
      </p>
    )
  }

  const sorted = [...sections].sort((a, b) => {
    const ai = DISPLAY_ORDER.indexOf(a.rarityKey)
    const bi = DISPLAY_ORDER.indexOf(b.rarityKey)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return (
    <div>
      {sorted.map((section) => (
        <RaritySectionBlock key={section.rarityKey} section={section} onCardClick={setDetailCardId} />
      ))}
      {detailCardId && (
        <Suspense fallback={null}>
          <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
        </Suspense>
      )}
    </div>
  )
}
