"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** "icon" = card icon only | "full" = icon + POKEITEM wordmark | "text" = wordmark only */
  variant?: "full" | "icon" | "text";
}

// ─── Inline SVG icon — the new card+Pokéball logo ────────────────────────────

function PokeItemIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 160"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Card shape */}
      <rect x="6" y="6" width="108" height="148" rx="14" ry="14" fill="white" stroke="#1B2E6B" strokeWidth="7"/>

      {/* Pokéball — red top half */}
      <path d="M20 80 A40 40 0 0 1 100 80 Z" fill="#CC2222"/>
      {/* Pokéball — white bottom half */}
      <path d="M20 80 A40 40 0 0 0 100 80 Z" fill="white"/>
      {/* Pokéball outer ring */}
      <circle cx="60" cy="80" r="40" fill="none" stroke="#1B2E6B" strokeWidth="6"/>
      {/* Pokéball dividing line */}
      <line x1="20" y1="80" x2="100" y2="80" stroke="#1B2E6B" strokeWidth="6"/>
      {/* Center button */}
      <circle cx="60" cy="80" r="12" fill="white" stroke="#1B2E6B" strokeWidth="6"/>
      <circle cx="60" cy="80" r="5" fill="#1B2E6B"/>

      {/* Gap in top-right for the booster pack */}
      <path d="M82 46 A40 40 0 0 1 100 80" stroke="white" strokeWidth="9" fill="none"/>

      {/* Booster pack inserted into gap */}
      <g transform="translate(84,38) rotate(20)">
        {/* Pack body */}
        <rect x="0" y="0" width="22" height="30" rx="2" fill="#EEF0F8" stroke="#1B2E6B" strokeWidth="2"/>
        {/* Yellow top stripe */}
        <rect x="0" y="0" width="22" height="6" rx="2" fill="#F5C400" stroke="#1B2E6B" strokeWidth="1.5"/>
        {/* Serrated top notches */}
        {[2, 6, 10, 14, 18].map((x) => (
          <rect key={x} x={x} y={-1} width="2" height="2" rx="0.5" fill="#1B2E6B"/>
        ))}
        {/* Mini Pokéball */}
        <circle cx="11" cy="18" r="6" fill="white" stroke="#1B2E6B" strokeWidth="1.2"/>
        <path d="M5 18 A6 6 0 0 1 17 18 Z" fill="#CC2222"/>
        <line x1="5" y1="18" x2="17" y2="18" stroke="#1B2E6B" strokeWidth="1.2"/>
        <circle cx="11" cy="18" r="2" fill="white" stroke="#1B2E6B" strokeWidth="1"/>
        {/* SEALED label */}
        <text x="11" y="29" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="4" fontWeight="bold" fill="#1B2E6B">SEALED</text>
      </g>
    </svg>
  );
}

// ─── Size presets ─────────────────────────────────────────────────────────────

const ICON_SIZES = {
  sm: "h-8 w-6",
  md: "h-10 w-[30px]",
  lg: "h-14 w-[42px]",
};

const TEXT_SIZES = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 shrink-0", className)}>
      {variant !== "text" && (
        <PokeItemIcon className={ICON_SIZES[size]} />
      )}

      {variant !== "icon" && (
        <span className={cn("font-extrabold tracking-tight leading-none", TEXT_SIZES[size])}>
          <span className="text-[#1B2E6B] dark:text-white">POKE</span>
          <span className="text-[#CC2222]">ITEM</span>
        </span>
      )}
    </Link>
  );
}
