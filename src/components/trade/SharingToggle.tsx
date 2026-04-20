"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { fetchApi } from "@/lib/api";

/**
 * Compact public/private toggle for the caller's own ClasseurShare.
 * Rendered at the top of /echanges so users can flip visibility without
 * leaving the page.
 *
 * - OFF (default): profile invisible, search + suggestions can't return it
 * - ON: profile findable at /u/:slug by other dresseurs
 *
 * Activating requires at least one contact channel configured (Discord /
 * email / Twitter). If none is set, we surface a toast and link to the
 * dedicated /settings/sharing page where the full form lives.
 */
export function SharingToggle() {
  const { toast } = useToast();
  const [loading,   setLoading]   = useState(true);
  const [pending,   setPending]   = useState(false);
  const [isActive,  setIsActive]  = useState(false);
  const [slug,      setSlug]      = useState<string | null>(null);
  const [settings,  setSettings]  = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi("/api/share/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        if (cancelled) return;
        setSettings(data);
        setIsActive(!!data.isActive);
        setSlug(data.slug);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleToggle() {
    if (pending || !settings) return;
    const next = !isActive;

    // Guard: activating without any contact will be rejected server-side
    // with "contact_required". Short-circuit with a friendlier message that
    // points to /settings/sharing instead of surfacing a raw 400.
    if (next && !settings.contactDiscord && !settings.contactEmail && !settings.contactTwitter) {
      toast("Ajoute un moyen de contact avant de devenir public", "info");
      return;
    }

    setPending(true);
    // Optimistic flip — roll back on failure
    setIsActive(next);
    try {
      const res = await fetchApi("/api/share/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...settings, isActive: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "erreur");
      if (body.slug) setSlug(body.slug);
      toast(next ? "Ton classeur est maintenant public" : "Classeur masqué", "success");
    } catch (err) {
      setIsActive(!next); // rollback
      toast(err instanceof Error && err.message === "contact_required"
        ? "Ajoute un moyen de contact avant de devenir public"
        : "Erreur, réessaye", "error");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="mb-5 h-[58px] animate-pulse rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/60" aria-hidden />
    );
  }

  const Icon = isActive ? Eye : EyeOff;
  const title = isActive ? "Profil public" : "Profil privé";
  const subtitle = isActive
    ? "Les autres dresseurs peuvent te trouver et voir tes doubles"
    : "Invisible dans la recherche et les suggestions";

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[#E7BA76]/15 text-[#E7BA76]" : "bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="truncate text-[11px] text-[var(--text-tertiary)]">
          {subtitle}
          {isActive && slug && (
            <>
              {" · "}
              <Link href={`/u/${slug}`} className="text-[#E7BA76] hover:underline">
                /u/{slug}
              </Link>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={pending}
        onClick={handleToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76]/50 disabled:opacity-60 ${isActive ? "bg-[#E7BA76]" : "bg-[var(--bg-secondary)] border border-[var(--border-default)]"}`}
      >
        <span
          className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`}
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin text-[var(--text-tertiary)]" />}
        </span>
      </button>
    </div>
  );
}

interface Settings {
  isActive:       boolean;
  slug:           string | null;
  shareCards:     boolean;
  shareDoubles:   boolean;
  shareWishlist:  boolean;
  shareItems:     boolean;
  contactDiscord: string | null;
  contactEmail:   string | null;
  contactTwitter: string | null;
}
