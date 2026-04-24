"use client";

import { useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { GOLD } from "./constants";

// "Top performances du mois" — placeholder surface for the v1 ship.
//
// We don't have an API for per-card monthly deltas yet. The brief
// explicitly accepted an empty state here: when that endpoint lands,
// plug it in and this component becomes the view layer. Until then the
// section is visible but shows a clear "nothing to show" message so
// users don't wonder if it's loading.
//
// The €/% toggle is wired to local state only — it's a visual preview
// of the interaction so the control is in place the day we have data.

type DisplayMode = "euro" | "percent";

export function TopPerformancesSection() {
  const [mode, setMode] = useState<DisplayMode>("euro");

  return (
    <section
      className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
      aria-label="Top performances du mois"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: GOLD }} />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Top performances du mois
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Mode d'affichage"
          className="flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "euro"}
            onClick={() => setMode("euro")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "euro"
                ? "text-black"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={mode === "euro" ? { backgroundColor: GOLD } : undefined}
          >
            €
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "percent"}
            onClick={() => setMode("percent")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "percent"
                ? "text-black"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={mode === "percent" ? { backgroundColor: GOLD } : undefined}
          >
            %
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--bg-secondary)] py-10 text-center">
        <Sparkles className="mb-2 h-6 w-6 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          Aucune donnée de performance disponible
        </p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Les top performances seront disponibles prochainement.
        </p>
      </div>
    </section>
  );
}
