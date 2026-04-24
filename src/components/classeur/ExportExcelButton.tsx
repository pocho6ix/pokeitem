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
// Two delivery modes based on runtime:
//   • Web  — Blob + anchor + <a download>, twice with a 150ms gap to
//            sidestep browser multi-file permission prompts.
//   • iOS  — Capacitor Filesystem writes both CSVs to the Cache dir,
//            then Share.share({ files: [...] }) opens the native
//            UIActivityViewController so the user can save to Files,
//            email, AirDrop, etc. All in a single share sheet.
//
// Hit-target is 44×44px to honour iOS touch guidance.

function downloadCsvWeb(filename: string, content: string): void {
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

async function shareCsvsNative(
  cartesCsv: string,
  itemsCsv: string,
): Promise<void> {
  // Dynamic imports — the plugins only load inside the Capacitor shell,
  // keeping the web bundle clean.
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const files = [
    { name: "portefeuille_cartes.csv", data: cartesCsv },
    { name: "portefeuille_items.csv", data: itemsCsv },
  ];

  const uris: string[] = [];
  for (const f of files) {
    await Filesystem.writeFile({
      path: f.name,
      data: f.data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: f.name,
    });
    uris.push(uri);
  }

  // UIActivityViewController handles "Save to Files", Mail, AirDrop,
  // WhatsApp, etc. all in one sheet when `files` is an array.
  await Share.share({
    title: "Mon portefeuille PokéItem",
    dialogTitle: "Exporter mon portefeuille",
    files: uris,
  });
}

export function ExportExcelButton() {
  const [loading, setLoading] = useState(false);

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

      if (isNative()) {
        await shareCsvsNative(payload.cartesCsv, payload.itemsCsv);
      } else {
        downloadCsvWeb("portefeuille_cartes.csv", payload.cartesCsv);
        // Small delay so Chrome/Firefox don't collapse the second
        // download into a "multiple files" permission prompt.
        setTimeout(() => {
          downloadCsvWeb("portefeuille_items.csv", payload.itemsCsv);
        }, 150);
      }
    } catch (err) {
      // `AbortError` fires on iOS when the user dismisses the share
      // sheet — that's not a failure, stay quiet.
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("cancel"))
      ) {
        return;
      }
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
