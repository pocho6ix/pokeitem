'use client'
import { useState, useEffect } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

export function SettingsTab() {
  const { isPro, isTrialing, trialEndsAt } = useSubscription()
  const [username, setUsername] = useState('')
  const [initialUsername, setInitialUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [cancelInfo, setCancelInfo] = useState<{ cancelAt: string; message: string } | null>(null)

  // Load current username
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => {
        if (d.username) {
          setUsername(d.username)
          setInitialUsername(d.username)
        }
      })
  }, [])

  // Debounce availability check
  useEffect(() => {
    if (!username || username.length < 3 || username === initialUsername) {
      setAvailable(null)
      return
    }
    setChecking(true)
    const t = setTimeout(async () => {
      const res = await fetch(`/api/user/username?check=${encodeURIComponent(username)}`)
      const data = await res.json()
      setAvailable(data.available)
      setChecking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [username, initialUsername])

  const handleSaveUsername = async () => {
    if (!username || username.length < 3) return
    setSaving(true)
    const res = await fetch('/api/user/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setInitialUsername(username)
      setAvailable(null)
      setSaveMsg('✓ Pseudo enregistré')
    } else {
      setSaveMsg(data.error ?? 'Erreur')
    }
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleCancel = async () => {
    if (!confirm("Confirmer la résiliation ? Votre accès Pro sera maintenu jusqu'à la fin de la période en cours.")) return
    setCanceling(true)
    const res = await fetch('/api/subscription/cancel', { method: 'POST' })
    const data = await res.json()
    setCanceling(false)
    if (res.ok) setCancelInfo(data)
  }

  // Allow saving if: valid length + not currently saving + pseudo not explicitly taken
  // Server-side validation handles the uniqueness check on submit
  const canSave = username.length >= 3 && !saving && available !== false

  return (
    <div className="space-y-6">
      {/* Username */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Pseudo de parrainage</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Personnalise ton lien de parrainage. Doit être unique (3–20 caractères, lettres/chiffres/-/_).
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20))}
              placeholder="Pseudo"
              maxLength={20}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 pr-16 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76]"
            />
            {username.length >= 3 && username !== initialUsername && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                checking ? 'text-[var(--text-tertiary)]' :
                available ? 'text-green-400' : 'text-red-400'
              }`}>
                {checking ? '...' : available ? '✓ Dispo' : '✗ Pris'}
              </span>
            )}
          </div>
          <button
            onClick={handleSaveUsername}
            disabled={saving || !canSave}
            className="shrink-0 rounded-xl bg-[#E7BA76] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40 hover:bg-[#d4a660] transition-colors"
          >
            {saving ? '...' : 'Enregistrer'}
          </button>
        </div>
        {saveMsg && (
          <p className={`mt-2 text-xs ${saveMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMsg}
          </p>
        )}
        {username.length >= 3 && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            Lien : app.pokeitem.fr/inscription?ref=<span className="text-[var(--text-secondary)]">{username}</span>
          </p>
        )}
      </section>

      {/* Subscription management */}
      {isPro && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Abonnement</h3>
          {isTrialing && trialEndsAt && (
            <p className="text-xs text-blue-400 mb-3">
              Période d&apos;essai — se termine le {trialEndsAt.toLocaleDateString('fr-FR')}
            </p>
          )}
          {cancelInfo ? (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
              <p className="text-sm text-orange-400">{cancelInfo.message}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                En résiliant, votre accès Pro est maintenu jusqu&apos;à la fin de la période en cours. Aucun prélèvement supplémentaire.
              </p>
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                {canceling ? 'En cours...' : 'Résilier mon abonnement'}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}
