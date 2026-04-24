"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { fetchApi } from "@/lib/api";
import { isNative } from "@/lib/native";
import { GOLD } from "./constants";

// CSV export trigger for the Classeur.
//
// Bundles both CSVs (portefeuille_cartes + portefeuille_items) into a
// single ZIP. The previous "download twice with a setTimeout" approach
// worked for the first file but Chrome silently blocks the second as a
// "multiple automatic download" — the second call runs outside the
// user-gesture window. ZIP = one user-initiated download, one file to
// share on iOS, same UX everywhere.
//
// Delivery modes:
//   • Web  — Blob + anchor + <a download>.
//   • iOS  — Capacitor Filesystem writes the ZIP to Cache (as base64
//            since it's binary), then Share.share({ files: [uri] })
//            opens UIActivityViewController so the user can save to
//            Files, email, AirDrop, etc. The Files app unzips natively
//            via long-press → Decompress.

const ZIP_FILENAME = "portefeuille_pokeitem.zip";

function buildZip(cartesCsv: string, itemsCsv: string): Uint8Array {
  return zipSync(
    {
      "portefeuille_cartes.csv": strToU8(cartesCsv),
      "portefeuille_items.csv": strToU8(itemsCsv),
    },
    { level: 6 },
  );
}

function u8ToBase64(bytes: Uint8Array): string {
  // btoa() takes a binary string, not UTF-8 — so we build one char per
  // byte. Chunked to avoid blowing up the call stack on large payloads.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(binary);
}

function downloadBlobWeb(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareZipNative(filename: string, bytes: Uint8Array): Promise<void> {
  // Dynamic imports — the plugins only load inside the Capacitor shell,
  // keeping the web bundle clean.
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  // Binary writeFile on iOS expects base64 (no `encoding` field).
  await Filesystem.writeFile({
    path: filename,
    data: u8ToBase64(bytes),
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path: filename,
  });

  await Share.share({
    title: "Mon portefeuille PokéItem",
    dialogTitle: "Exporter mon portefeuille",
    files: [uri],
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

      const zipBytes = buildZip(payload.cartesCsv, payload.itemsCsv);

      if (isNative()) {
        await shareZipNative(ZIP_FILENAME, zipBytes);
      } else {
        downloadBlobWeb(ZIP_FILENAME, zipBytes);
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
