import Image from "next/image";
import { Package } from "lucide-react";

interface ItemImageProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Item slug — used to resolve image by convention when src is null */
  slug?: string;
}

const SIZES = {
  sm: { w: 40, h: 40, icon: "w-4 h-4" },
  md: { w: 80, h: 80, icon: "w-8 h-8" },
  lg: { w: 160, h: 160, icon: "w-12 h-12" },
  xl: { w: 280, h: 210, icon: "w-16 h-16" },
};

export function ItemImage({
  src,
  alt,
  size = "md",
  className = "",
  slug,
}: ItemImageProps) {
  const dim = SIZES[size];
  const resolvedSrc = src || (slug ? `/images/items/${slug}.jpg` : null);

  return (
    <div
      className={`bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden ${className}`}
    >
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          width={dim.w}
          height={dim.h}
          className="object-contain p-1 max-h-full w-auto"
        />
      ) : (
        <Package
          className={`${dim.icon} text-[var(--text-tertiary)] opacity-40`}
        />
      )}
    </div>
  );
}
