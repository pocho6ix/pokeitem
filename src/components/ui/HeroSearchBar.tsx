"use client";

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Search, X } from "lucide-react";

const CardDetailModal = lazy(() =>
  import("@/components/cards/CardDetailModal").then((m) => ({ default: m.CardDetailModal }))
);

const PLACEHOLDERS = ["Dracaufeu", "Pikachu", "Mewtwo", "Florizarre", "Tortank", "Évoli", "Rayquaza", "Lucario"];

interface CardResult {
  id:       string;
  name:     string;
  number:   string;
  imageUrl: string | null;
  rarity:   string;
  priceFr:  number | null;
  price:    number | null;
  serie:    { name: string; slug: string };
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

export function HeroSearchBar() {
  const [placeholder, setPlaceholder] = useState("");
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<CardResult[]>([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [detailId,    setDetailId]    = useState<string | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random placeholder on mount
  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Debounced search
  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards/search?q=${encodeURIComponent(value)}&limit=6`);
        const json = await res.json();
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }

  // Enter / "Voir tout" → fetch up to 30 results and show all
  async function handleShowAll() {
    if (query.trim().length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}&limit=30`);
      const json = await res.json();
      setResults(json.results ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleShowAll();
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  const displayPrice = (c: CardResult) => {
    const p = c.priceFr ?? c.price;
    return p ? fmt(p) : null;
  };

  return (
    <>
      <div ref={wrapperRef} className="relative mb-3">
        {/* Input */}
        <div
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder ? `Rechercher '${placeholder}'` : "Rechercher une carte…"}
            className="flex-1 bg-transparent text-sm leading-none text-[var(--text-primary)] placeholder:text-[#9CA3AF] outline-none min-w-0"
          />
          {loading && (
            <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent" />
          )}
          {query && !loading && (
            <button onClick={clear} className="shrink-0 text-[#9CA3AF] hover:text-[var(--text-primary)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-xl">
            {results.map((card) => {
              const price = displayPrice(card);
              return (
                <button
                  key={card.id}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); setDetailId(card.id); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  {/* Card image thumbnail */}
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--bg-subtle)]">
                    {card.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{card.name}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {card.serie.name} · #{card.number}
                    </p>
                  </div>

                  {/* Price */}
                  {price && (
                    <span className="shrink-0 text-xs font-semibold text-[#E7BA76]">{price}</span>
                  )}
                </button>
              );
            })}

            {/* "Voir tout" — only when showing the short list (< 30) */}
            {results.length < 30 && (
              <button
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleShowAll}
                className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--border-default)] py-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                {loading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent" />
                ) : (
                  <>Voir tout ({results.length} résultats)</>
                )}
              </button>
            )}
          </div>
        )}

        {/* No results */}
        {open && !loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-4 text-center text-sm text-[var(--text-tertiary)] shadow-xl">
            Aucune carte trouvée pour &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Card detail modal */}
      {detailId && (
        <Suspense fallback={null}>
          <CardDetailModal cardId={detailId} onClose={() => setDetailId(null)} />
        </Suspense>
      )}
    </>
  );
}
