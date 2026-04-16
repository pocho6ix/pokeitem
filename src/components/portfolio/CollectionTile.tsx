"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionTileProps {
  title: string;
  icon: LucideIcon;
  imageUrl?: string;          // si fourni, remplace l'icône Lucide
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
  imageUrl,
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
      aria-label={isDisabled ? title : `${title}${meta ? ` — ${meta}` : ""}`}
      onClick={isDisabled ? undefined : onPress}
      onKeyDown={handleKeyDown}
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-150",
        isDisabled
          ? "opacity-70 cursor-not-allowed"
          : "cursor-pointer hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] active:scale-[0.99]"
      )}
    >
      {/* Icon or image */}
      <div
        className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: imageUrl ? "transparent" : `${accentColor}1a` }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={40}
            height={40}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <Icon size={20} strokeWidth={1.5} style={{ color: accentColor }} />
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
          {title}
        </p>
        {isEmpty ? (
          <p className="text-[12px] font-data tabular-nums text-[var(--text-tertiary)] mt-0.5">
            Aucun élément
          </p>
        ) : meta ? (
          <p className="text-[12px] font-data tabular-nums text-[var(--text-secondary)] mt-0.5">
            {meta}
          </p>
        ) : null}
      </div>

      {/* Right side: coming-soon pill OR chevron */}
      {comingSoon ? (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] border border-[var(--border-default)]">
          Bientôt
        </span>
      ) : (
        <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-[var(--text-tertiary)]" />
      )}
    </div>
  );
}
