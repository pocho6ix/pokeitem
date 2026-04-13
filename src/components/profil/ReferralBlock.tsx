'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { Copy, Check, Share2, Trophy, Users, Search } from 'lucide-react'
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
      <span className="text-sm font-bold text-[#E7BA76] shrink-0" suppressHydrationWarning>
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
  const { data: lb,    isLoading: lbLoading }    = useSWR('/api/leaderboard?take=15', fetcher)
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

  // ── Leaderboard state ──────────────────────────────────────────────────────
  const PAGE_SIZE = 15
  const [lbEntries, setLbEntries] = useState<PointsLeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<PointsLeaderboardEntry | null>(null)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [page, setPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalParticipants / PAGE_SIZE))

  // Sync initial SWR data (page 1)
  useEffect(() => {
    if (lb) {
      setLbEntries(lb.rankings ?? [])
      setCurrentUser(lb.currentUser ?? null)
      setTotalParticipants(lb.totalParticipants ?? 0)
    }
  }, [lb])

  const fetchLeaderboard = useCallback(async (pageNum: number, query: string) => {
    const skip = (pageNum - 1) * PAGE_SIZE
    const params = new URLSearchParams({ skip: String(skip), take: String(PAGE_SIZE) })
    if (query) params.set('q', query)
    const res = await fetch(`/api/leaderboard?${params}`)
    if (!res.ok) return
    const text = await res.text()
    if (!text) return
    const data = JSON.parse(text)
    setLbEntries(data.rankings ?? [])
    setCurrentUser(data.currentUser ?? null)
    setTotalParticipants(data.totalParticipants ?? 0)
  }, [])

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setPage(1)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      await fetchLeaderboard(1, value)
      setSearching(false)
    }, 300)
  }

  async function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages || pageLoading) return
    setPageLoading(true)
    setPage(newPage)
    await fetchLeaderboard(newPage, searchQuery)
    setPageLoading(false)
  }

  const currentUserInList = lbEntries.some(e => e.isCurrentUser)

  return (
    <div className="space-y-4">

      {/* ── Progression + Concours ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">

        {/* Prize image — very top of the block, edge-to-edge */}
        {CONTEST_CONFIG.active && (
          <div
            className="w-full"
            style={{
              boxShadow: 'inset 0 0 0 1.5px rgba(212,168,83,0.4)',
              animation: 'prize-pulse 3s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes prize-pulse {
                0%, 100% { box-shadow: inset 0 0 0 1.5px rgba(212,168,83,0.4), 0 0 18px 2px rgba(212,168,83,0.15); }
                50%       { box-shadow: inset 0 0 0 1.5px rgba(212,168,83,0.7), 0 0 28px 4px rgba(212,168,83,0.28); }
              }
            `}</style>
            {CONTEST_CONFIG.prizeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={CONTEST_CONFIG.prizeImageUrl}
                alt="Lot à gagner — UPC Flammes Fantasmagoriques"
                className="w-full h-auto block"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
                style={{ aspectRatio: '16/9' }}
              >
                <span style={{ fontSize: 32 }}>🎁</span>
                <span className="text-xs font-medium">Image du lot à venir</span>
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]" suppressHydrationWarning>Inviter un ami</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">+1000 points</p>
              <p className="text-xs text-[var(--text-secondary)]">+1 semaine Premium gratuite par ami invité</p>
            </div>
            {CONTEST_CONFIG.active && (
              <span suppressHydrationWarning className="shrink-0 rounded-full border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-tertiary)]">
                {countdown ?? '…'}
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

          {/* Concours text */}
          {CONTEST_CONFIG.active && (
            <p className="text-xs text-[var(--text-tertiary)] border-t border-[var(--border-default)] pt-3 leading-relaxed">
              <span className="font-semibold text-[#D4A853]">Concours</span>
              {' · '}Le joueur avec le plus de points remporte une UPC Flammes Fantasmagoriques 🔥 Plein d&apos;autres lots pour les meilleurs du leaderboard.
            </p>
          )}
        </div>
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
          <h4 className="font-semibold text-[var(--text-primary)]">Classement</h4>
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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher un joueur…"
            className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[#E7BA76]/50 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#E7BA76] border-t-transparent rounded-full animate-spin" />
            </div>
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
              {searchQuery ? 'Aucun joueur trouvé' : 'Sois le premier à parrainer !'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lbEntries.map(entry => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}

            {/* Current user row if not in the visible list */}
            {currentUser && !currentUserInList && !searchQuery && (
              <>
                <p className="text-center text-xs text-[var(--text-tertiary)] py-1">· · ·</p>
                <LeaderboardRow entry={currentUser} />
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || pageLoading}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[#E7BA76]/40 hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>

                <span className="text-xs text-[var(--text-tertiary)]">
                  {pageLoading ? (
                    <div className="w-4 h-4 border-2 border-[#E7BA76] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `${page} / ${totalPages}`
                  )}
                </span>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages || pageLoading}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[#E7BA76]/40 hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Suivant →
                </button>
              </div>
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
