"use client";

import { Search, X } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchBar({ placeholder = "Rechercher un item...", value, onChange, className }: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value || "");
  const currentValue = value ?? internalValue;

  const handleChange = useCallback(
    (val: string) => {
      setInternalValue(val);
      onChange?.(val);
    },
    [onChange]
  );

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] py-2 pl-10 pr-10",
          "text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
          "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
          "transition-colors"
        )}
      />
      {currentValue && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
