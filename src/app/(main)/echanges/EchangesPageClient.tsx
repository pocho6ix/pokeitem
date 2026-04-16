"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { useSubscription } from "@/hooks/useSubscription";

const RATE_LIMIT_KEY = "echanges_next_recompute_at";
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 min

interface MatchItem {
  id: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    slug: string | null;
  };
  youGiveCount: number;
  youReceiveCount: number;
  youGiveValueCents: number;
  youReceiveValueCents: number;
  balanceScore: number;
  computedAt: string;
}

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function getNextRecomputeAt(): Date | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  if (!stored) return null;
  const d = new Date(stored);
  return isNaN(d.getTime()) ? null : d;
}

const GOLD_GRADIENT = "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)";

function LockedEchanges() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{ background: "rgba(231,186,118,0.12)", border: "1.5px solid rgba(231,186,118,0.3)" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E7BA76" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
      </div>

      {/* Badge */}
      <span
        className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide"
        style={{ background: GOLD_GRADIENT, color: "#1A1A1A" }}
      >
        ★ PREMIUM
      </span>

      <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Matchmaking d&apos;échanges</h2>
      <p className="mb-2 max-w-xs text-sm text-[var(--text-secondary)]">
        Trouve automatiquement des dresseurs avec qui échanger tes doubles contre tes cartes souhaitées.
      </p>

      {/* Benefits */}
      <ul className="mb-7 mt-4 space-y-2 text-left w-full max-w-xs">
        {[
          "Matching automatique doubles × souhaits",
          "Score d'équilibre de l'échange",
          "Coordonnées de contact du dresseur",
          "Actualisation en temps réel",
        ].map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7BA76]/20 text-[#E7BA76]">
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1.5 5 3.5 7.5 8.5 2.5"/>
              </svg>
            </span>
            {b}
          </li>
        ))}
      </ul>

      <button
        onClick={() => router.push("/pricing")}
        className="relative w-full max-w-xs overflow-hidden rounded-full py-4 text-sm font-bold uppercase tracking-wide text-[#1A1A1A] transition-all active:scale-[0.97]"
        style={{ background: GOLD_GRADIENT, boxShadow: "0 2px 12px rgba(191,149,63,0.35)" }}
      >
        Passer à Pro →
      </button>
      <p className="mt-3 text-xs text-[var(--text-tertiary)]">
        À partir de 3,33€/mois · 7 jours d&apos;essai gratuit
      </p>
    </div>
  );
}

export function EchangesPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { isPro, isLoading: subLoading } = useSubscription();

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [nextRecomputeAt, setNextRecomputeAt] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  // Clock tick for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  // Load stored rate limit on mount
  useEffect(() => {
    setNextRecomputeAt(getNextRecomputeAt());
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trade-matches");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const canRecompute = !nextRecomputeAt || nextRecomputeAt <= now;

  async function handleRecompute() {
    if (!canRecompute || recomputing) return;
    setRecomputing(true);
    try {
      const res = await fetch("/api/trade-matches/recompute", { method: "POST" });
      const data = await res.json();

      if (res.status === 429) {
        // Rate limited by server
        const next = new Date(data.nextRecomputeAt);
        setNextRecomputeAt(next);
        localStorage.setItem(RATE_LIMIT_KEY, next.toISOString());
        toast("Réessaie dans quelques minutes", "info");
        return;
      }

      if (!res.ok) {
        toast("Erreur lors du recalcul", "error");
        return;
      }

      // Store next recompute time
      const next = new Date(Date.now() + RATE_LIMIT_MS);
      setNextRecomputeAt(next);
      localStorage.setItem(RATE_LIMIT_KEY, next.toISOString());

      toast(`${data.matchesFound} échange${data.matchesFound !== 1 ? "s" : ""} trouvé${data.matchesFound !== 1 ? "s" : ""} sur ${data.totalChecked} dresseur${data.totalChecked !== 1 ? "s" : ""}`, "success");
      await loadMatches();
    } catch {
      toast("Erreur lors du recalcul", "error");
    } finally {
      setRecomputing(false);
    }
  }

  const minutesLeft = nextRecomputeAt && nextRecomputeAt > now
    ? Math.ceil((nextRecomputeAt.getTime() - now.getTime()) / 60_000)
    : 0;

  // Premium gate
  if (!subLoading && !isPro) return <LockedEchanges />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mes échanges</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Dresseurs avec qui tu peux échanger des cartes
          </p>
        </div>
        <button
          onClick={handleRecompute}
          disabled={!canRecompute || recomputing}
          className="btn-gold shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {recomputing ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Calcul…
            </span>
          ) : canRecompute ? (
            "Actualiser"
          ) : (
            `${minutesLeft} min`
          )}
        </button>
      </div>

      {/* Rate limit info */}
      {!canRecompute && minutesLeft > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Prochain recalcul disponible dans {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Settings reminder */}
      <div className="mb-6 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/5 px-4 py-3 text-sm">
        <span className="text-[var(--text-secondary)]">Pour apparaître dans les échanges, </span>
        <a href="/settings/sharing" className="font-semibold text-[#E7BA76] underline">
          active le partage de ton classeur
        </a>
        <span className="text-[var(--text-secondary)]"> et ajoute tes doubles + liste de souhaits.</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7BA76] border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-[var(--text-tertiary)]">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <p className="text-lg font-semibold text-[var(--text-primary)]">Pas encore de match</p>
          <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
            Clique sur &quot;Actualiser&quot; pour chercher des dresseurs avec qui échanger,
            et assure-toi que ton classeur est partagé.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleRecompute}
              disabled={!canRecompute || recomputing}
              className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              Actualiser les échanges
            </button>
            <a
              href="/settings/sharing"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              Paramètres de partage
            </a>
          </div>
        </div>
      )}

      {/* Match list */}
      {!loading && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => {
            const avatarSrc = match.partner.avatarUrl ?? getDefaultAvatar(match.partner.id);
            return (
              <div
                key={match.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[#E7BA76]/50"
              >
                {/* Avatar */}
                <div className="relative h-12 w-12 shrink-0">
                  <Image
                    src={avatarSrc}
                    alt={match.partner.displayName}
                    fill
                    className="rounded-full object-cover ring-2 ring-[#E7BA76]/30"
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{match.partner.displayName}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span>Tu donnes: {match.youGiveCount} ({formatEuros(match.youGiveValueCents)})</span>
                    <span>Tu reçois: {match.youReceiveCount} ({formatEuros(match.youReceiveValueCents)})</span>
                  </div>
                  {/* Balance bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className="h-full rounded-full bg-[#E7BA76]"
                        style={{ width: `${Math.round(match.balanceScore * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                      {Math.round(match.balanceScore * 100)}%
                    </span>
                  </div>
                </div>

                {/* CTA */}
                {match.partner.slug ? (
                  <button
                    onClick={() => router.push(`/u/${match.partner.slug}`)}
                    className="btn-gold shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-black"
                  >
                    Voir
                  </button>
                ) : (
                  <span className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
                    Profil privé
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
