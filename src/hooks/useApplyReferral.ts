'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Cookies from 'js-cookie'

export function useApplyReferral() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    const referralCode = Cookies.get('referral_code')
    if (!referralCode) return

    fetch('/api/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode })
    }).then(() => {
      Cookies.remove('referral_code')
    }).catch(() => {})
  }, [status])
}
