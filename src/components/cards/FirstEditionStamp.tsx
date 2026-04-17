"use client";

import Image from "next/image";

/**
 * Overlay badge stamped on top of the card artwork when the row carries
 * `isFirstEdition: true`. Shipped as a v1 workaround — TCGdex (our image
 * CDN) doesn't serve 1ED and Unlimited as separate products, so instead
 * of sourcing two distinct images per card we mark the 1ED variants
 * visually with this medallion.
 *
 * Positioned absolutely in the bottom-left corner, roughly where the real
 * "Édition 1" stamp appears on the printed card. The size scales with the
 * tile via the `size` prop so thumbnails stay legible and big modal views
 * show a proportional medallion.
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
    sm: "h-5  w-5",
    md: "h-7  w-7",
    lg: "h-10 w-10",
  };
  return (
    <Image
      src="/images/badges/first-edition.png"
      alt="Édition 1"
      width={80}
      height={80}
      className={`pointer-events-none absolute bottom-[8%] left-[6%] ${DIM[size]} object-contain drop-shadow-[0_0_4px_rgba(0,0,0,0.6)] ${className}`}
    />
  );
}
