import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PerfBadgeProps {
  value: number; // percentage, e.g. 15.6
  showAbsolute?: boolean;
  absoluteValue?: number;
  className?: string;
}

export function PerfBadge({ value, className = "" }: PerfBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const colorClass = isPositive ? "trend-up" : isNegative ? "trend-down" : "trend-stable";
  const sign = isPositive ? "+" : isNegative ? "−" : "";
  const absValue = Math.abs(value);
  // Format with 1 decimal, fr-FR style (comma)
  const formatted = absValue.toFixed(1).replace(".", ",");

  return (
    <span
      className={`font-data inline-flex items-center gap-0.5 text-[13px] font-medium whitespace-nowrap ${colorClass} ${className}`}
    >
      {isPositive && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
      {isNegative && <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
      {sign}{formatted} %
    </span>
  );
}
