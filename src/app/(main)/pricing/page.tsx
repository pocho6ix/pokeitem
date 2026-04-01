'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const FREE_FEATURES = [
  '100 cartes dans ta collection',
  '5 items scellés dans le classeur',
  '10 scans par mois',
  'Accès au catalogue complet',
  'Suivi des doublons',
  'Liste de souhaits',
]

const PRO_FEATURES = [
  'Collection de cartes illimitée',
  'Items scellés illimités',
  'Scans illimités',
  'Valeur totale de la collection',
  'Graphique d\'évolution du classeur',
  'Statistiques avancées & P&L',
  'Toutes les fonctionnalités Free',
]

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const handleSubscribe = async () => {
    const res = await fetch('/api/subscription/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Choisissez votre plan</h1>
          <p className="text-[var(--text-secondary)] text-base max-w-md mx-auto">
            Commencez gratuitement. Passez à Pro quand vous êtes prêt.
          </p>
        </div>

        {/* Success / Canceled banners */}
        {success && (
          <div className="mb-8 rounded-2xl bg-green-500/10 border border-green-500/30 px-5 py-4 text-center">
            <p className="text-green-400 font-semibold">Bienvenue dans PokeItem Pro ! Votre abonnement est actif.</p>
          </div>
        )}
        {canceled && (
          <div className="mb-8 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 px-5 py-4 text-center">
            <p className="text-yellow-400 font-semibold">Paiement annulé. Vous pouvez réessayer à tout moment.</p>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* FREE */}
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] p-7 flex flex-col">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] mb-3">
                Gratuit
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--text-primary)]">0€</span>
                <span className="text-[var(--text-secondary)] text-sm">/ mois</span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm mt-2">Pour débuter ta collection Pokémon.</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-primary)]">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-tertiary)]">
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1.5 5 3.5 7.5 8.5 2.5"/>
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push('/collection')}
              className="w-full rounded-2xl border border-[var(--border-default)] py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Commencer gratuitement
            </button>
          </div>

          {/* PRO */}
          <div className="rounded-3xl bg-[var(--bg-card)] border-2 border-[#E7BA76] p-7 flex flex-col relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(231,186,118,0.08) 0%, transparent 60%)' }} />

            <div className="mb-6 relative">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#E7BA76]/20 text-[#E7BA76] mb-3">
                Pro
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--text-primary)]">4,99€</span>
                <span className="text-[var(--text-secondary)] text-sm">/ mois</span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm mt-2">Pour les vrais collectionneurs.</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 relative">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-primary)]">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-[#E7BA76]">
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1.5 5 3.5 7.5 8.5 2.5"/>
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="relative">
              <button
                onClick={handleSubscribe}
                className="w-full rounded-2xl bg-[#E7BA76] py-3.5 text-sm font-bold text-black hover:bg-[#d4a660] transition-colors"
              >
                S&apos;abonner →
              </button>
            </div>
          </div>
        </div>

        {/* Stripe note */}
        <p className="mt-8 text-center text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5v1.5H4a2 2 0 00-2 2v5a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-.5V4.5A3.5 3.5 0 008 1zm2.5 5V4.5a2.5 2.5 0 00-5 0V6h5zM8 9.5a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          Paiement sécurisé par Stripe. Annulable à tout moment.
        </p>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
