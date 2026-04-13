"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus } from "lucide-react";
import { useHideValues } from "@/components/ui/HideValuesContext";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Interpolation — densify sparse data points to targetCount ─────────────────

function interpolateValues(values: number[], targetCount = 42): number[] {
  if (values.length >= targetCount || values.length < 2) return values;
  const result: number[] = [];
  const totalSegments = targetCount - 1;
  for (let i = 0; i < totalSegments; i++) {
    const t = i / totalSegments;
    const srcIdx = t * (values.length - 1);
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, values.length - 1);
    const frac = srcIdx - lo;
    result.push(values[lo] + (values[hi] - values[lo]) * frac);
  }
  result.push(values[values.length - 1]);
  return result;
}

// ── Monotone cubic Bézier path (Fritsch-Carlson) ──────────────────────────────
// Produces a smooth SVG path that passes through every point without oscillation.

type Pt = [number, number];

function monotoneCubicPath(pts: Pt[]): string {
  const n = pts.length;
  if (n < 2) return "";

  // Slopes between consecutive points
  const dx = pts.map((p, i) => (i < n - 1 ? pts[i + 1][0] - p[0] : 0));
  const dy = pts.map((p, i) => (i < n - 1 ? pts[i + 1][1] - p[1] : 0));
  const slopes = dx.map((d, i) => (d ? dy[i] / d : 0));

  // Tangents initialised with average of neighbouring slopes
  const m: number[] = new Array(n).fill(0);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  // Enforce monotonicity (Fritsch-Carlson step)
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      m[i] = m[i + 1] = 0;
    } else {
      const a = m[i] / slopes[i];
      const b = m[i + 1] / slopes[i];
      const r = Math.sqrt(a * a + b * b);
      if (r > 3) {
        m[i] = (3 * a * slopes[i]) / r;
        m[i + 1] = (3 * b * slopes[i]) / r;
      }
    }
  }

  // Build SVG path string
  let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dxi = x1 - x0;
    const cp1x = x0 + dxi / 3;
    const cp1y = y0 + (m[i] * dxi) / 3;
    const cp2x = x1 - dxi / 3;
    const cp2y = y1 - (m[i + 1] * dxi) / 3;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return d;
}

// ── Smooth SVG sparkline ──────────────────────────────────────────────────────

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const dense = interpolateValues(values, 42);
  if (dense.length < 2) return null;

  const min = Math.min(...dense);
  const max = Math.max(...dense);
  const range = max - min || 1;
  const W = 100;
  const H = 100;
  const PAD_TOP = 0.12; // 12 % top padding so line isn't clipped
  const PAD_BTM = 0.05; // 5 % bottom padding

  const toSvg = (v: number): number =>
    H - PAD_BTM * H - ((v - min) / range) * H * (1 - PAD_TOP - PAD_BTM);

  const pts: Pt[] = dense.map((v, i) => [
    (i / (dense.length - 1)) * W,
    toSvg(v),
  ]);

  const linePath = monotoneCubicPath(pts);
  // Close area: drop to bottom-left, then bottom-right, back to start
  const areaPath =
    linePath +
    ` L ${W.toFixed(2)},${H} L 0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkHeroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill="url(#sparkHeroFill)" />
      {/* Smooth line */}
      <path
        d={linePath}
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

// ── Period selection based on account age ─────────────────────────────────────

type Period = "7J" | "1M" | "3M" | "6M" | "1A" | "MAX";

function getPeriodFromFirstCard(firstCardDate: string | null): { period: Period; label: string } {
  if (!firstCardDate) return { period: "1M", label: "30j" };
  const ageMs = Date.now() - new Date(firstCardDate).getTime();
  const days  = ageMs / (1000 * 60 * 60 * 24);
  if (days < 7)   return { period: "7J",  label: "7j"  };
  if (days < 30)  return { period: "1M",  label: "30j" };
  if (days < 90)  return { period: "3M",  label: "3M"  };
  if (days < 180) return { period: "6M",  label: "6M"  };
  if (days < 365) return { period: "1A",  label: "1A"  };
  return              { period: "MAX", label: "max" };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  total: number;
  firstCardDate: string | null;
}

interface ChartPoint {
  date: string;
  value: number;
}

export function CollectionHeroCard({ total, firstCardDate }: Props) {
  const router = useRouter();
  const { hidden, toggle: toggleHidden } = useHideValues();
  const [chartValues, setChartValues] = useState<number[]>([]);
  const [changePercent, setChangePercent] = useState<number | null>(null);

  const { period, label } = getPeriodFromFirstCard(firstCardDate);

  useEffect(() => {
    fetch(`/api/portfolio/chart?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.data?.length) return;
        const points: ChartPoint[] = json.data;
        setChartValues(points.map((p) => p.value));

        // First point = reference value at start of period
        const firstValue = points[0]?.value;
        if (firstValue && firstValue > 0) {
          setChangePercent(((total - firstValue) / firstValue) * 100);
        }
      })
      .catch(() => {});
  }, [total, period]);

  const isUp = changePercent === null ? null : changePercent >= 0;
  const changeColor =
    isUp === null ? "#9CA3AF" : isUp ? "#4ade80" : "#ef4444";
  const chartColor =
    isUp === null ? "#E7BA76" : isUp ? "#4ade80" : "#ef4444";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
      {/* Background sparkline — contained by overflow-hidden on parent */}
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
      <div className="relative z-10 px-5 pb-10 pt-6">
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

          {changePercent !== null && (
            <span className="text-xs font-medium" style={{ color: changeColor }}>
              {hidden
                ? "*** %"
                : `${isUp ? "+" : ""}${changePercent.toFixed(2)} % (${label})`}
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
