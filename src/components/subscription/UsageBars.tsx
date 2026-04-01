'use client'
import { useSubscription } from '@/hooks/useSubscription'
import { useRouter } from 'next/navigation'

interface BarProps {
  label: string
  current: number
  limit: number
}

function UsageBar({ label, current, limit }: BarProps) {
  const pct = Math.min(100, Math.round((current / limit) * 100))
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-[#E7BA76]'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <span className={`text-xs font-semibold ${pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-orange-400' : 'text-[var(--text-tertiary)]'}`}>
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--bg-tertiary)]">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function UsageBars() {
  const { isPro, isLoading, usage } = useSubscription()
  const router = useRouter()

  if (isLoading || isPro) return null

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Utilisation du compte gratuit</h3>
        <button
          onClick={() => router.push('/pricing')}
          className="text-xs font-semibold text-[#E7BA76] hover:underline"
        >
          Passer à Pro →
        </button>
      </div>
      <div className="space-y-4">
        {usage.cards.limit !== null && (
          <UsageBar
            label="Cartes"
            current={usage.cards.current}
            limit={usage.cards.limit}
          />
        )}
        {usage.sealedItems.limit !== null && (
          <UsageBar
            label="Items scellés"
            current={usage.sealedItems.current}
            limit={usage.sealedItems.limit}
          />
        )}
        {usage.scans.limit !== null && (
          <UsageBar
            label="Scans ce mois"
            current={usage.scans.current}
            limit={usage.scans.limit}
          />
        )}
      </div>
    </section>
  )
}
