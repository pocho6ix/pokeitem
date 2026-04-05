'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { CARD_RARITY_IMAGE, CARD_RARITY_LABELS, CARD_RARITY_ORDER, CardRarity } from '@/types/card'

interface RarityData {
  rarityKey: string
  cardCount: number
  totalValue: number
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function BinderRarityFilter() {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const selected   = params.get('rarity')

  const [rarities, setRarities] = useState<RarityData[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/portfolio/rarities')
      .then(r => r.ok ? r.json() : [])
      .then((data: RarityData[]) => {
        const sorted = [...data].sort(
          (a, b) =>
            (CARD_RARITY_ORDER[a.rarityKey as CardRarity] ?? 99) -
            (CARD_RARITY_ORDER[b.rarityKey as CardRarity] ?? 99)
        )
        setRarities(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || rarities.length === 0) return null

  function select(key: string | null) {
    const next = new URLSearchParams(params.toString())
    if (key === null) next.delete('rarity')
    else next.set('rarity', key)
    const qs = next.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const active = rarities.find(r => r.rarityKey === selected)

  return (
    <div className="mb-5">
      {/* Chips row */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {/* "Tout" chip */}
        <button
          onClick={() => select(null)}
          className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all"
          style={{
            border:          selected === null ? '1px solid #D4A853' : '1px solid #1E2D3D',
            backgroundColor: selected === null ? 'rgba(212,168,83,0.1)' : '#111B27',
            color:           selected === null ? '#D4A853' : '#8899AA',
            whiteSpace:      'nowrap',
          }}
        >
          Tout
        </button>

        {rarities.map((r) => {
          const isActive  = selected === r.rarityKey
          const imgSrc    = CARD_RARITY_IMAGE[r.rarityKey as CardRarity]
          const label     = CARD_RARITY_LABELS[r.rarityKey as CardRarity] ?? r.rarityKey

          return (
            <button
              key={r.rarityKey}
              onClick={() => select(r.rarityKey)}
              title={label}
              className="shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                border:          isActive ? '1px solid #D4A853' : '1px solid #1E2D3D',
                backgroundColor: isActive ? 'rgba(212,168,83,0.1)' : '#111B27',
                color:           isActive ? '#FFFFFF' : '#8899AA',
                whiteSpace:      'nowrap',
              }}
            >
              {imgSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgSrc}
                  alt={label}
                  style={{
                    height: 14,
                    width: 'auto',
                    objectFit: 'contain',
                    opacity: isActive ? 1 : 0.55,
                    filter: (r.rarityKey === 'COMMON' || r.rarityKey === 'UNCOMMON' || r.rarityKey === 'RARE')
                      ? 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9))'
                      : undefined,
                  }}
                />
              )}
              <span>{r.cardCount}</span>
            </button>
          )
        })}
      </div>

      {/* Active rarity value summary */}
      {active && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-[#D4A853]">
            {CARD_RARITY_LABELS[active.rarityKey as CardRarity] ?? active.rarityKey}
          </span>
          {' · '}
          {active.cardCount} carte{active.cardCount > 1 ? 's' : ''}
          {' · '}
          <span className="text-emerald-400 font-semibold">{fmt(active.totalValue)}</span>
        </p>
      )}
    </div>
  )
}
