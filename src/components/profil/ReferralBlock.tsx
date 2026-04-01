'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Copy, Check, Gift, Users } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ReferralBlock() {
  const { data: stats, isLoading } = useSWR('/api/referral/stats', fetcher)
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(stats?.referralLink ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="animate-pulse h-40 rounded-2xl bg-white/5" />

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#E7BA76]/10">
          <Gift className="w-5 h-5 text-[#E7BA76]" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Parrainage</h3>
          <p className="text-sm text-[var(--text-secondary)]">Invite tes amis et gagne 1 mois offert</p>
        </div>
      </div>

      {/* Rewards grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--bg-secondary)] p-3 text-center">
          <p className="text-xl font-bold text-[#E7BA76]">-5€</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">pour ton filleul</p>
          <p className="text-xs text-[var(--text-tertiary)]">sur l&apos;abonnement annuel</p>
        </div>
        <div className="rounded-xl bg-[var(--bg-secondary)] p-3 text-center">
          <p className="text-xl font-bold text-green-400">+1 mois</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">offert pour toi</p>
          <p className="text-xs text-[var(--text-tertiary)]">dès sa souscription</p>
        </div>
      </div>

      {/* Referral link */}
      <div>
        <label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">
          Ton lien de parrainage
        </label>
        <div className="flex gap-2">
          <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] truncate font-mono">
            {stats?.referralLink ?? '—'}
          </div>
          <button
            onClick={copyLink}
            className="px-4 py-3 rounded-xl bg-[#E7BA76] hover:bg-[#d4a660] transition-colors text-black font-medium flex items-center gap-2 shrink-0"
          >
            {copied ? <><Check className="w-4 h-4" />Copié</> : <><Copy className="w-4 h-4" />Copier</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Users className="w-4 h-4" />
          <span>
            <span className="text-[var(--text-primary)] font-medium">{stats?.totalReferrals ?? 0}</span>
            {' '}filleul{(stats?.totalReferrals ?? 0) !== 1 ? 's' : ''}
          </span>
          {(stats?.convertedReferrals ?? 0) > 0 && (
            <span className="text-[var(--text-tertiary)]">
              · <span className="text-green-400 font-medium">{stats.convertedReferrals}</span> Pro
            </span>
          )}
        </div>
        {stats?.rewardEarned && (
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
            ✓ 1 mois crédité
          </span>
        )}
      </div>
    </div>
  )
}
