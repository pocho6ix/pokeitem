"use client";

import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useHideValues } from "@/components/ui/HideValuesContext";
import { fmtEUR } from "./constants";

interface InvestmentCompactCardProps {
  title: string;
  href: string;
  icon?: LucideIcon;
  iconColor?: string;
  previewImages?: string[];       // mini thumbnails instead of icon
  value?: number | null;
  count?: number | null;
  countLabel: string;
  loading: boolean;
}

// Smaller card for the bottom row of "Mes investissements" (Doubles /
// Wishlist). Either a colored icon OR a tiny preview image strip — not
// both. Keeps the height compact so the whole grid doesn't dominate
// the fold.

export function InvestmentCompactCard({
  title,
  href,
  icon: Icon,
  iconColor = "#60A5FA",
  previewImages,
  value,
  count,
  countLabel,
  loading,
}: InvestmentCompactCardProps) {
  const { hidden } = useHideValues();

  return (
    <Link
      href={href}
      aria-label={`${title}${count != null ? ` — ${count} ${countLabel}` : ""}`}
      className="group relative flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-all hover:border-white/30 hover:bg-[var(--bg-card-hover)] active:scale-[0.99]"
    >
      {/* Visual (icon OR preview images) */}
      {previewImages && previewImages.length > 0 ? (
        <div className="relative h-12 w-12 shrink-0">
          <div className="absolute bottom-0 left-0 h-12 w-8 -rotate-[8deg]">
            <Image
              src={previewImages[0]}
              alt=""
              fill
              sizes="32px"
              className="rounded-sm object-cover shadow-sm"
            />
          </div>
          <div className="absolute bottom-0 right-0 z-10 h-12 w-8 rotate-[8deg]">
            <Image
              src={previewImages[1] ?? previewImages[0]}
              alt=""
              fill
              sizes="32px"
              className="rounded-sm object-cover shadow-sm"
            />
          </div>
        </div>
      ) : Icon ? (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}22` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
      ) : null}

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        {loading ? (
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-[var(--bg-subtle)]" />
        ) : (
          <p className="text-xs tabular-nums text-[var(--text-secondary)]">
            {count != null
              ? `${count} ${countLabel}${
                  value != null
                    ? ` · ${hidden ? "••••" : fmtEUR(value)}`
                    : ""
                }`
              : "—"}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
