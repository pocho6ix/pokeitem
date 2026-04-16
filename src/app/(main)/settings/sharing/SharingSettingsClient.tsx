"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { shareProfile } from "@/lib/share/shareProfile";

interface ShareSettings {
  isActive: boolean;
  slug: string | null;
  shareCards: boolean;
  shareDoubles: boolean;
  shareWishlist: boolean;
  shareItems: boolean;
  contactDiscord: string | null;
  contactEmail: string | null;
  contactTwitter: string | null;
}

export function SharingSettingsClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [settings, setSettings] = useState<ShareSettings>({
    isActive: false,
    slug: null,
    shareCards: true,
    shareDoubles: true,
    shareWishlist: true,
    shareItems: false,
    contactDiscord: null,
    contactEmail: null,
    contactTwitter: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/share/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data: ShareSettings | null) => {
        if (data) setSettings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profileUrl = settings.slug ? `app.pokeitem.fr/u/${settings.slug}` : null;
  const fullUrl = settings.slug ? `https://app.pokeitem.fr/u/${settings.slug}` : null;

  function validate(): string | null {
    if (settings.isActive && !settings.contactDiscord && !settings.contactEmail && !settings.contactTwitter) {
      return "Au moins un moyen de contact est requis pour activer le partage.";
    }
    if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
      return "L'adresse email n'est pas valide.";
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/share/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "contact_required") {
          setError("Au moins un moyen de contact est requis.");
        } else if (data.error === "invalid_email") {
          setError("L'adresse email n'est pas valide.");
        } else {
          setError("Une erreur est survenue. Réessaie.");
        }
        return;
      }
      if (data.slug && !settings.slug) {
        setSettings((prev) => ({ ...prev, slug: data.slug }));
      }
      toast("Paramètres sauvegardés", "success");
    } catch {
      setError("Une erreur est survenue. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyUrl() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Impossible de copier", "error");
    }
  }

  async function handleShare() {
    if (!settings.slug) return;
    await shareProfile(settings.slug, "Mon classeur", () => {
      toast("Lien copié !", "success");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7BA76] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Partage de classeur</h1>
          <p className="text-sm text-[var(--text-secondary)]">Rends ton classeur visible publiquement</p>
        </div>
      </div>

      {/* Toggle section */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Activer le partage</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {settings.isActive ? "Ton classeur est visible publiquement" : "Ton classeur est privé"}
            </p>
          </div>
          <button
            onClick={() => setSettings((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={`relative h-7 w-12 rounded-full transition-colors ${settings.isActive ? "bg-[#E7BA76]" : "bg-[var(--bg-tertiary)]"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${settings.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Slug display when active */}
        {settings.isActive && profileUrl && (
          <div className="mt-4 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/5 p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Ton lien public</p>
            <p className="mb-3 break-all text-sm font-mono text-[var(--text-primary)]">{profileUrl}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {copied ? "Copié !" : "Copier"}
              </button>
              <button
                onClick={handleShare}
                className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-black"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Partager
              </button>
            </div>
          </div>
        )}
      </div>

      {/* What to share */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h2 className="mb-3 font-semibold text-[var(--text-primary)]">Que partager ?</h2>
        <div className="space-y-3">
          {[
            { key: "shareCards" as const, label: "Mes cartes", hint: null },
            { key: "shareDoubles" as const, label: "Mes doubles", hint: "Recommandé pour les échanges" },
            { key: "shareWishlist" as const, label: "Liste de souhaits", hint: "Recommandé pour les échanges" },
            { key: "shareItems" as const, label: "Mes items scellés", hint: null },
          ].map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                {hint && <p className="text-xs text-[var(--text-secondary)]">{hint}</p>}
              </div>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${settings[key] ? "bg-[#E7BA76]" : "bg-[var(--bg-tertiary)]"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[key] ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Contact section */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Contact pour les échanges</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Au moins un moyen de contact est requis si le partage est activé.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Discord</label>
            <input
              type="text"
              placeholder="tonpseudo#1234"
              value={settings.contactDiscord ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, contactDiscord: e.target.value || null }))}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              placeholder="ton@email.fr"
              value={settings.contactEmail ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value || null }))}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] placeholder:text-[var(--text-tertiary)]"
            />
            <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
              Attention : ton email sera visible sur ton profil public.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Twitter / X</label>
            <input
              type="text"
              placeholder="@tonpseudo"
              value={settings.contactTwitter ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, contactTwitter: e.target.value || null }))}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#E7BA76] placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || (settings.isActive && !settings.contactDiscord && !settings.contactEmail && !settings.contactTwitter)}
        className="btn-gold w-full rounded-2xl py-4 text-base font-bold text-black disabled:opacity-50"
      >
        {saving ? "Sauvegarde…" : "Sauvegarder"}
      </button>

      {/* Bottom links */}
      <div className="flex flex-col items-center gap-3 pb-4 text-sm">
        {settings.slug && settings.isActive && (
          <a
            href={`/u/${settings.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#E7BA76] underline"
          >
            Voir mon profil public
          </a>
        )}
        {settings.isActive && (
          <button
            onClick={() => setSettings((prev) => ({ ...prev, isActive: false }))}
            className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            Désactiver le partage
          </button>
        )}
      </div>
    </div>
  );
}
