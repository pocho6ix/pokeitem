"use client";
import { ITEM_TYPE_LABELS } from "@/lib/constants";

interface ItemBadgeProps {
  type: string;
  className?: string;
}

export function ItemBadge({ type, className = "" }: ItemBadgeProps) {
  const label = ITEM_TYPE_LABELS[type] ?? type;
  return (
    <span
      className={`badge-gold inline-flex items-center rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none ${className}`}
    >
      {label}
    </span>
  );
}
