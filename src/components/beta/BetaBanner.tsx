"use client";

import { useState, useEffect } from "react";
import { X, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const SESSION_KEY = "betaBannerDismissed";

type CheckoutState = "idle" | "loading" | "fallback" | "error";

export function BetaBanner() {
  const { isPro, isTrialing, betaTrialUsed, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");

  // Read sessionStorage on mount
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    setDismissed(wasDismissed);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  async function handleSubscribe() {
    setCheckoutState("loading");
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "annual", betaDiscount: true }),
      });
      if (!res.ok) {
        setCheckoutState("fallback");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutState("fallback");
      }
    } catch {
      setCheckoutState("fallback");
    }
  }

  // Don't render if loading, dismissed, or not eligible
  if (isLoading) return null;
  if (dismissed) return null;
  // Only show for beta testers (used the trial), not for regular free users
  if (!betaTrialUsed) return null;
  // Don't show for paying subscribers
  if (isPro && !isTrialing) return null;

  const isExpired = betaTrialUsed && !isPro;
  const isActive = betaTrialUsed && isTrialing;

  if (!isExpired && !isActive) return null;

  return (
    <div
      className={`relative border-b px-4 py-3 ${
        isExpired
          ? "border-orange-500/30 bg-orange-500/10"
          : "border-[#E7BA76]/30 bg-[#E7BA76]/8"
      }`}
      style={isActive ? { backgroundColor: "rgba(231,186,118,0.06)" } : undefined}
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {isExpired ? (
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          ) : (
            <Zap className="h-4 w-4 text-[#E7BA76]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isExpired ? (
            <>
              <p className="text-sm font-semibold text-orange-400">
                ⚠️ Ton essai bêta a expiré
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Continue avec Pro à{" "}
                <span className="font-bold text-orange-300">29,99€/an</span>{" "}
                <span className="line-through opacity-60">39,99€</span> — ou{" "}
                3,99€/mois
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#E7BA76]">
                ⭐ Offre bêta — 29,99€/an au lieu de 39,99€
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                37% d&rsquo;économie · Résiliable à tout moment
              </p>
            </>
          )}

          {/* CTA row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {checkoutState === "fallback" ? (
              <a
                href={`mailto:contact@pokeitem.fr?subject=${encodeURIComponent(
                  "Offre bêta — je souhaite m'abonner"
                )}`}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E7BA76] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#d4a660] transition-colors"
              >
                Me prévenir quand c&rsquo;est disponible
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={checkoutState === "loading"}
                className="beta-sub-gold rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 disabled:opacity-60"
              >
                <span className="relative z-10" style={{ color: '#1A1A1A' }}>
                  {checkoutState === "loading"
                    ? "Chargement…"
                    : "S'abonner à 29,99€/an"}
                </span>
                <style jsx>{`
                  .beta-sub-gold {
                    background: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
                    box-shadow: 0 2px 8px rgba(191, 149, 63, 0.25);
                    position: relative;
                    overflow: hidden;
                  }
                `}</style>
              </button>
            )}
            <span className="text-[10px] text-[var(--text-tertiary)]">
              ou 3,99€/mois
            </span>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
