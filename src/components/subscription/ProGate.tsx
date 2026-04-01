'use client'
import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { PaywallModal } from './PaywallModal'

interface ProGateProps {
  feature: 'VIEW_COLLECTION_VALUE' | 'ADD_CARD' | 'ADD_SEALED_ITEM' | 'SCAN_CARD' | 'PORTFOLIO_CHART'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProGate({ feature, children, fallback }: ProGateProps) {
  const { isPro } = useSubscription()
  const [showModal, setShowModal] = useState(false)

  if (isPro) return <>{children}</>

  if (fallback) {
    return (
      <>
        <div onClick={() => setShowModal(true)} className="cursor-pointer">{fallback}</div>
        {showModal && <PaywallModal feature={feature} onClose={() => setShowModal(false)} />}
      </>
    )
  }

  return <PaywallModal feature={feature} onClose={() => setShowModal(false)} />
}
