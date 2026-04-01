'use client'
import { useSubscription } from '@/hooks/useSubscription'
import { ProButton } from '@/components/subscription/ProButton'

interface CollectionValueProps {
  value: number
  className?: string
}

export function CollectionValue({ value, className }: CollectionValueProps) {
  const { isPro } = useSubscription()

  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

  if (!isPro) {
    return <ProButton size="sm" />
  }

  return <span className={className}>{formatted}</span>
}
