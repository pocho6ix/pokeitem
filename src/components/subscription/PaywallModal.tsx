'use client'
import { useRouter } from 'next/navigation'
import type { PaywallReason } from '@/hooks/usePaywall'

const CONTENT: Record<PaywallReason, {
  icon: string
  title: string
  description: string
  cta: string
}> = {
  CARD_LIMIT_REACHED: {
    icon: '🃏',
    title: 'Limite de cartes atteinte',
    description: 'Tu as atteint la limite de 500 cartes en version gratuite.',
    cta: 'Débloquer la collection illimitée',
  },
  SEALED_LIMIT_REACHED: {
    icon: '📦',
    title: 'Limite de produits scellés atteinte',
    description: 'Tu as atteint la limite de 5 produits scellés en version gratuite.',
    cta: 'Débloquer les produits illimités',
  },
  SCAN_LIMIT_REACHED: {
    icon: '📷',
    title: 'Limite de scans atteinte',
    description: 'Tu as utilisé tes 10 scans gratuits ce mois-ci.',
    cta: 'Débloquer le scanner illimité',
  },
  PRO_REQUIRED: {
    icon: '⭐',
    title: 'Fonctionnalité Pro',
    description: 'Cette fonctionnalité est réservée aux abonnés Pro.',
    cta: 'Passer à Pro',
  },
}

const PRO_BENEFITS = [
  'Collection de cartes illimitée',
  'Items scellés illimités',
  'Scans illimités',
  'Valeur totale & statistiques avancées',
  "Matchmaking d'échanges entre dresseurs",
]

interface PaywallModalProps {
  isOpen: boolean
  reason: PaywallReason
  current?: number
  limit?: number
  onClose: () => void
}

export function PaywallModal({ isOpen, reason, current, limit, onClose }: PaywallModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const content = CONTENT[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl border border-[var(--border-default)] shadow-2xl p-6 pb-8 sm:pb-6">
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border-default)] sm:hidden" />

        {/* Icon + title */}
        <div className="mt-2 text-center mb-5">
          <div className="text-4xl mb-3">{content.icon}</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{content.title}</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {content.description}
            {current !== undefined && limit !== undefined && (
              <span className="font-semibold text-[var(--text-primary)]"> ({current}/{limit})</span>
            )}
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 mb-6">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-[#E7BA76]">
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1.5 5 3.5 7.5 8.5 2.5"/>
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>

        {/* Price hint */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mb-4">
          À partir de <span className="font-semibold text-[var(--text-secondary)]">3,33€/mois</span> facturé 39,99€/an
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { onClose(); router.push('/pricing') }}
            className="pro-cta-gold w-full rounded-full py-3.5 text-sm font-bold uppercase tracking-wide transition-all active:scale-[0.97]"
          >
            <span className="relative z-10" style={{ color: '#1A1A1A' }}>{content.cta} →</span>
            <style jsx>{`
              .pro-cta-gold {
                background: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
                box-shadow: 0 2px 12px rgba(191, 149, 63, 0.3);
                position: relative;
                overflow: hidden;
              }
              .pro-cta-gold::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 60%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: paywall-shimmer 4s ease-in-out infinite;
              }
              @keyframes paywall-shimmer {
                0%, 75% { left: -100%; }
                100% { left: 200%; }
              }
            `}</style>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
