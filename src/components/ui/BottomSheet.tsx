"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Mobile-first bottom sheet. Sits above the `MobileNav` and slides up from the
 * bottom edge. Closes on backdrop click, Escape, or explicit `onClose`.
 */
export interface BottomSheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  title?:   string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl shadow-black/50 animate-in slide-in-from-bottom duration-200",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {/* Grab handle for tactile cue */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
        </div>
        {title && (
          <h2 className="px-4 pt-2 pb-1 text-center text-sm font-semibold text-[var(--text-secondary)]">
            {title}
          </h2>
        )}
        <div className="px-2 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
