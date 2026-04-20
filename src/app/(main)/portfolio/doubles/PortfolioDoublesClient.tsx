"use client";

import { useEffect, useState } from "react";
import { HeroSearchBar } from "@/components/ui/HeroSearchBar";
import { CollectionValue } from "@/components/collection/CollectionValue";
import {
  BlocSerieDoublesList,
  type DoublesBloc,
} from "@/components/cards/BlocSerieDoublesList";
import { fetchApi } from "@/lib/api";

export function PortfolioDoublesClient() {
  const [blocs, setBlocs] = useState<DoublesBloc[]>([]);
  const [totalDistinct, setTotalDistinct] = useState(0);
  const [totalSeries, setTotalSeries] = useState(0);
  const [totalExtraCopies, setTotalExtraCopies] = useState(0);
  const [totalExtraValue, setTotalExtraValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi("/api/cards/doubles");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;

        const rows: Array<{
          cardId: string;
          version: string;
          _count: { _all: number };
        }> = data.doubles ?? [];
        // TODO(backend): return joined card data (serie/bloc/price) so we
        // can render the per-serie breakdown + value. For now, surface the
        // raw totals so the page still loads.
        setTotalDistinct(rows.length);
        setTotalSeries(0);
        setTotalExtraCopies(rows.reduce((sum, r) => sum + (r._count._all - 1), 0));
        setTotalExtraValue(0);
        setBlocs([]);
      } catch (err) {
        console.error("portfolio/doubles load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="mb-4 max-w-xl">
        <HeroSearchBar ownedOnly />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
            Cartes en doublon
          </p>
          <p className="mt-0.5 font-data text-2xl font-bold text-blue-700 dark:text-blue-300">
            {totalDistinct}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Extensions concernées
          </p>
          <p className="mt-0.5 font-data text-2xl font-bold text-[var(--text-primary)]">
            {totalSeries}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Valeur des surplus
          </p>
          <CollectionValue
            value={totalExtraValue}
            className="mt-0.5 block font-data text-2xl font-bold text-emerald-700 dark:text-emerald-300"
          />
          <p className="mt-0.5 text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
            {totalExtraCopies} copie{totalExtraCopies > 1 ? "s" : ""} en surplus
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">
          Chargement…
        </div>
      ) : (
        <BlocSerieDoublesList blocs={blocs} />
      )}
    </>
  );
}
