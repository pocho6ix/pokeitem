'use client'
import { useState } from 'react'

export type PaywallReason =
  | 'CARD_LIMIT_REACHED'
  | 'SEALED_LIMIT_REACHED'
  | 'SCAN_LIMIT_REACHED'
  | 'PRO_REQUIRED'

export function usePaywall() {
  const [paywallState, setPaywallState] = useState<{
    isOpen: boolean
    reason: PaywallReason
    current?: number
    limit?: number
  }>({ isOpen: false, reason: 'PRO_REQUIRED' })

  const showPaywall = (
    reason: PaywallReason,
    current?: number,
    limit?: number
  ) => setPaywallState({ isOpen: true, reason, current, limit })

  const closePaywall = () =>
    setPaywallState(prev => ({ ...prev, isOpen: false }))

  return { paywallState, showPaywall, closePaywall }
}
