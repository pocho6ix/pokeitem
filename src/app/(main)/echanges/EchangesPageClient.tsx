"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Search, Heart, Copy, Send } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { getDefaultAvatar } from "@/lib/defaultAvatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  slug:          string;
  displayName:   string;
  avatarUrl:     string | null;
  cardsCount:    number;
  doublesCount:  number;
  wishlistCount: number;
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Search-driven échanges landing. Type a pseudo → see live results → tap
 * into a profile where the calculator tabs (🛒 / 💰 / 🔄) do the work.
 *
 * We keep the last query in a URL param (`?q=`) so the browser back button
 * returning from a profile restores the same list without a new fetch.
 */
export function EchangesPageClient({
  hasActiveShare,
}: {
  hasActiveShare: boolean;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialQ     = searchParams.get("q") ?? "";

  const [query, setQuery]      = useState<string>(initialQ);
  const debouncedQ             = useDebounce(query, 300);
  const [results, setResults]  = useState<SearchResult[] | null>(null);
  const [loading, setLoading]  = useState<boolean>(false);
  const [error,   setError]    = useState<string | null>(null);

  // Keep the URL in sync so "← Retour" from a profile restores the same list.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQ) params.set("q", debouncedQ);
    else params.delete("q");
    const next = params.toString();
    router.replace(next ? `/echanges?${next}` : "/echanges", { scroll: false });
  }, [debouncedQ, router, searchParams]);

  // Fetch — ignore races via mounted flag.
  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, body: j })))
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(res.body?.error ?? "Erreur");
        setResults(res.body.results ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQ]);

  const emptyState = query.trim().length < 2;
  const noResults  = !emptyState && !loading && results !== null && results.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
          <ArrowLeftRight className="h-5 w-5 text-[#E7BA76]" />
          Échanges
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Trouve un dresseur et vois ce que vous pouvez échanger
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un dresseur…"
          autoFocus
          aria-label="Rechercher un dresseur par pseudo"
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[#E7BA76] focus:outline-none focus:ring-2 focus:ring-[#E7BA76]/30"
        />
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && <ResultsSkeleton />}

        {!loading && results && results.length > 0 && (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Résultats ({results.length})
            </p>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.slug}>
                  <ResultCard result={r} />
                </li>
              ))}
            </ul>
          </>
        )}

        {noResults && (
          <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-6 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Aucun dresseur trouvé pour «&nbsp;{query.trim()}&nbsp;».
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Vérifie l&apos;orthographe ou demande-lui d&apos;activer son partage.
            </p>
          </div>
        )}

        {error && !loading && (
          <p className="mt-3 text-center text-xs text-red-400">{error}</p>
        )}

        {emptyState && <EmptyState hasActiveShare={hasActiveShare} />}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const avatar = result.avatarUrl ?? getDefaultAvatar(result.displayName);
  const stats = useMemo(
    () => `${result.cardsCount} cartes · ${result.doublesCount} doubles · ${result.wishlistCount} ♡`,
    [result],
  );
  return (
    <Link
      href={`/u/${result.slug}`}
      className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 transition-colors hover:bg-[var(--bg-card-hover)] active:scale-[0.99]"
    >
      <Image
        src={avatar}
        alt={result.displayName}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {result.displayName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">{stats}</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-3 py-1.5 text-xs font-semibold text-[#2A1A06]">
        Voir
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-3"
        >
          <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--bg-secondary)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--bg-secondary)]" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--bg-secondary)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ hasActiveShare }: { hasActiveShare: boolean }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/40 px-6 py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E7BA76]/10">
        <ArrowLeftRight className="h-10 w-10 text-[#E7BA76]" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
        Trouve un partenaire d&apos;échange
      </h2>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
        Recherche un dresseur par son pseudo pour voir ce que vous pouvez
        acheter, vendre ou échanger.
      </p>

      {!hasActiveShare && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-3 py-2">
          <Heart className="h-4 w-4 shrink-0 text-[#E7BA76]" />
          <p className="text-left text-xs text-[var(--text-secondary)]">
            Pour qu&apos;on te trouve aussi,{" "}
            <Link href="/profil/partage" className="font-semibold text-[#E7BA76] hover:underline">
              active le partage de ton classeur
            </Link>
            .
          </p>
        </div>
      )}

      {/* Two small illustrative cards, for ambiance only */}
      <div className="mt-8 flex items-center gap-3 opacity-40" aria-hidden="true">
        <Copy className="h-10 w-10 text-[var(--text-tertiary)]" />
        <ArrowLeftRight className="h-6 w-6 text-[#E7BA76]" />
        <Send className="h-10 w-10 text-[var(--text-tertiary)]" />
      </div>
    </div>
  );
}
