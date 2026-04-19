"use client";

import Image from "next/image";

/**
 * "EDITION 1" medallion overlaid on the card artwork whenever the user's
 * active version is `CardVersion.FIRST_EDITION` (4 WOTC base sets only).
 * Mirrors the circular stamp physically printed in the bottom-left of the
 * stat bar on genuine 1st-Edition WOTC cards.
 *
 * Positioned at bottom-[38%] left-[4%], which places it just below the
 * illustration box — matching where the real stamp sits on the printed card.
 * Wrapped in a thin white ring so it pops against the dark card artwork; the
 * inner logo occupies 94% of the disc (minimal padding), leaving just enough
 * white to read as a distinct stamp. The `size` prop scales the medallion
 * across thumbnail tiles and modal views.
 */
export function FirstEditionStamp({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  // Outer disc: total footprint on the card (slightly smaller than before).
  const DISC: Record<typeof size, string> = {
    xs: "h-3.5 w-3.5",
    sm: "h-5   w-5",
    md: "h-7   w-7",
    lg: "h-10  w-10",
  };
  return (
    <div
      className={`pointer-events-none absolute bottom-[38%] left-[4%] flex items-center justify-center rounded-full bg-white shadow-[0_0_3px_rgba(0,0,0,0.35)] ${DISC[size]} ${className}`}
    >
      <Image
        src="/images/badges/edition-1.png"
        alt="Édition 1"
        width={80}
        height={80}
        className="h-[94%] w-[94%] object-contain"
      />
    </div>
  );
}
