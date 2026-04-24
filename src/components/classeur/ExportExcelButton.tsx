"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { GOLD } from "./constants";

// Stubbed Excel export trigger.
//
// The actual generation (template + xlsx lib + download/share sheet)
// will land in a follow-up — for now this button just logs the intent
// and flashes a loading state so the hit-target and visual flow can be
// verified end-to-end.
//
// Hit-target is 44×44px to meet iOS accessibility guidance on the
// Capacitor build.

export function ExportExcelButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    console.log("[Classeur] Export Excel demandé");
    // TODO: générer le fichier .xlsx avec les données du portefeuille
    //   - template à définir
    //   - xlsx / exceljs / sheetjs côté JS
    //   - trigger download (web) ou Share sheet (iOS Capacitor)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-label="Exporter en Excel"
      title="Exporter en Excel"
      disabled={loading}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] transition-colors hover:border-[#E7BA76]/60 hover:bg-[#E7BA76]/10 active:scale-95 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
      ) : (
        <FileDown className="h-5 w-5" style={{ color: GOLD }} />
      )}
    </button>
  );
}
