"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface AvatarProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "size">,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ src, alt, fallback, size, className, ...props }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const showImage = src && !hasError;

  return (
    <span className={cn(avatarVariants({ size }), className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt || ""}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
          {...props}
        />
      ) : (
        <span className="font-medium text-[var(--text-secondary)]">
          {fallback ? getInitials(fallback) : alt ? getInitials(alt) : "?"}
        </span>
      )}
    </span>
  );
}

export { Avatar, avatarVariants };
