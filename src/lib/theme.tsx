"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export const useTheme = () => useContext(ThemeContext);

/**
 * Capacitor-only UI contract: the app was only styled for dark mode on
 * mobile, so we ignore the OS preference inside the native shell and
 * pin the theme to "dark". Web stays fully dynamic.
 */
function isCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((window as any).Capacitor);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (isCapacitor()) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "system" to match SSR — hydrate from localStorage in useEffect
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isCapacitor()) {
      setThemeState("dark");
      setMounted(true);
      return;
    }
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  const resolvedTheme = isCapacitor()
    ? "dark"
    : theme === "system"
    ? getSystemTheme()
    : theme;

  const setTheme = useCallback((t: Theme) => {
    // In Capacitor we pretend to accept the change but force dark so the
    // UI stays consistent — the theme toggle in settings is hidden via
    // `isCapacitor()` checks in the consumer UI.
    if (isCapacitor()) {
      setThemeState("dark");
      localStorage.setItem("theme", "dark");
      return;
    }
    setThemeState(t);
    localStorage.setItem("theme", t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme, mounted]);

  useEffect(() => {
    if (theme !== "system") return;
    if (isCapacitor()) return; // no OS-preference tracking in native shell
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const forceUpdate = () => setThemeState("system");
    mq.addEventListener("change", forceUpdate);
    return () => mq.removeEventListener("change", forceUpdate);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, setTheme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
