"use client";

import Image from "next/image";

/**
 * "EDITION 1" medallion overlaid on the card artwork for every card with
 * `isFirstEdition: true`. Mirrors the circular stamp physically printed in
 * the bottom-left of the stat bar on genuine 1st-Edition WOTC cards.
 *
 * Positioned at bottom-[38%] left-[7%], which places it just below the
 * illustration box — matching where the real stamp sits on the printed card.
 * The `size` prop scales the medallion so it stays proportional across
 * thumbnail tiles and larger modal views.
 */
export function FirstEditionStamp({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  // Tailwind class bundle per preset. Kept tight so it can't fight with the
  // card's own aspect ratio — the medallion is always a circle anchored to
  // the image corner.
  const DIM: Record<typeof size, string> = {
    xs: "h-4  w-4",
    sm: "h-6  w-6",
    md: "h-8  w-8",
    lg: "h-12 w-12",
  };
  return (
    <Image
      src="/images/badges/first-edition.png"
      alt="Édition 1"
      width={80}
      height={80}
      className={`pointer-events-none absolute bottom-[38%] left-[7%] ${DIM[size]} object-contain drop-shadow-[0_0_3px_rgba(255,255,255,0.7)] ${className}`}
    />
  );
}
