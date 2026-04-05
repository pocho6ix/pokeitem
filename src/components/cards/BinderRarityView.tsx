'use client'
import { useState, useEffect } from 'react'
import { CardRarity, CARD_RARITY_LABELS, CARD_RARITY_IMAGE } from '@/types/card'
import type { RaritySection, RarityCard } from '@/app/api/binder/cards-by-rarity/route'

// Display order: rarest first, PROMO at end
const DISPLAY_ORDER: CardRarity[] = [
  CardRarity.MEGA_ATTAQUE_RARE,
  CardRarity.MEGA_HYPER_RARE,
  CardRarity.HYPER_RARE,
  CardRarity.SPECIAL_ILLUSTRATION_RARE,
  CardRarity.ILLUSTRATION_RARE,
  CardRarity.ACE_SPEC_RARE,
  CardRarity.DOUBLE_RARE,
  CardRarity.RARE,
  CardRarity.UNCOMMON,
  CardRarity.COMMON,
  CardRarity.PROMO,
]

const DARK_ICON_RARITIES = new Set([CardRarity.COMMON, CardRarity.UNCOMMON, CardRarity.RARE])

// ─── Single card cell ────────────────────────────────────────────────────────

function CardCell({ card }: { card: RarityCard }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-full overflow-hidden rounded-lg bg-[#1A2332]"
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
      </div>
      <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--text-secondary)]">
        {card.name}
      </span>
      {card.price > 0 && (
        <span className="text-xs font-semibold text-emerald-400">
          {card.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </span>
      )}
    </div>
  )
}

// ─── Rarity section ──────────────────────────────────────────────────────────

function RaritySectionBlock({ section }: { section: RaritySection }) {
  const [expanded, setExpanded] = useState(false)
  const displayCards = expanded ? section.cards : section.cards.slice(0, 16)
  const label = CARD_RARITY_LABELS[section.rarityKey]
  const imageSrc = CARD_RARITY_IMAGE[section.rarityKey]
  const isDark = DARK_ICON_RARITIES.has(section.rarityKey)

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
          <CardCell key={card.id} card={card} />
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
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function BinderRarityView() {
  const [sections, setSections] = useState<RaritySection[] | null>(null)
  const [loading, setLoading] = useState(true)

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
        <RaritySectionBlock key={section.rarityKey} section={section} />
      ))}
    </div>
  )
}
