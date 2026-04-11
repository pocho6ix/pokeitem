'use client'
import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface DailyStatus {
  claimedToday: boolean
  claimedAt: string | null
  nextClaimAt: string
  points: number
}

// ─── Countdown timer ──────────────────────────────────────────────────────────

function useCountdown(targetIso: string | undefined) {
  const getRemaining = useCallback(() => {
    if (!targetIso) return null
    const diff = new Date(targetIso).getTime() - Date.now()
    if (diff <= 0) return { h: 0, m: 0, s: 0 }
    const s = Math.floor(diff / 1000)
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
  }, [targetIso])

  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    if (!targetIso) return
    const id = setInterval(() => {
      const r = getRemaining()
      setRemaining(r)
      // Auto-refresh status when countdown hits zero
      if (r && r.h === 0 && r.m === 0 && r.s === 0) {
        mutate('/api/quests/daily-login/status')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [targetIso, getRemaining])

  return remaining
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DailyLoginQuest() {
  const { data, isLoading } = useSWR<DailyStatus>('/api/quests/daily-login/status', fetcher, {
    revalidateOnFocus: true,
  })
  const [claiming, setClaiming] = useState(false)
  const [justClaimed, setJustClaimed] = useState(false)

  const countdown = useCountdown(data?.claimedToday ? data?.nextClaimAt : undefined)

  const claimedToday = data?.claimedToday || justClaimed

  async function handleClaim() {
    setClaiming(true)
    try {
      const res = await fetch('/api/quests/daily-login/claim', { method: 'POST' })
      if (res.ok) {
        setJustClaimed(true)
        await mutate('/api/quests/daily-login/status')
        await mutate('/api/user/points')
      }
    } finally {
      setClaiming(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-[72px] rounded-xl bg-white/5 animate-pulse" />
    )
  }

  // ── Already claimed: show countdown ──────────────────────────────────────
  if (claimedToday) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/5 px-3.5 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-green-400">Connexion quotidienne</span>
            <span className="text-xs font-bold text-[#E7BA76]">+250 pts</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Reviens chaque jour pour gagner tes points !
          </p>
          {countdown && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
              Prochain bonus dans{' '}
              <span className="font-mono font-semibold text-[var(--text-secondary)]">
                {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
              </span>
            </p>
          )}
        </div>
        <span className="text-xs font-semibold text-green-400 shrink-0 mt-0.5">Réclamé</span>
      </div>
    )
  }

  // ── Can claim ─────────────────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E7BA76]/40 bg-[#E7BA76]/5 px-3.5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            🌟 Connexion quotidienne
          </span>
          <span className="text-xs font-bold text-[#E7BA76]">+250 pts</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Reviens chaque jour pour gagner tes points !
        </p>
        <div className="mt-2">
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E7BA76]/20 border border-[#E7BA76]/40 px-3 py-1.5 text-xs font-semibold text-[#E7BA76] hover:bg-[#E7BA76]/30 transition-colors disabled:opacity-50"
          >
            {claiming
              ? <><div className="w-3 h-3 border-2 border-[#E7BA76] border-t-transparent rounded-full animate-spin" />Réclamation…</>
              : '✦ Réclamer mes points'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
