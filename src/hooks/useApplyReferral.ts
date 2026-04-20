'use client'
import { useEffect } from 'react'
import { useSession } from "@/lib/auth-context"
import Cookies from 'js-cookie'
import { fetchApi } from "@/lib/api";

export function useApplyReferral() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    const referralCode = Cookies.get('referral_code')
    if (!referralCode) return

    fetchApi('/api/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode })
    }).then(() => {
      Cookies.remove('referral_code')
    }).catch(() => {})
  }, [status])
}
