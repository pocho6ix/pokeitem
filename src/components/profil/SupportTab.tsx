'use client'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { fetchApi } from "@/lib/api";

export function SupportTab() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetchApi('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error('Erreur')
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessaie ou écris-nous à contact@pokeitem.fr')
    } finally {
      setSending(false)
    }
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
          ✓ Message envoyé ! Merci pour ton retour, nous répondons sous 24h.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            placeholder="Décrivez votre problème, suggestion ou question..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            required
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="btn-gold w-full rounded-xl py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {sending ? 'Envoi…' : 'Envoyer →'}
          </button>
        </form>
      )}
    </div>
  )
}
