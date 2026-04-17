"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { shareProfile } from "@/lib/share/shareProfile";
import { useToast } from "@/components/ui/Toast";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { TradeCalculator } from "@/components/trade/TradeCalculator";
import { ContactBlock } from "@/components/trade/ContactBlock";

// ─────────────────────────────────────────────────────────────────────────────
// Public profile for a ClasseurShare owner. Identity + stats + (for logged-in
// visitors) the trade calculator with three tabs — Acheter / Vendre / Échange.
// The calculator mounts as a client-side fetch to
// `GET /api/users/:slug/trade-calculator` and never runs for the owner or for
// unauthenticated viewers.
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicProfileClientProps {
  user: {
    slug:        string;
    displayName: string;
    avatarUrl:   string | null;
    memberSince: string; // ISO
    contact: {
      discord: string | null;
      email:   string | null;
      twitter: string | null;
    };
  };
  visibility: {
    cards:    boolean;
    doubles:  boolean;
    wishlist: boolean;
    items:    boolean;
  };
  stats: {
    cardsCount:      number;
    cardsValueCents: number;
    doublesCount:    number;
    wishlistCount:   number;
  };
  viewer: {
    isAuthenticated: boolean;
    isOwner:         boolean;
  };
}

export function PublicProfileClient({ user, stats, viewer }: PublicProfileClientProps) {
  const { toast } = useToast();
  const avatar = user.avatarUrl ?? getDefaultAvatar(user.displayName);
  const memberYear = new Date(user.memberSince).getFullYear();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/echanges"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <button
          type="button"
          onClick={() => {
            shareProfile(user.slug, user.displayName);
            toast("Lien copié", "success");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          Partager
        </button>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
        <Image
          src={avatar}
          alt={user.displayName}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{user.displayName}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Dresseur depuis {memberYear}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {stats.cardsCount} cartes · {stats.doublesCount} doubles · {stats.wishlistCount} ♡
          </p>
        </div>
      </div>

      <div className="mt-6">
        {viewer.isOwner ? (
          <OwnerView slug={user.slug} contact={user.contact} displayName={user.displayName} />
        ) : !viewer.isAuthenticated ? (
          <GuestView displayName={user.displayName} contact={user.contact} />
        ) : (
          <TradeCalculator
            slug={user.slug}
            displayName={user.displayName}
            contact={user.contact}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function OwnerView({
  slug, displayName, contact,
}: {
  slug: string;
  displayName: string;
  contact: PublicProfileClientProps["user"]["contact"];
}) {
  return (
    <>
      <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-6 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          C&apos;est ton profil public.
        </p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Voilà ce que les autres dresseurs verront quand ils ouvriront ton lien.
        </p>
        <Link
          href="/profil/partage"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 py-2 text-xs font-semibold text-[#2A1A06]"
        >
          Partager mon classeur
        </Link>
        <p className="mt-3 font-data text-[10px] text-[var(--text-tertiary)]">
          /u/{slug}
        </p>
      </div>
      <div className="mt-6">
        <ContactBlock
          displayName={displayName}
          discord={contact.discord}
          email={contact.email}
          twitter={contact.twitter}
        />
      </div>
    </>
  );
}

function GuestView({
  displayName, contact,
}: {
  displayName: string;
  contact: PublicProfileClientProps["user"]["contact"];
}) {
  return (
    <>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Connecte-toi pour voir ce que tu peux échanger avec {displayName}
        </p>
        <Link
          href="/connexion"
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-5 py-2 text-sm font-semibold text-[#2A1A06]"
        >
          Se connecter
        </Link>
      </div>
      <div className="mt-6">
        <ContactBlock
          displayName={displayName}
          discord={contact.discord}
          email={contact.email}
          twitter={contact.twitter}
        />
      </div>
    </>
  );
}
