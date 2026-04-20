"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CardVersion } from "@/data/card-versions";
import { fetchApi } from "@/lib/api";

interface RemoveCardButtonProps {
  cardId: string;
  versions: CardVersion[];
}

export function RemoveCardButton({ cardId, versions }: RemoveCardButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  if (versions.length === 0) return null;

  async function handleRemove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi("/api/cards/collection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: versions.map((version) => ({ cardId, version })),
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      router.back();
      router.refresh();
    } catch {
      setError("Impossible de retirer la carte. Réessayez.");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-red-500/30 bg-[var(--bg-card)]">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors rounded-xl"
        >
          <Trash2 className="h-4 w-4" />
          Retirer de ma collection
        </button>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm text-[var(--text-primary)] text-center mb-3">
            Retirer cette carte de votre collection ?
          </p>
          {error && (
            <p className="text-xs text-red-400 text-center mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="flex-1 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Suppression…" : "Confirmer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
