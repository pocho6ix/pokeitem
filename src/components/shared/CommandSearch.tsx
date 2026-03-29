"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Package, BookOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: "series" | "blocs" | "articles";
}

function getStaticResults(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  // Search blocs
  for (const bloc of BLOCS) {
    if (
      bloc.name.toLowerCase().includes(q) ||
      bloc.abbreviation.toLowerCase().includes(q)
    ) {
      results.push({
        id: `bloc-${bloc.slug}`,
        title: bloc.name,
        subtitle: bloc.abbreviation,
        href: `/collection/${bloc.slug}`,
        category: "blocs",
      });
    }
  }

  // Search series
  for (const serie of SERIES) {
    if (
      serie.name.toLowerCase().includes(q) ||
      serie.abbreviation.toLowerCase().includes(q)
    ) {
      results.push({
        id: `serie-${serie.slug}`,
        title: serie.name,
        subtitle: serie.abbreviation,
        href: `/collection/${serie.blocSlug}/${serie.slug}`,
        category: "series",
      });
    }
  }

  return results.slice(0, 10);
}

const CATEGORY_CONFIG = {
  blocs: { label: "Blocs", icon: Package },
  series: { label: "Séries", icon: BookOpen },
  articles: { label: "Articles", icon: FileText },
};

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(getStaticResults(query));
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  }

  // Group results by category
  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  let flatIndex = -1;

  if (!open) {
    return (
      <>
        {/* Desktop: search input */}
        <button
          onClick={() => setOpen(true)}
          className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:border-[var(--color-primary)]/50 transition-colors w-56"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)]">
            ⌘K
          </kbd>
        </button>
        {/* Mobile: just icon */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          aria-label="Rechercher"
        >
          <Search className="h-5 w-5" />
        </button>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-x-0 top-[15%] z-[101] mx-auto w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl">
          {/* Input */}
          <div className="flex items-center border-b border-[var(--border-default)] px-4">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher une série, un bloc, un article..."
              className="flex-1 bg-transparent px-3 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {query && results.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Aucun résultat pour &ldquo;{query}&rdquo;
              </p>
            )}

            {!query && (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Tapez pour rechercher...
              </p>
            )}

            {Object.entries(grouped).map(([category, items]) => {
              const config =
                CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
              const Icon = config?.icon ?? Package;
              return (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                    {config?.label ?? category}
                  </div>
                  {items.map((result) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          idx === selectedIndex
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                        <div className="flex-1 truncate">
                          <span className="font-medium">{result.title}</span>
                          {result.subtitle && (
                            <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border-default)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
            <span>
              <kbd className="rounded border border-[var(--border-default)] px-1 py-0.5 font-mono">↑↓</kbd>{" "}
              naviguer
            </span>
            <span>
              <kbd className="rounded border border-[var(--border-default)] px-1 py-0.5 font-mono">↵</kbd>{" "}
              ouvrir
            </span>
            <span>
              <kbd className="rounded border border-[var(--border-default)] px-1 py-0.5 font-mono">esc</kbd>{" "}
              fermer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
