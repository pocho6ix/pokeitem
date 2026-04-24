"use client";

import { Eye, EyeOff } from "lucide-react";
import { useHideValues } from "@/components/ui/HideValuesContext";
import { ExportExcelButton } from "./ExportExcelButton";

// Top-of-screen bar for the Classeur: big title on the left, action
// icons on the right. We colocate the "mask values" eye here (it used
// to live inside PortfolioMiniStats which goes away in commit 3) so
// the control stays reachable after the refactor.

export function ClasseurHeader() {
  const { hidden, toggle } = useHideValues();

  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">
        Classeur
      </h1>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? "Afficher les valeurs" : "Masquer les valeurs"}
          title={hidden ? "Afficher les valeurs" : "Masquer les valeurs"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:border-white/30 hover:text-[var(--text-primary)] active:scale-95"
        >
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        <ExportExcelButton />
      </div>
    </header>
  );
}
