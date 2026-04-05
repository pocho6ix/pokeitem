'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Copy, Check, Share2, Trophy, Gift, Users } from 'lucide-react'
import { CONTEST_CONFIG } from '@/config/contest'
import type { PointsLeaderboardEntry } from '@/lib/points'

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotState = 'validated' | 'pending' | 'empty'

// ─── Contest countdown hook ───────────────────────────────────────────────────

function useCountdown(endDate: Date | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (!endDate) return

    function update() {
      const diff = endDate!.getTime() - Date.now()
      if (diff <= 0) { setRemaining(null); return }
      const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setRemaining(`${days}j ${hours}h ${minutes}min`)
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [endDate])

  return remaining
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ username, image, size = 32 }: { username: string; image?: string | null; size?: number }) {
  const initial = (username[0] ?? '?').toUpperCase()
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={username}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-[#E7BA76]/20 flex items-center justify-center text-[#E7BA76] font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  )
}

// ─── Slot component ───────────────────────────────────────────────────────────

const SLOT_STYLES: Record<SlotState, string> = {
  validated: 'border-green-500 bg-green-500/15',
  pending:   'border-yellow-400/60 bg-yellow-400/10',
  empty:     'border-[var(--border-default)] bg-[var(--bg-secondary)]',
}

const SLOT_ICON: Record<SlotState, string> = {
  validated: '✅',
  pending:   '🟡',
  empty:     '⚪',
}

function Slot({ state, index }: { state: SlotState; index: number }) {
  return (
    <div className={`flex-1 rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${SLOT_STYLES[state]}`}>
      <span className="text-lg leading-none">{SLOT_ICON[state]}</span>
      <span className="text-xs font-semibold text-[var(--text-secondary)]">Sem {index + 1}</span>
    </div>
  )
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const TOP3_BG: Record<number, string> = {
  1: 'bg-amber-400/8 border-amber-400/30',
  2: 'bg-slate-400/8 border-slate-400/20',
  3: 'bg-amber-700/8 border-amber-700/20',
}

function LeaderboardRow({ entry }: { entry: PointsLeaderboardEntry }) {
  const medal  = MEDAL[entry.rank]
  const top3bg = TOP3_BG[entry.rank] ?? ''
  const isMe   = entry.isCurrentUser

  const bg = isMe
    ? 'border-[#E7BA76]/50'
    : (top3bg || 'border-[var(--border-default)]')

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${bg}`}
      style={isMe ? { backgroundColor: 'rgba(231,186,118,0.06)' } : undefined}
    >
      {/* Rank */}
      <span className="w-8 text-center text-sm font-bold shrink-0 text-[var(--text-secondary)]">
        {medal ?? `#${entry.rank}`}
      </span>

      {/* Avatar */}
      <Avatar username={entry.username} image={entry.image} size={30} />

      {/* Username */}
      <span className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-[#E7BA76]' : 'text-[var(--text-primary)]'}`}>
        {entry.username}
      </span>

      {/* Points */}
      <span className="text-sm font-bold text-amber-400 shrink-0">
        {entry.totalPoints.toLocaleString('fr-FR')} pts
      </span>

      {/* "← Toi" badge */}
      {isMe && (
        <span className="text-[10px] font-bold text-[#E7BA76] shrink-0 rounded-full bg-[#E7BA76]/15 px-1.5 py-0.5">
          Toi
        </span>
      )}
    </div>
  )
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Main component ───────────────────────────────────────────────────────────

export function ReferralBlock() {
  const { data: stats, isLoading: statsLoading } = useSWR('/api/referral/stats', fetcher)
  const { data: lb,    isLoading: lbLoading }    = useSWR('/api/leaderboard',         fetcher)

  const [copied, setCopied] = useState(false)

  const contestEndDate = CONTEST_CONFIG.active ? new Date(CONTEST_CONFIG.endDate) : null
  const countdown      = useCountdown(contestEndDate)

  const validatedCount = (stats?.validatedCount ?? 0) as number
  const slots          = (stats?.slots ?? ['empty', 'empty', 'empty']) as SlotState[]
  const progressPct    = Math.round((Math.min(validatedCount, 3) / 3) * 100)
  const maxReached     = validatedCount >= 3

  async function copyLink() {
    await navigator.clipboard.writeText(stats?.referralLink ?? '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    const link = stats?.referralLink ?? ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'PokéItem — Gère ta collection Pokémon TCG',
          text: 'Rejoins PokéItem et suis la valeur de ta collection Pokémon ! Inscris-toi avec mon lien :',
          url: link,
        })
        return
      } catch {}
    }
    // Fallback: copy
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lbEntries: PointsLeaderboardEntry[] = lb?.rankings ?? []
  const currentUser: PointsLeaderboardEntry | null = lb?.currentUser ?? null
  const currentUserInTop = lbEntries.some(e => e.isCurrentUser)
  const totalParticipants: number = lb?.totalParticipants ?? 0

  return (
    <div className="space-y-4">

      {/* ── Progression + Concours ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E7BA76]/10">
              <Gift className="w-5 h-5 text-[#E7BA76]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Invite un ami</h3>
              <p className="text-xs text-[var(--text-secondary)]">+1 semaine Pro offerte par ami invité 🎉</p>
            </div>
          </div>
          {/* Concours countdown inline */}
          {CONTEST_CONFIG.active && countdown !== null && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#E7BA76]/30 bg-[#E7BA76]/8 px-2.5 py-1 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-[#E7BA76]" />
              <span className="text-xs font-bold text-[#E7BA76]">{countdown}</span>
            </div>
          )}
        </div>

        {/* Slots + progress */}
        {statsLoading ? (
          <div className="animate-pulse h-16 rounded-xl bg-white/5" />
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              {slots.map((state, i) => (
                <Slot key={i} state={state} index={i} />
              ))}
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{Math.min(validatedCount, 3)}/3 amis invités</span>
                <span className="font-semibold text-[var(--text-primary)]">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                <div
                  className="h-full rounded-full bg-[#E7BA76] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {maxReached && (
                <p className="mt-2 text-center text-xs font-semibold text-[#E7BA76]">
                  🏆 Maximum atteint ! Continue d&apos;inviter pour le leaderboard
                </p>
              )}
            </div>
          </div>
        )}

        {/* Concours prize line */}
        {CONTEST_CONFIG.active && (
          <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border-default)] pt-3">
            🏆 <span className="font-semibold text-[var(--text-primary)]">{CONTEST_CONFIG.title}</span>
            {' · '}Le parrain le plus actif remporte {CONTEST_CONFIG.prize} {CONTEST_CONFIG.emoji}
          </p>
        )}
      </div>

      {/* ── Lien de parrainage ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Ton lien de parrainage
        </p>
        <div className="flex gap-2">
          <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)] truncate font-mono">
            {stats?.referralLink ?? '—'}
          </div>
          <button
            onClick={copyLink}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/60 transition-colors"
          >
            {copied ? <><Check className="w-4 h-4 text-green-400" />Copié</> : <><Copy className="w-4 h-4" />Copier</>}
          </button>
        </div>
        <button
          onClick={shareLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E7BA76] py-3 text-sm font-bold text-black hover:bg-[#d4a660] transition-colors active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          Partager le lien
        </button>
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#E7BA76]" />
          <h4 className="font-semibold text-[var(--text-primary)]">Leaderboard</h4>
          {totalParticipants > 0 && (
            <span className="ml-auto text-xs text-[var(--text-tertiary)]">
              {totalParticipants} participant{totalParticipants > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {lbLoading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : lbEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Sois le premier à parrainer !
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lbEntries.map(entry => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}

            {/* Current user row if outside top 10 */}
            {currentUser && !currentUserInTop && (
              <>
                <p className="text-center text-xs text-[var(--text-tertiary)] py-1">· · ·</p>
                <LeaderboardRow entry={currentUser} />
              </>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
