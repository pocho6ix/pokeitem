"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSubscription } from "@/hooks/useSubscription";

export function HeroCTAButtons() {
  const { data: session, status } = useSession();
  const { isPro, betaTrialUsed, isLoading: subLoading } = useSubscription();

  // Show skeleton while session or subscription is loading
  if (status === "loading" || (session && subLoading)) {
    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <div className="h-12 w-52 rounded-xl bg-white/20 animate-pulse" />
        <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (session) {
    // Show beta button only if not Pro and never used the trial
    const showBeta = !isPro && !betaTrialUsed;

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
            <span>🎁 1 mois offert — Rejoins la bêta</span>
            <span className="text-[10px] font-normal text-[#E7BA76]/70 mt-0.5">
              Résiliable à tout moment
            </span>
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
