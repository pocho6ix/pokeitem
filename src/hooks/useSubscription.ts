'use client'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { FREE_LIMITS } from '@/lib/subscription'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useSubscription() {
  const { data: session } = useSession()
  const { data } = useSWR(session ? '/api/subscription/status' : null, fetcher)

  return {
    isPro: data?.plan === 'PRO',
    plan: (data?.plan ?? 'FREE') as 'FREE' | 'PRO',
    cardCount: data?.cardCount ?? 0,
    sealedCount: data?.sealedCount ?? 0,
    scanCount: data?.scanCount ?? 0,
    limits: {
      cards: FREE_LIMITS.CARDS,
      sealedItems: FREE_LIMITS.SEALED_ITEMS,
      scansPerMonth: FREE_LIMITS.SCANS_PER_MONTH,
    },
  }
}
