'use client'
import { useSubscription } from '@/hooks/useSubscription'
import { ProButton } from '@/components/subscription/ProButton'

type ProGateFeature = 'VIEW_COLLECTION_VALUE' | 'ADD_CARD' | 'ADD_SEALED_ITEM' | 'SCAN_CARD' | 'PORTFOLIO_CHART'

interface ProGateProps {
  feature: ProGateFeature
  children: React.ReactNode
  /** Optional label shown above the Pro button */
  label?: string
}

export function ProGate({ feature: _feature, children, label }: ProGateProps) {
  const { isPro } = useSubscription()

  if (isPro) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-center">
      {label && (
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      )}
      <ProButton size="md" />
    </div>
  )
}
