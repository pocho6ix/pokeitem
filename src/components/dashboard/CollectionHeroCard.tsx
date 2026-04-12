"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus } from "lucide-react";

const LS_KEY = "pokeitem_hide_value";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Lightweight SVG sparkline (no Recharts) ───────────────────────────────────

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100;
  const H = 100;

  // Map values to SVG coordinates with 10% top padding
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H * 0.85 - H * 0.07;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePts = pts.join(" ");
  const areaPts = `0,${H} ${linePts} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#heroFill)" />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  total: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

export function CollectionHeroCard({ total }: Props) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [chartValues, setChartValues] = useState<number[]>([]);
  const [change24h, setChange24h] = useState<number | null>(null);

  // Restore visibility preference
  useEffect(() => {
    if (localStorage.getItem(LS_KEY) === "true") setHidden(true);
  }, []);

  const toggleHidden = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      localStorage.setItem(LS_KEY, String(next));
      return next;
    });
  }, []);

  // Fetch 7-day chart data for sparkline + 24h change
  useEffect(() => {
    fetch("/api/portfolio/chart?period=7J")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.data?.length) return;
        const points: ChartPoint[] = json.data;
        setChartValues(points.map((p) => p.value));

        // Find point closest to 24h ago
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        let bestIdx = 0;
        let bestDiff = Infinity;
        points.forEach((p, i) => {
          const diff = Math.abs(new Date(p.date).getTime() - yesterday);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          }
        });

        const v24ago = points[bestIdx]?.value;
        if (v24ago && v24ago > 0) {
          setChange24h(((total - v24ago) / v24ago) * 100);
        }
      })
      .catch(() => {});
  }, [total]);

  const isUp = change24h === null ? null : change24h >= 0;
  const changeColor =
    isUp === null ? "#9CA3AF" : isUp ? "#4ade80" : "#ef4444";
  const chartColor =
    isUp === null ? "#E7BA76" : isUp ? "#4ade80" : "#ef4444";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
      {/* Background sparkline — strictly contained via overflow-hidden on parent */}
      {chartValues.length > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 opacity-40"
          style={{ height: "55%" }}
          aria-hidden
        >
          <MiniSparkline values={chartValues} color={chartColor} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 px-5 pb-6 pt-5">
        {/* Row 1: label + eye + 24h change */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              Collection total
            </span>
            <button
              onClick={toggleHidden}
              aria-label={hidden ? "Afficher la valeur" : "Masquer la valeur"}
              className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
            >
              {hidden ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {change24h !== null && (
            <span className="text-xs font-medium" style={{ color: changeColor }}>
              {hidden
                ? "*** %"
                : `${isUp ? "+" : ""}${change24h.toFixed(2)} % (24h)`}
            </span>
          )}
        </div>

        {/* Row 2: value + Ajouter button */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 font-data text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {hidden ? (
              <span className="tracking-widest opacity-40">••••••••</span>
            ) : (
              fmt(total)
            )}
          </p>

          <button
            onClick={() => router.push("/collection/cartes")}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
              boxShadow: "0 2px 8px rgba(183,135,40,0.35)",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
