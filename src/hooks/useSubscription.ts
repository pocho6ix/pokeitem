'use client'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useSubscription() {
  const { data: session } = useSession()
  const { data, mutate } = useSWR(
    session ? '/api/subscription/status' : null,
    fetcher
  )

  const usage = data?.usage ?? {
    cards: { current: 0, limit: 100 },
    sealedItems: { current: 0, limit: 5 },
    scans: { current: 0, limit: 10 },
  }

  return {
    isPro: data?.isPro ?? false,
    plan: (data?.plan ?? 'FREE') as 'FREE' | 'PRO',
    isLoading: !data && !!session,
    usage,
    refresh: mutate,
    canAddCard: data?.isPro || usage.cards.current < 100,
    canAddSealed: data?.isPro || usage.sealedItems.current < 5,
    canScan: data?.isPro || usage.scans.current < 10,
    remainingScans: data?.isPro ? null : Math.max(0, 10 - usage.scans.current),
  }
}
