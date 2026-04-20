"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ArrowRight } from "lucide-react";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { fetchApi } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuggestedUser {
  slug:        string;
  displayName: string;
  avatarUrl:   string | null;
  matchCount:  number;
}

// ─── Main section ────────────────────────────────────────────────────────────

/**
 * "Dresseurs recommandés" — shown under the search bar when the query is
 * empty. Fetches /api/users/suggested (server-cached 1 h per user) and
 * renders up to 12 bubbles sorted by |my wishlist ∩ their doubles/cards|.
 *
 * Three empty states:
 *   1. Caller has no wishlist  → <EmptyWishlistHint />
 *   2. Wishlist exists, 0 matches → render nothing (the page's own illustrated
 *      empty state takes over)
 *   3. 1–3 matches → center the bubbles instead of the 4-col grid, avoids a
 *      lonely row with gaping empty cells.
 */
export function SuggestedUsers() {
  const [data,    setData]    = useState<{ suggestions: SuggestedUser[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  // Tracks whether the caller has a wishlist; drives the "ajoute des cartes à
  // ta wishlist" CTA. Set from an extra wishlist probe so we can distinguish
  // "no wishlist" from "wishlist but 0 overlap".
  const [hasWishlist, setHasWishlist] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchApi("/api/users/suggested").then((r) => r.json().then((j) => ({ ok: r.ok, body: j }))),
      // A cheap count probe — we only use the "is it zero" bit, so any tiny
      // endpoint hitting the wishlist would do. Keeping it local to this
      // component so the page doesn't need to prop-drill the flag.
      fetchApi("/api/wishlist/cards/ids").then((r) => r.json().then((j) => ({ ok: r.ok, body: j }))).catch(() => ({ ok: false, body: null })),
    ])
      .then(([sRes, wRes]) => {
        if (cancelled) return;
        if (!sRes.ok) throw new Error(sRes.body?.error ?? "Erreur");
        setData(sRes.body);
        const ids = wRes.ok && Array.isArray(wRes.body?.ids) ? wRes.body.ids as string[] : [];
        setHasWishlist(ids.length > 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <SuggestedUsersSkeleton />;
  if (error)   return null;

  const suggestions = data?.suggestions ?? [];

  // Wishlist is empty → nudge the user to add cards.
  if (hasWishlist === false) return <EmptyWishlistHint />;

  // No overlap found but wishlist exists → render nothing; the illustrated
  // empty state in the parent page stays visible.
  if (suggestions.length === 0) return null;

  const useFlexLayout = suggestions.length < 4;

  return (
    <section className="mt-6 animate-in fade-in duration-200">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Dresseurs recommandés
      </p>
      <div className={
        useFlexLayout
          ? "flex flex-wrap justify-center gap-3"
          : "grid grid-cols-4 gap-3 place-items-center"
      }>
        {suggestions.map((u) => (
          <SuggestedUserBubble key={u.slug} {...u} />
        ))}
      </div>
    </section>
  );
}

// ─── Bubble ──────────────────────────────────────────────────────────────────

function SuggestedUserBubble({ slug, displayName, avatarUrl, matchCount }: SuggestedUser) {
  const src = avatarUrl ?? getDefaultAvatar(slug);
  return (
    <Link
      href={`/u/${slug}`}
      className="flex flex-col items-center gap-1 active:scale-95 transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76] rounded-lg p-1"
      aria-label={`${displayName} — ${matchCount} carte${matchCount > 1 ? "s" : ""} de ta wishlist`}
    >
      <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-[var(--bg-secondary)]">
        <Image
          src={src}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </div>
      <span className="block w-full max-w-[72px] truncate text-center text-xs font-medium text-[var(--text-primary)]">
        {displayName}
      </span>
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#A855F7]">
        {matchCount}
        <Heart className="h-3 w-3 fill-[#A855F7]" strokeWidth={0} />
      </span>
    </Link>
  );
}

// ─── Empty wishlist hint ────────────────────────────────────────────────────

function EmptyWishlistHint() {
  return (
    <section className="mt-6 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/40 px-4 py-5 text-center">
      <p className="text-sm text-[var(--text-secondary)]">
        Ajoute des cartes à ta liste de souhaits pour voir qui les possède.
      </p>
      <Link
        href="/portfolio/souhaits"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#E7BA76] hover:underline"
      >
        Aller à ma wishlist
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SuggestedUsersSkeleton() {
  return (
    <section className="mt-6" aria-hidden>
      <div className="mb-3 h-3 w-40 animate-pulse rounded bg-[var(--bg-card)]/60" />
      <div className="grid grid-cols-4 gap-3 place-items-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--bg-card)]/60" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-[var(--bg-card)]/60" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-[var(--bg-card)]/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
