"use client"

const TELEGRAM_URL = "https://t.me/pokeitem"

export function TelegramBannerButton() {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 hover:border-[#0088cc]/50 hover:bg-[#0088cc]/5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0088cc]/15 group-hover:bg-[#0088cc]/25 transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0088cc" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Rejoindre la communauté</p>
          <p className="text-xs text-[var(--text-secondary)] leading-tight">Groupe Telegram PokeItem</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E7BA76]/20 text-[#E7BA76] border border-[#E7BA76]/30">
          +2 000 pts
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)] group-hover:text-[#0088cc] transition-colors">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </a>
  )
}
