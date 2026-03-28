"use client";

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

import { createContext, useContext } from "react";

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx)
    throw new Error("DropdownMenu components must be used within <DropdownMenu>");
  return ctx;
}

function DropdownMenu({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, toggle, close }}>
      <div ref={ref} className={cn("relative inline-block", className)} {...props}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useDropdown();

  return (
    <button
      onClick={toggle}
      className={cn("inline-flex items-center", className)}
      aria-haspopup="true"
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  className,
  children,
  align = "end",
  ...props
}: HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }) {
  const { isOpen } = useDropdown();

  if (!isOpen) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-1 shadow-lg",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  className,
  children,
  disabled,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { close } = useDropdown();

  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] transition-colors",
        "hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:bg-[var(--bg-hover)]",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-[var(--border-default)]", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
