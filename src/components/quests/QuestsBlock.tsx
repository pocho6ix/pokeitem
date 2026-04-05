'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Sparkles, ExternalLink } from 'lucide-react'

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
      {/* Icon */}
      <span className="text-xl leading-none mt-0.5 shrink-0">{quest.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${quest.completed ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
            {quest.title}
          </span>
          <span className="text-xs font-bold text-amber-400">+{quest.points} pts</span>
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
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
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
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-amber-400/50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {quest.actionLabel ?? "S'abonner"}
              </a>
            )}
            {hasClickedFollow && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                {completing ? '…' : '✓ C\'est fait'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Completed badge */}
      {quest.completed && (
        <span className="text-xs font-semibold text-green-400 shrink-0 mt-0.5">✅ Complétée</span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuestsBlock() {
  const { data, isLoading } = useSWR<PointsData>('/api/user/points', fetcher)

  const quests      = data?.quests ?? []
  const totalPoints = data?.totalPoints ?? 0
  const rank        = data?.rank ?? null

  const completedCount = quests.filter(q => q.completed).length

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-400/10">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Quêtes</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {completedCount}/{quests.length} complétées
            </p>
          </div>
        </div>
        {/* Points + rank */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-base font-bold text-amber-400">{totalPoints.toLocaleString('fr-FR')} pts</span>
          {rank && (
            <span className="text-xs text-[var(--text-tertiary)]">Rang #{rank}</span>
          )}
        </div>
      </div>

      {/* Quest list */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map(quest => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  )
}
