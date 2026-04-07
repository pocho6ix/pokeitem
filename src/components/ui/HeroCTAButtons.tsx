"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSubscription } from "@/hooks/useSubscription";

export function HeroCTAButtons() {
  const { data: session, status } = useSession();
  const { isPro, betaTrialUsed, isLoading: subLoading, refresh } = useSubscription();
  const router = useRouter();

  const [standalone, setStandalone] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  async function activateTrial() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/beta/activate", { method: "POST" });
      if (res.status === 409) {
        // Already used — refresh subscription state
        await refresh();
        return;
      }
      if (!res.ok) throw new Error();
      setActivated(true);
      await refresh();
      setTimeout(() => router.push("/portfolio"), 1200);
    } catch {
      setError("Impossible d'activer. Réessaye.");
    } finally {
      setActivating(false);
    }
  }

  // Loading skeleton
  if (status === "loading" || (session && subLoading)) {
    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <div className="h-12 w-52 rounded-xl bg-white/20 animate-pulse" />
        <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (session) {
    const showBeta = !isPro && !betaTrialUsed;

    // PWA standalone: show direct activation button
    if (showBeta && standalone) {
      if (activated) {
        return (
          <div className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Pro activé ! Redirection…
          </div>
        );
      }
      return (
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={activateTrial}
            disabled={activating}
            className="inline-flex items-center justify-center rounded-xl bg-[#E7BA76] px-6 py-3.5 text-sm font-semibold text-black shadow-lg hover:bg-[#d4a660] transition-colors disabled:opacity-60"
          >
            {activating
              ? "Activation…"
              : "🎁 Activer et profiter de l'Accès Pro offert 1 semaine"}
          </button>
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Voir mon classeur
            <BookOpen className="ml-2 h-4 w-4" />
          </Link>
          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link
          href="/portfolio"
          className="inline-flex items-center justify-center rounded-xl bg-[#E7BA76] px-6 py-3 text-sm font-semibold text-black shadow-lg hover:bg-[#d4a660] transition-colors"
        >
          Voir mon classeur
          <BookOpen className="ml-2 h-4 w-4" />
        </Link>

        {showBeta ? (
          <Link
            href="/beta"
            className="inline-flex flex-col items-center justify-center rounded-xl border border-[#E7BA76]/50 bg-[#E7BA76]/10 px-6 py-2.5 text-sm font-semibold text-[#E7BA76] hover:bg-[#E7BA76]/20 transition-colors"
          >
            <span>🎁 Rejoins la bêta — 1 mois offert</span>
          </Link>
        ) : (
          <Link
            href="/collection/cartes"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Explorer le catalogue
          </Link>
        )}
      </div>
    );
  }

  // Unauthenticated
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-4">
      <Link
        href="/inscription"
        className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
      >
        Commencer gratuitement
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
      <Link
        href="/collection/cartes"
        className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        Explorer le catalogue
      </Link>
    </div>
  );
}
