"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 0 stub — the old matchmaking grid (pre-computed TradeMatch rows,
// 10-minute recompute cooldown, cash-trade / unilateral variants) is gone.
// Phase 3 of the rewrite will replace this with a user-search experience
// feeding into the new per-profile trade calculator.
// ─────────────────────────────────────────────────────────────────────────────

export function EchangesPageClient() {
  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <ArrowLeftRight className="h-5 w-5 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Échanges</h1>
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-8 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          La recherche d&apos;échanges arrive bientôt
        </p>
        <p className="mt-2 max-w-md text-xs text-[var(--text-tertiary)]">
          On reconstruit la page : cherche un dresseur par pseudo, ouvre son profil,
          et le calculateur t&apos;affichera instantanément ce que vous pouvez acheter,
          vendre ou échanger.
        </p>
        <Link
          href="/profil/partage"
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          Gérer le partage de mon classeur
        </Link>
      </div>
    </div>
  );
}
