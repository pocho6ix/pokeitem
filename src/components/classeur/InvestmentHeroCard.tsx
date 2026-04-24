"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, TrendingUp } from "lucide-react";
import { useHideValues } from "@/components/ui/HideValuesContext";
import { fmtEUR } from "./constants";

interface InvestmentHeroCardProps {
  title: string;
  href: string;
  value: number | null;
  count: number | null;
  countLabel: string;
  trend?: number | null;              // € gain over the period (optional)
  previewImages: string[];
  previewLayout: "cards" | "items";
  loading: boolean;
}

// Large card used for the top row of "Mes investissements" (Cartes /
// Items). Renders a visual stack of the provided preview images in the
// bottom-right corner — "cards" fans 3 into a triangle, "items" shows 2
// with opposing tilts — matched with a bottom fade so the preview
// blends into the card surface.
//
// The trend line is optional: only rendered when a non-null number is
// passed. v1 doesn't wire a per-category P&L, so ClasseurView passes
// `null` — we keep the prop so we can light up the indicator the day
// the API grows per-category deltas without touching markup.

export function InvestmentHeroCard({
  title,
  href,
  value,
  count,
  countLabel,
  trend,
  previewImages,
  previewLayout,
  loading,
}: InvestmentHeroCardProps) {
  const { hidden } = useHideValues();

  return (
    <Link
      href={href}
      aria-label={`${title}${
        value != null && count != null ? ` — ${count} ${countLabel}` : ""
      }`}
      className="group relative flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-all hover:border-[#E7BA76]/50 hover:bg-[var(--bg-card-hover)] active:scale-[0.99]"
    >
      {/* Title + chevron */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* Value */}
      <div className="mt-3">
        {loading || value == null ? (
          <div className="h-7 w-24 animate-pulse rounded bg-[var(--bg-subtle)]" />
        ) : (
          <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
            {hidden ? (
              <span className="tracking-widest opacity-40">••••</span>
            ) : (
              fmtEUR(value)
            )}
          </p>
        )}
        {count != null && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {count} {countLabel}
          </p>
        )}
      </div>

      {/* Trend line (optional) */}
      {trend != null && !hidden && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-500">
          <TrendingUp className="h-3 w-3" />
          {trend >= 0 ? "+" : ""}
          {fmtEUR(trend)}
        </div>
      )}

      {/* Preview images — bottom-right corner. Items get a larger box
          than cards since product boxes read as smaller at equivalent
          dimensions (flatter aspect ratio + less visual density). */}
      {previewImages.length > 0 && (
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-0 right-0 ${
            previewLayout === "items"
              ? "h-36 w-48 sm:h-40 sm:w-56"
              : "h-24 w-32 sm:h-28 sm:w-36"
          }`}
        >
          {previewLayout === "cards" ? (
            <CardFan images={previewImages.slice(0, 3)} />
          ) : (
            <ItemPair images={previewImages.slice(0, 2)} />
          )}
          {/* Gradient fade into the card surface */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
        </div>
      )}
    </Link>
  );
}

// 3 cards fanned out: left tilted −8°, center upright on top, right +8°.
function CardFan({ images }: { images: string[] }) {
  const [a, b, c] = images;
  return (
    <>
      {a && (
        <div className="absolute bottom-1 right-16 h-24 w-16 -rotate-[10deg] sm:right-20 sm:h-28 sm:w-20">
          <Image
            src={a}
            alt=""
            fill
            sizes="80px"
            className="rounded-md object-cover shadow-md"
          />
        </div>
      )}
      {c && (
        <div className="absolute bottom-1 right-0 h-24 w-16 rotate-[10deg] sm:h-28 sm:w-20">
          <Image
            src={c}
            alt=""
            fill
            sizes="80px"
            className="rounded-md object-cover shadow-md"
          />
        </div>
      )}
      {b && (
        <div className="absolute bottom-2 right-8 z-10 h-24 w-16 sm:right-10 sm:h-28 sm:w-20">
          <Image
            src={b}
            alt=""
            fill
            sizes="80px"
            className="rounded-md object-cover shadow-lg"
          />
        </div>
      )}
    </>
  );
}

// 2 items side by side with opposing tilts. Larger than the card fan so
// product boxes stay visually dominant — keeps parity with the iEstims
// reference where the items tile reads "fuller" than the cards tile.
function ItemPair({ images }: { images: string[] }) {
  const [a, b] = images;
  return (
    <>
      {a && (
        <div className="absolute bottom-1 right-20 h-36 w-28 -rotate-[4deg] sm:right-24 sm:h-40 sm:w-32">
          <Image
            src={a}
            alt=""
            fill
            sizes="128px"
            className="rounded-md object-contain drop-shadow-md"
          />
        </div>
      )}
      {b && (
        <div className="absolute bottom-1 right-0 h-36 w-28 rotate-[4deg] sm:h-40 sm:w-32">
          <Image
            src={b}
            alt=""
            fill
            sizes="128px"
            className="rounded-md object-contain drop-shadow-md"
          />
        </div>
      )}
    </>
  );
}
