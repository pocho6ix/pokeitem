"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a value by the given delay in milliseconds.
 * Returns the debounced value that only updates after the caller
 * stops changing `value` for `delay` ms.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
