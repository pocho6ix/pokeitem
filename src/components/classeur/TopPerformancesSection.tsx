"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchApi } from "@/lib/api";
import { ProButton } from "@/components/subscription/ProButton";
import { GOLD } from "./constants";

// "Top performances du mois" — Top 6 cards whose market price has gained
// the most since the 1st of the current month. €/% toggle switches the
// ranking metric and the displayed delta. Pro-gated: free users see a
// locked placeholder with an upsell.
//
// Data pipeline:
//   • /api/portfolio/top-performances?mode=euro|percent
//   • Server joins UserCard to the most recent CardPriceHistory row
//     whose `recordedAt` is strictly before the 1st of this month, then
//     computes (priceNow − priceThen) per card and sorts.
//   • Only gainers are returned (losers are hidden by product decision).

type DisplayMode = "euro" | "percent";

interface TopPerformanceItem {
  userCardId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  cardImageUrl: string | null;
  serieSlug: string;
  blocSlug: string;
  priceNow: number;
  priceThen: number;
  deltaEuro: number;
  deltaPercent: number;
}

interface ApiResponse {
  locked: boolean;
  top: TopPerformanceItem[];
}

function formatEuro(n: number): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

function formatPercent(n: number): string {
  return `${n >= 10 ? n.toFixed(0) : n.toFixed(1)} %`;
}

export function TopPerformancesSection() {
  const { status } = useSession();
  const { isPro, isLoading: subLoading } = useSubscription();
  const [mode, setMode] = useState<DisplayMode>("euro");
  const [data, setData] = useState<TopPerformanceItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !isPro) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchApi(`/api/portfolio/top-performances?mode=${mode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ApiResponse | null) => {
        if (d) setData(d.top);
      })
      .finally(() => setLoading(false));
  }, [status, isPro, mode]);

  // Don't render for unauthenticated users (consistent with the chart).
  if (status !== "authenticated") return null;

  return (
    <section
      className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
      aria-label="Top performances du mois"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: GOLD }} />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Top performances du mois
          </h2>
        </div>

        {isPro && (
          <div
            role="tablist"
            aria-label="Mode d'affichage"
            className="flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5"
          >
            {(["euro", "percent"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === m
                    ? "text-black"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                style={mode === m ? { backgroundColor: GOLD } : undefined}
              >
                {m === "euro" ? "€" : "%"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {!subLoading && !isPro ? (
        <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-xl bg-[var(--bg-subtle)]">
          <p className="text-sm text-[var(--text-secondary)]">
            Classement réservé aux abonnés Pro
          </p>
          <ProButton size="md" />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl bg-[var(--bg-secondary)]"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--bg-secondary)] py-10 text-center">
          <Sparkles className="mb-2 h-6 w-6 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Aucune progression ce mois-ci
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Reviens plus tard, le classement se met à jour quotidiennement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {data.map((c) => (
            <Link
              key={c.userCardId}
              href={`/collection/cartes/${c.blocSlug}/${c.serieSlug}`}
              className="group flex flex-col items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2 transition-colors hover:border-[#E7BA76]/50 active:scale-[0.98]"
            >
              <div className="relative mb-1.5 aspect-[63/88] w-full overflow-hidden rounded-md bg-[var(--bg-subtle)]">
                {c.cardImageUrl ? (
                  <Image
                    src={c.cardImageUrl}
                    alt={c.cardName}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 30vw, 140px"
                  />
                ) : null}
              </div>
              <p
                className="line-clamp-1 w-full text-center text-[11px] font-medium text-[var(--text-primary)]"
                title={c.cardName}
              >
                {c.cardName}
              </p>
              <p
                className="mt-0.5 text-xs font-bold"
                style={{ color: "#4ade80" }}
              >
                {mode === "euro"
                  ? `+${formatEuro(c.deltaEuro)}`
                  : `+${formatPercent(c.deltaPercent)}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
