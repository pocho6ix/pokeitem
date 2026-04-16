"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionTileProps {
  title: string;
  icon: LucideIcon;
  accentColor: string;
  count?: number;
  countLabel: string;
  value?: number | null;
  onPress?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
  teaserText?: string;
}

const formatValue = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

export function CollectionTile({
  title,
  icon: Icon,
  accentColor,
  count,
  countLabel,
  value,
  onPress,
  disabled = false,
  comingSoon = false,
  teaserText,
}: CollectionTileProps) {
  const isDisabled = disabled || comingSoon;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onPress?.();
    }
  };

  const metaText = () => {
    if (comingSoon && teaserText) return teaserText;
    if (count === undefined || count === null) return null;
    if (count === 0) return null;
    if (value != null) return `${count} ${countLabel} · ${formatValue(value)}`;
    return `${count} ${countLabel}`;
  };

  const meta = metaText();
  const isEmpty = !comingSoon && (count === undefined || count === 0);

  return (
    <div
      role={isDisabled ? "presentation" : "button"}
      tabIndex={isDisabled ? -1 : 0}
      aria-label={
        isDisabled
          ? title
          : `${title}${meta ? ` — ${meta}` : ""}`
      }
      onClick={isDisabled ? undefined : onPress}
      onKeyDown={handleKeyDown}
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col gap-3 transition-all duration-150",
        isDisabled
          ? "opacity-70 cursor-not-allowed"
          : "cursor-pointer hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] active:scale-[0.98]"
      )}
    >
      {/* Top row: icon + coming soon pill */}
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}1a` }}
        >
          <Icon
            size={22}
            strokeWidth={1.5}
            style={{ color: accentColor }}
          />
        </div>
        {comingSoon && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] border border-[var(--border-default)]">
            Bientôt
          </span>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
          {title}
        </p>
        {isEmpty ? (
          <p className="text-[13px] font-data tabular-nums text-[var(--text-tertiary)]">
            Aucun élément
          </p>
        ) : meta ? (
          <p className="text-[13px] font-data tabular-nums text-[var(--text-secondary)]">
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  );
}
