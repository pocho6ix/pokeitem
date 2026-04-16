"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { useSubscription } from "@/hooks/useSubscription";
import { shareProfile } from "@/lib/share/shareProfile";

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
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{ background: "rgba(231,186,118,0.12)", border: "1.5px solid rgba(231,186,118,0.3)" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E7BA76" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
      </div>

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
  const [referralLink, setReferralLink] = useState<string | null>(null);

  // Clock tick every second for live countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000);
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

  // Fetch referral link once
  useEffect(() => {
    fetch("/api/referral/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.referralLink) setReferralLink(data.referralLink); })
      .catch(() => {});
  }, []);

  const canRecompute = !nextRecomputeAt || nextRecomputeAt <= now;

  // Countdown string
  const msLeft = nextRecomputeAt && nextRecomputeAt > now
    ? nextRecomputeAt.getTime() - now.getTime()
    : 0;
  const minutesLeft = Math.floor(msLeft / 60_000);
  const secondsLeft = Math.floor((msLeft % 60_000) / 1_000);
  const countdownStr = msLeft > 0
    ? `${minutesLeft}min ${String(secondsLeft).padStart(2, "0")}s`
    : "";

  async function handleRecompute() {
    if (recomputing) return;

    if (!canRecompute) {
      toast(`Réessaie dans ${countdownStr}`, "info");
      return;
    }

    setRecomputing(true);
    try {
      const res = await fetch("/api/trade-matches/recompute", { method: "POST" });
      const data = await res.json();

      if (res.status === 429) {
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

  // Premium gate
  if (!subLoading && !isPro) return <LockedEchanges />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Échanges possibles</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Dresseurs avec qui tu peux faire un échange équilibré
          </p>
        </div>
        {/* Recompute button */}
        {canRecompute ? (
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="btn-gold shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {recomputing ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Calcul…
              </span>
            ) : (
              "↻ Actualiser"
            )}
          </button>
        ) : (
          <button
            onClick={handleRecompute}
            className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"
          >
            ⏱ {countdownStr}
          </button>
        )}
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[var(--bg-secondary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-[var(--bg-secondary)]" />
                  <div className="h-3 w-24 rounded bg-[var(--bg-secondary)]" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="h-16 rounded-xl bg-[var(--bg-secondary)]" />
                <div className="h-16 rounded-xl bg-[var(--bg-secondary)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Illustration */}
          <div className="mb-6 flex items-center gap-3 opacity-30">
            <div className="h-20 w-14 rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-secondary)]" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div className="h-20 w-14 rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-secondary)]" />
          </div>

          <p className="text-lg font-semibold text-[var(--text-primary)]">Aucun échange équilibré pour l&apos;instant</p>
          <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
            Tes doubles et ta wishlist ne matchent pas encore avec d&apos;autres dresseurs. Reviens plus tard ou élargis ta liste de souhaits.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => router.push("/portfolio/souhaits")}
              className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold text-black"
            >
              Aller à ma wishlist
            </button>
            <button
              onClick={() => {
                const link = referralLink ?? "https://app.pokeitem.fr";
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: "Pokéitem", url: link }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(link).then(
                    () => toast("Lien de parrainage copié !", "success"),
                    () => toast("Impossible de copier", "error"),
                  );
                }
              }}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              Inviter un ami
            </button>
          </div>

          {/* Onboarding */}
          <div className="mt-6 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/5 px-4 py-3 text-sm max-w-sm text-left">
            <span className="text-[var(--text-secondary)]">Pour trouver des échanges, </span>
            <a href="/settings/sharing" className="font-semibold text-[#E7BA76] underline">active le partage</a>
            <span className="text-[var(--text-secondary)]"> et ajoute tes doubles + liste de souhaits.</span>
          </div>
        </div>
      )}

      {/* Match list */}
      {!loading && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => {
            const avatarSrc = match.partner.avatarUrl ?? getDefaultAvatar(match.partner.id);
            const deltaCents = match.youReceiveValueCents - match.youGiveValueCents;
            return (
              <div
                key={match.id}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative h-12 w-12 shrink-0">
                    <Image
                      src={avatarSrc}
                      alt={match.partner.displayName}
                      fill
                      className="rounded-full object-cover ring-2 ring-[#E7BA76]/30"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{match.partner.displayName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      📊 {Math.round(match.balanceScore * 100)}% équilibré
                      {deltaCents !== 0 && ` · delta ${deltaCents > 0 ? "+" : ""}${(deltaCents / 100).toFixed(2).replace(".", ",")}€`}
                    </p>
                  </div>

                  {match.partner.slug ? (
                    <button
                      onClick={() => router.push(`/u/${match.partner.slug}`)}
                      className="btn-gold shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-black"
                    >
                      Voir →
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
                      Privé
                    </span>
                  )}
                </div>

                {/* Two columns */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
                    <p className="text-[var(--text-tertiary)] mb-1">Tu donnes</p>
                    <p className="font-semibold text-[var(--text-primary)]">{match.youGiveCount} cartes</p>
                    <p className="text-[var(--text-secondary)]">{formatEuros(match.youGiveValueCents)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
                    <p className="text-[var(--text-tertiary)] mb-1">Tu reçois</p>
                    <p className="font-semibold text-[var(--text-primary)]">{match.youReceiveCount} cartes</p>
                    <p className="text-[var(--text-secondary)]">{formatEuros(match.youReceiveValueCents)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
