'use client'
import { useState } from 'react'
import { ReferralBlock } from './ReferralBlock'
import { SettingsTab } from './SettingsTab'
import { SupportTab } from './SupportTab'

type Tab = 'referral' | 'settings' | 'support'

const TABS: { id: Tab; label: string }[] = [
  { id: 'referral', label: 'Parrainage' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'support',  label: 'Support' },
]

export function ProfileTabs() {
  const [active, setActive] = useState<Tab>('referral')

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Horizontal tab bar */}
      <div className="flex border-b border-[var(--border-default)]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? 'border-b-2 border-[#E7BA76] text-[#E7BA76] bg-[#E7BA76]/5'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {active === 'referral' && <ReferralBlock />}
        {active === 'settings' && <SettingsTab />}
        {active === 'support'  && <SupportTab />}
      </div>
    </div>
  )
}
