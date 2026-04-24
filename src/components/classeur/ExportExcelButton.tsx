"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { isNative } from "@/lib/native";
import { GOLD } from "./constants";

// CSV export trigger for the Classeur.
//
// Produces two files matching the templates the user defined:
//   • portefeuille_cartes.csv  (one line per userCard)
//   • portefeuille_items.csv   (one line per sealed portfolioItem)
//
// The button is web-only for now — Excel/Numbers are desktop workflows
// and Capacitor's WebView doesn't handle `<a download>` natively, so we
// hide the CTA on iOS rather than shipping a broken download there.
// Follow-up (out of scope): wire `@capacitor/filesystem` + `@capacitor/share`
// for a mobile-native flow if there's demand.
//
// Hit-target is 44×44px to honour iOS touch guidance (even though we
// hide the button there — the rule stays if we re-enable it later).

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give Chrome a beat before freeing the blob — otherwise the second
  // download in the sequence can race the first one being revoked.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportExcelButton() {
  const [loading, setLoading] = useState(false);

  // iOS users don't get the button — see rationale in the file header.
  if (isNative()) return null;

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchApi("/api/portfolio/export");
      if (!res.ok) throw new Error(`Export request failed (${res.status})`);
      const payload = (await res.json()) as {
        cartesCsv: string;
        itemsCsv: string;
        cardsCount: number;
        itemsCount: number;
      };

      if (payload.cardsCount === 0 && payload.itemsCount === 0) {
        alert("Ta collection est vide — rien à exporter pour l'instant.");
        return;
      }

      downloadCsv("portefeuille_cartes.csv", payload.cartesCsv);
      // Small delay so Chrome/Firefox don't collapse the second download
      // into a "multiple files" permission prompt.
      setTimeout(() => {
        downloadCsv("portefeuille_items.csv", payload.itemsCsv);
      }, 150);
    } catch (err) {
      console.error("[Classeur] Export CSV échoué", err);
      alert("L'export a échoué. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-label="Exporter en CSV"
      title="Exporter en CSV"
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
