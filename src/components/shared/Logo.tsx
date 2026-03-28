"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "text";
}

const SIZES = {
  sm: { full: { w: 100, h: 30 }, icon: { w: 28, h: 28 } },
  md: { full: { w: 130, h: 38 }, icon: { w: 36, h: 36 } },
  lg: { full: { w: 180, h: 54 }, icon: { w: 48, h: 48 } },
};

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const dims = SIZES[size];

  return (
    <Link href="/" className={cn("flex items-center shrink-0", className)}>
      {variant === "full" ? (
        <>
          {/* Light mode: transparent bg logo */}
          <Image
            src="/logo-long.png"
            alt="PokeItem"
            width={dims.full.w}
            height={dims.full.h}
            className="h-auto rounded-lg dark:hidden"
            priority
          />
          {/* Dark mode: white bg logo */}
          <Image
            src="/logo-long-light.png"
            alt="PokeItem"
            width={dims.full.w}
            height={dims.full.h}
            className="h-auto hidden dark:block rounded-lg px-1"
            priority
          />
        </>
      ) : variant === "icon" ? (
        <Image
          src="/logo.png"
          alt="PokeItem"
          width={dims.icon.w}
          height={dims.icon.h}
          className="h-auto"
          priority
        />
      ) : (
        <div className="flex items-center font-extrabold tracking-tight">
          <span className="text-[var(--color-primary)]">POKE</span>
          <span className="text-[var(--color-accent)]">ITEM</span>
        </div>
      )}
    </Link>
  );
}
