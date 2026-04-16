"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

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
  /** Si true, la tuile est verrouillée pour les utilisateurs FREE */
  premium?: boolean;
}

const formatValue = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

const GOLD_GRADIENT = "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)";

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
  premium = false,
}: CollectionTileProps) {
  const router = useRouter();
  const { isPro } = useSubscription();
  const isLocked = premium && !isPro;
  const isDisabled = disabled || comingSoon;

  const handleClick = () => {
    if (isDisabled) return;
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    onPress?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
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
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={`${title}${meta ? ` — ${meta}` : ""}`}
      onClick={isDisabled ? undefined : handleClick}
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
        className={cn(
          "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center overflow-hidden",
          imageUrl ? "bg-white" : ""
        )}
        style={imageUrl ? undefined : { backgroundColor: `${accentColor}1a` }}
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

      {/* Right side: coming-soon pill | PREMIUM badge | chevron */}
      {comingSoon ? (
        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] border border-[var(--border-default)]">
          Bientôt
        </span>
      ) : isLocked ? (
        <span
          className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide"
          style={{ background: GOLD_GRADIENT, color: "#1A1A1A" }}
        >
          ★ PREMIUM
        </span>
      ) : (
        <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-[var(--text-tertiary)]" />
      )}
    </div>
  );
}
