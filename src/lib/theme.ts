"use client";

import { createElement, createContext, useContext, useEffect, useMemo } from "react";

interface ThemeCtx {
  theme: "dark";
  setTheme: (t: string) => void;
  resolvedTheme: "dark";
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lock to dark mode — clear any stored preference
  useEffect(() => {
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  const value = useMemo(
    () => ({ theme: "dark" as const, setTheme: () => {}, resolvedTheme: "dark" as const }),
    []
  );

  return createElement(ThemeContext.Provider, { value }, children);
}
