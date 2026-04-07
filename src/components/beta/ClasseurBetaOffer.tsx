"use client";

import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";

export function ClasseurBetaOffer() {
  const { isPro, betaTrialUsed, isLoading } = useSubscription();

  if (isLoading || isPro || betaTrialUsed) return null;

  return (
    <Link
      href="/beta"
      className="mb-6 flex items-center justify-between rounded-full px-5 py-3 transition-all hover:brightness-110 active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
        boxShadow: '0 2px 12px rgba(191, 149, 63, 0.3)',
      }}
    >
      <p className="text-sm font-bold tracking-wide" style={{ color: '#1A1A1A' }}>
        🎁 Rejoins la bêta — 1 mois offert
      </p>
      <span className="shrink-0 text-sm font-bold" style={{ color: '#1A1A1A' }}>→</span>
    </Link>
  );
}
