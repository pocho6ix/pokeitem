'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Copy, Check, Download } from 'lucide-react'
import { useShareCard } from '@/hooks/useShareCard'
import { LeaderboardShareCard } from '@/components/share/LeaderboardShareCard'

// ─── Platform icons ───────────────────────────────────────────────────────────

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.86 4.86 0 01-1.01-.07z"/>
    </svg>
  )
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  follow_instagram: <InstagramIcon className="w-3.5 h-3.5" />,
  follow_tiktok:   <TikTokIcon className="w-3.5 h-3.5" />,
}

// ─── Referral pinned row ──────────────────────────────────────────────────────

function ReferralRow({ validatedCount, referralLink }: { validatedCount: number; referralLink: string }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Invite un ami</span>
          <span className="text-xs font-bold text-[#E7BA76]">+1000 pts par ami</span>
        </div>
        <p className="text-xs text-[var(--text-primary)] mt-0.5">
          {validatedCount} ami{validatedCount !== 1 ? 's' : ''} invité{validatedCount !== 1 ? 's' : ''}{validatedCount > 0 ? ` (${(validatedCount * 1000).toLocaleString('fr-FR')} points)` : ''}
        </p>
        <div className="mt-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/50 transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-400" />Copié</>
              : <><Copy className="w-3.5 h-3.5" />Copier le lien</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestState {
  id: string
  title: string
  description: string
  points: number
  icon: string
  type: 'progressive' | 'action'
  target?: number
  actionUrl?: string
  actionLabel?: string
  completed: boolean
  completedAt: string | null
  progress: number
}

interface PointsData {
  totalPoints: number
  rank: number | null
  quests: QuestState[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Share quest row (special — triggers image generation) ───────────────────

interface ShareQuestRowProps {
  quest: QuestState
  shareData: Record<string, unknown> | null
  shareCardRef: React.RefObject<HTMLDivElement | null>
}

function ShareQuestRow({ quest, shareData, shareCardRef }: ShareQuestRowProps) {
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      await document.fonts.ready
      if (!shareCardRef.current) return

      const canvas = await html2canvas(shareCardRef.current, {
        scale: 1,
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: 1080,
        height: 1920,
      })

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej()), 'image/png', 1)
      )
      const file = new File([blob], 'pokeitem-classement.png', { type: 'image/png' })

      // Web Share API on mobile
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          setHasDownloaded(true)
          return
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pokeitem-classement.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setHasDownloaded(true)
    } finally {
      setGenerating(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      await fetch(`/api/user/quests/${quest.id}/complete`, { method: 'POST' })
      await mutate('/api/user/points')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-all ${
      quest.completed
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${quest.completed ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
            {quest.title}
          </span>
          <span className="text-xs font-bold text-[#E7BA76]">+{quest.points} pts</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{quest.description}</p>

        {!quest.completed && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleDownload}
              disabled={generating || !shareData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/50 transition-colors disabled:opacity-50"
            >
              {generating
                ? <div className="w-3.5 h-3.5 border-2 border-[#E7BA76] border-t-transparent rounded-full animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              {generating ? 'Génération…' : "Télécharger l'image"}
            </button>
            {hasDownloaded && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E7BA76]/20 border border-[#E7BA76]/40 px-3 py-1.5 text-xs font-semibold text-[#E7BA76] hover:bg-[#E7BA76]/30 transition-colors disabled:opacity-50"
              >
                {completing ? '…' : "✓ C'est fait"}
              </button>
            )}
          </div>
        )}
      </div>
      {quest.completed && (
        <span className="text-xs font-semibold text-green-400 shrink-0 mt-0.5">Complétée</span>
      )}
    </div>
  )
}

// ─── QuestRow ─────────────────────────────────────────────────────────────────

function QuestRow({ quest }: { quest: QuestState }) {
  const [hasClickedFollow, setHasClickedFollow] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    try {
      await fetch(`/api/user/quests/${quest.id}/complete`, { method: 'POST' })
      await mutate('/api/user/points')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-all ${
      quest.completed
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
    }`}>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${quest.completed ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
            {quest.title}
          </span>
          <span className="text-xs font-bold text-[#E7BA76]">+{quest.points} pts</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{quest.description}</p>

        {/* Progressive bar */}
        {quest.type === 'progressive' && quest.target && !quest.completed && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
              <span>{quest.progress}/{quest.target}</span>
              <span>{Math.round((quest.progress / quest.target) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-[#E7BA76] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((quest.progress / quest.target) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {quest.type === 'action' && !quest.completed && (
          <div className="flex items-center gap-2 mt-2">
            {quest.actionUrl && (
              <a
                href={quest.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHasClickedFollow(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[#E7BA76]/50 transition-colors"
              >
                {PLATFORM_ICON[quest.id] ?? null}
                {quest.actionLabel ?? "S'abonner"}
              </a>
            )}
            {hasClickedFollow && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E7BA76]/20 border border-[#E7BA76]/40 px-3 py-1.5 text-xs font-semibold text-[#E7BA76] hover:bg-[#E7BA76]/30 transition-colors disabled:opacity-50"
              >
                {completing ? '…' : '✓ C\'est fait'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Completed badge */}
      {quest.completed && (
        <span className="text-xs font-semibold text-green-400 shrink-0 mt-0.5">Complétée</span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuestsBlock() {
  const { data, isLoading }    = useSWR<PointsData>('/api/user/points', fetcher)
  const { data: referralData } = useSWR('/api/referral/stats', fetcher)
  const { data: shareData }    = useSWR('/api/user/share-data', fetcher)
  const { cardRef }            = useShareCard()

  const quests         = data?.quests ?? []
  const totalPoints    = data?.totalPoints ?? 0
  const rank           = data?.rank ?? null
  const validatedCount = (referralData?.validatedCount ?? 0) as number
  const referralLink   = (referralData?.referralLink ?? '') as string

  const completedCount = quests.filter(q => q.completed).length

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Quêtes</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {completedCount}/{quests.length} complétées
          </p>
        </div>
        {/* Points + rank */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-base font-bold text-[#E7BA76]">{totalPoints.toLocaleString('fr-FR')} pts</span>
          {rank && (
            <span className="text-xs text-[var(--text-tertiary)]">Rang #{rank}</span>
          )}
        </div>
      </div>

      {/* Quest list */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <ReferralRow validatedCount={validatedCount} referralLink={referralLink} />
          {quests.map(quest =>
            quest.id === 'share_leaderboard' ? (
              <ShareQuestRow key={quest.id} quest={quest} shareData={shareData ?? null} shareCardRef={cardRef} />
            ) : (
              <QuestRow key={quest.id} quest={quest} />
            )
          )}
        </div>
      )}

      {/* Off-screen share card for html2canvas */}
      {shareData && (
        <LeaderboardShareCard
          ref={cardRef}
          rank={shareData.rank}
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
