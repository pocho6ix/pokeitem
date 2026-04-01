'use client'
import { useRouter } from 'next/navigation'

const FEATURE_LABELS: Record<string, { title: string; description: string; icon: string }> = {
  ADD_CARD: {
    icon: '🃏',
    title: 'Limite de cartes atteinte',
    description: 'La version gratuite est limitée à 100 cartes. Passe à Pro pour une collection illimitée.',
  },
  ADD_SEALED_ITEM: {
    icon: '📦',
    title: 'Limite d\'items scellés atteinte',
    description: 'La version gratuite est limitée à 5 items scellés. Passe à Pro pour en ajouter autant que tu veux.',
  },
  SCAN_CARD: {
    icon: '📷',
    title: 'Limite de scans atteinte',
    description: 'La version gratuite est limitée à 10 scans par mois. Passe à Pro pour des scans illimités.',
  },
  VIEW_COLLECTION_VALUE: {
    icon: '📈',
    title: 'Fonctionnalité Pro',
    description: 'La valeur de ta collection et les statistiques avancées sont réservées aux membres Pro.',
  },
  PORTFOLIO_CHART: {
    icon: '📊',
    title: 'Graphique Pro',
    description: 'Le graphique d\'évolution de ton classeur est réservé aux membres Pro.',
  },
}

interface PaywallModalProps {
  feature: string
  onClose?: () => void
}

export function PaywallModal({ feature, onClose }: PaywallModalProps) {
  const router = useRouter()
  const info = FEATURE_LABELS[feature] ?? FEATURE_LABELS['VIEW_COLLECTION_VALUE']

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #ffd6e0 0%, #c8b6e2 25%, #b8d8f8 50%, #b8f0d0 75%, #f8f0b8 100%)' }}
        >
          <div className="text-4xl mb-3">{info.icon}</div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
            <span className="text-sm font-bold text-black/70">PokeItem Pro</span>
          </div>
          <h2 className="text-lg font-bold text-black/80">{info.title}</h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-[var(--text-secondary)] text-center mb-5">{info.description}</p>

          {/* Features list */}
          <ul className="space-y-2 mb-6">
            {[
              'Collection de cartes illimitée',
              'Items scellés illimités',
              'Scans illimités',
              'Valeur & graphiques du classeur',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-[#E7BA76]">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 6 4.5 9.5 10.5 2.5"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="mb-4 text-center">
            <span className="text-2xl font-bold text-[var(--text-primary)]">3,99€</span>
            <span className="text-sm text-[var(--text-secondary)]"> / mois</span>
          </div>

          <button
            onClick={() => router.push('/pricing')}
            className="w-full rounded-2xl bg-[#E7BA76] py-3.5 text-sm font-bold text-black hover:bg-[#d4a660] transition-colors mb-2"
          >
            Passer à Pro →
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
