'use client'
import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { PaywallModal } from './PaywallModal'
import type { PaywallReason } from '@/hooks/usePaywall'

type ProGateFeature = 'VIEW_COLLECTION_VALUE' | 'ADD_CARD' | 'ADD_SEALED_ITEM' | 'SCAN_CARD' | 'PORTFOLIO_CHART'

const FEATURE_TO_REASON: Record<ProGateFeature, PaywallReason> = {
  VIEW_COLLECTION_VALUE: 'PRO_REQUIRED',
  PORTFOLIO_CHART: 'PRO_REQUIRED',
  ADD_CARD: 'CARD_LIMIT_REACHED',
  ADD_SEALED_ITEM: 'SEALED_LIMIT_REACHED',
  SCAN_CARD: 'SCAN_LIMIT_REACHED',
}

interface ProGateProps {
  feature: ProGateFeature
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProGate({ feature, children, fallback }: ProGateProps) {
  const { isPro } = useSubscription()
  const [showModal, setShowModal] = useState(false)
  const reason = FEATURE_TO_REASON[feature]

  if (isPro) return <>{children}</>

  if (fallback) {
    return (
      <>
        <div onClick={() => setShowModal(true)} className="cursor-pointer">{fallback}</div>
        <PaywallModal
          isOpen={showModal}
          reason={reason}
          onClose={() => setShowModal(false)}
        />
      </>
    )
  }

  return (
    <PaywallModal
      isOpen={true}
      reason={reason}
      onClose={() => {}}
    />
  )
}
