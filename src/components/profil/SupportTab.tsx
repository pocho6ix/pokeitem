'use client'
import { useState } from 'react'
import { Mail } from 'lucide-react'

export function SupportTab() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const sub = encodeURIComponent(subject || 'Support PokeItem')
    const body = encodeURIComponent(message)
    window.location.href = `mailto:contact@pokeitem.fr?subject=${sub}&body=${body}`
    setSent(true)
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl bg-[#E7BA76]/10 p-2.5">
          <Mail className="h-5 w-5 text-[#E7BA76]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contacter le support</h3>
          <p className="text-xs text-[var(--text-secondary)]">contact@pokeitem.fr · Réponse sous 24h</p>
        </div>
      </div>

      {sent ? (
        <p className="text-sm text-green-400 text-center py-6">
          ✓ Votre client mail a été ouvert. Nous répondons sous 24h.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Sujet"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76]"
          />
          <textarea
            placeholder="Décrivez votre problème ou votre question..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            required
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] resize-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#E7BA76] py-3 text-sm font-bold text-black hover:bg-[#d4a660] transition-colors"
          >
            Envoyer via email →
          </button>
        </form>
      )}
    </div>
  )
}
