'use client'
import { useSubscription } from '@/hooks/useSubscription'
import { usePaywall } from '@/hooks/usePaywall'
import { PaywallModal } from '@/components/subscription/PaywallModal'

interface CollectionValueProps {
  value: number
  className?: string
}

export function CollectionValue({ value, className }: CollectionValueProps) {
  const { isPro } = useSubscription()
  const { paywallState, showPaywall, closePaywall } = usePaywall()

  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

  if (isPro) {
    return <span className={className}>{formatted}</span>
  }

  return (
    <>
      <button
        onClick={() => showPaywall('PRO_REQUIRED')}
        className={`relative group ${className ?? ''}`}
        title="Fonctionnalité Pro"
      >
        <span className="blur-sm select-none">{formatted}</span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          🔒
        </span>
      </button>
      <PaywallModal
        isOpen={paywallState.isOpen}
        reason={paywallState.reason}
        onClose={closePaywall}
      />
    </>
  )
}
