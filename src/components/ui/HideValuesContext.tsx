"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "pokeitem_hide_value";
const EVENT  = "pokeitem-hide-values-change";

/**
 * Shared visibility toggle — no Provider needed.
 * Components stay in sync via a custom window event.
 */
export function useHideValues() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Initialise from localStorage
    setHidden(localStorage.getItem(LS_KEY) === "true");

    // Stay in sync when another component toggles
    const handle = (e: Event) =>
      setHidden((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, handle);
    return () => window.removeEventListener(EVENT, handle);
  }, []);

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      localStorage.setItem(LS_KEY, String(next));
      window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { hidden, toggle };
}

// Keep a no-op Provider export so page.tsx import doesn't break during transition
export function HideValuesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
