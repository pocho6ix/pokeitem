"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** "icon" = logo only | "full" = logo + POKEITEM wordmark | "text" = wordmark only | "long" = horizontal logo image */
  variant?: "full" | "icon" | "text" | "long";
}

// ─── Size presets ─────────────────────────────────────────────────────────────

const ICON_SIZES = {
  sm: { px: 32, cls: "h-8 w-8" },
  md: { px: 40, cls: "h-10 w-10" },
  lg: { px: 56, cls: "h-14 w-14" },
};

const TEXT_SIZES = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const { px, cls } = ICON_SIZES[size];

  if (variant === "long") {
    return (
      <Link href="/" aria-label="PokeItem" className={cn("flex justify-center", className)}>
        <Image
          src="/logo-long.png"
          alt="PokeItem"
          width={240}
          height={60}
          className="object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2 shrink-0", className)}>
      {variant !== "text" && (
        <Image
          src="/logo.png"
          alt="PokeItem"
          width={px}
          height={px}
          className={cn(cls, "object-contain")}
          priority
        />
      )}

      {variant !== "icon" && (
        <span className={cn("font-extrabold tracking-tight leading-none", TEXT_SIZES[size])}>
          <span className="text-[#1B2E6B] dark:text-white">POKE</span>
          <span className="text-[#E7BA76]">ITEM</span>
        </span>
      )}
    </Link>
  );
}
