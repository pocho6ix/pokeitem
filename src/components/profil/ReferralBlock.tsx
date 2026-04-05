'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Copy, Check, Share2, Trophy, Users } from 'lucide-react'
import { CONTEST_CONFIG } from '@/config/contest'
import type { PointsLeaderboardEntry } from '@/lib/points'
import { LeaderboardShareCard } from '@/components/share/LeaderboardShareCard'
import { useShareCard } from '@/hooks/useShareCard'

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
      <span className="text-sm font-bold text-[#E7BA76] shrink-0">
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
  const { data: lb,    isLoading: lbLoading }    = useSWR('/api/leaderboard',    fetcher)
  const { data: shareData }                      = useSWR('/api/user/share-data', fetcher)

  const { cardRef, isGenerating, share } = useShareCard()
  const [copied, setCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  async function handleShareCard() {
    await share(
      'pokeitem-leaderboard.png',
      `Je suis #${shareData?.rank} sur PokeItem avec ${(shareData?.totalPoints ?? 0).toLocaleString('fr-FR')} pts ! 🏆 app.pokeitem.fr`
    )
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  const contestEndDate = CONTEST_CONFIG.active ? new Date(CONTEST_CONFIG.endDate) : null
  const countdown      = useCountdown(contestEndDate)

  const validatedCount = (stats?.validatedCount ?? 0) as number

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Invite un ami</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">+1 semaine Pro par ami invité</p>
          </div>
          {CONTEST_CONFIG.active && countdown !== null && (
            <span className="shrink-0 rounded-full border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-tertiary)]">
              {countdown}
            </span>
          )}
        </div>

        {/* Stepper */}
        {statsLoading ? (
          <div className="animate-pulse h-8 rounded-xl bg-white/5" />
        ) : (
          <div className="flex items-center px-1">
            {[0, 1, 2].map((i) => {
              const completed = i < validatedCount
              const isLast = i === 2
              return (
                <div key={i} className="flex items-center" style={{ flex: isLast ? undefined : 1 }}>
                  <div
                    className="shrink-0 flex items-center justify-center rounded-full transition-all"
                    style={{
                      width: 32, height: 32,
                      backgroundColor: completed ? '#D4A853' : 'transparent',
                      border: completed ? 'none' : '2px solid #2A3A4A',
                    }}
                  >
                    {completed && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7L5.5 10.5L12 3.5" stroke="#080C12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className="flex-1 transition-all duration-500"
                      style={{
                        height: 2,
                        backgroundColor: i < validatedCount - 1 ? '#D4A853' : '#1E2D3D',
                        margin: '0 6px',
                      }}
                    />
                  )}
                </div>
              )
            })}
            <span className="ml-4 shrink-0 text-sm text-[var(--text-secondary)]">
              {Math.min(validatedCount, 3)}/3 invités
            </span>
          </div>
        )}

        {/* Concours prize line */}
        {CONTEST_CONFIG.active && (
          <p className="text-xs text-[var(--text-tertiary)] border-t border-[var(--border-default)] pt-3 leading-relaxed">
            <span className="font-semibold text-[#D4A853]">Concours</span>
            {' · '}Le joueur avec le plus de points remporte {CONTEST_CONFIG.prize}
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
            <span className="text-xs text-[var(--text-tertiary)]">
              {totalParticipants} participant{totalParticipants > 1 ? 's' : ''}
            </span>
          )}
          {/* Share button */}
          {shareData && (
            <button
              onClick={handleShareCard}
              disabled={isGenerating}
              title="Partager ma position"
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[#E7BA76]/50 hover:text-[#E7BA76] transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-3.5 h-3.5 border-2 border-[#E7BA76] border-t-transparent rounded-full animate-spin" />
              ) : shareCopied ? (
                <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copié !</span></>
              ) : (
                <><Share2 className="w-3.5 h-3.5" />Partager</>
              )}
            </button>
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

      {/* Off-screen share card (invisible, used by html2canvas) */}
      {shareData && (
        <LeaderboardShareCard
          ref={cardRef}
          rank={shareData.rank}
          totalParticipants={shareData.totalParticipants ?? 0}
          username={shareData.username}
          avatarUrl={shareData.avatar}
          totalPoints={shareData.totalPoints}
          cardCount={shareData.cardCount}
          referralCount={shareData.referralCount}
          questsCompleted={shareData.questsCompleted}
          questsTotal={shareData.questsTotal}
        />
      )}
    </div>
  )
}
