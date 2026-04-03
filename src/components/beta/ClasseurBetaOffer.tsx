"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function ClasseurBetaOffer() {
  const { isPro, betaTrialUsed, isLoading } = useSubscription();

  if (isLoading || isPro || betaTrialUsed) return null;

  return (
    <Link
      href="/beta"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E7BA76]/40 bg-[#E7BA76]/8 px-4 py-3 hover:border-[#E7BA76]/60 hover:bg-[#E7BA76]/12 transition-colors"
      style={{ backgroundColor: "rgba(231,186,118,0.06)" }}
    >
      <Gift className="h-5 w-5 shrink-0 text-[#E7BA76]" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#E7BA76]">
          🎁 2 semaines offertes — Rejoins la bêta
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          Accès Pro complet · Résiliable à tout moment
        </p>
      </div>
      <span className="shrink-0 text-xs text-[#E7BA76]/60">→</span>
    </Link>
  );
}
