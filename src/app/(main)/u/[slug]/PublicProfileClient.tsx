"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReadOnlyCardGrid } from "@/components/cards/ReadOnlyCardGrid";
import { ProfileCardSection } from "@/components/cards/ProfileCardSection";
import { shareProfile } from "@/lib/share/shareProfile";
import { useToast } from "@/components/ui/Toast";
import { getDefaultAvatar } from "@/lib/defaultAvatar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardItem {
  id: string;
  number: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  price?: number | null;
  priceFr?: number | null;
  priceReverse?: number | null;
  types?: string[];
  version?: string;
  quantity?: number;
  serie: {
    id?: string;
    slug: string;
    name: string;
    abbreviation?: string | null;
    bloc: { slug: string };
  };
}

interface WishlistItem {
  id: string;
  addedAt: string;
  card: CardItem;
}

interface CardSectionEntry {
  quantity: number;
  version: string;
  card: Omit<CardItem, "version" | "quantity">;
}

interface MatchData {
  youGiveCardIds: string[];
  youReceiveCardIds: string[];
  youGiveValueCents: number;
  youReceiveValueCents: number;
  balanceScore: number;
  computedAt: string | Date;
  isViable: boolean;
}

interface Props {
  profile: {
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    memberSince: string;
    contact: { discord: string | null; email: string | null; twitter: string | null };
  };
  visibility: { cards: boolean; doubles: boolean; wishlist: boolean; items: boolean };
  stats: { cardsCount: number; cardsValueCents: number; doublesCount: number; wishlistCount: number };
  sections: { cards: CardSectionEntry[]; doubles: CardSectionEntry[]; wishlist: WishlistItem[] };
  match: MatchData | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  visitorWishlistIds: string[];
}

type Tab = "cards" | "doubles" | "wishlist";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function memberYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}

// ── Match block (inline collapsible) ─────────────────────────────────────────

interface MatchBlockProps {
  match: MatchData;
  profile: Props["profile"];
  sections: Props["sections"];
  toast: (msg: string, type?: string) => void;
}

function MatchBlock({ match, profile, sections, toast }: MatchBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const deltaCents = match.youReceiveValueCents - match.youGiveValueCents;
  const deltaStr = deltaCents === 0
    ? ""
    : ` · delta ${deltaCents > 0 ? "+" : ""}${(deltaCents / 100).toFixed(2).replace(".", ",")} €`;

  const giveCards = sections.doubles
    .filter((d) => match.youGiveCardIds.includes(d.card.id))
    .map((d) => d.card);
  const receiveCards = sections.wishlist
    .filter((wi) => match.youReceiveCardIds.includes(wi.card.id))
    .map((wi) => wi.card);

  async function handleCopyDiscord() {
    if (!profile.contact.discord) return;
    try {
      await navigator.clipboard.writeText(profile.contact.discord);
      toast("Discord copié !", "success");
    } catch {
      toast("Impossible de copier", "error");
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#E7BA76]/40 bg-[var(--bg-card)]">
      {/* Collapsed header — always visible */}
      <button
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span className="text-base">💱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Échange possible · {Math.round(match.balanceScore * 100)} % équilibré
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {match.youGiveCardIds.length} ↔ {match.youReceiveCardIds.length} cartes{deltaStr}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-[#E7BA76]">
          {isExpanded ? "Détail ▲" : "Détail ▼"}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="border-t border-[var(--border-default)] px-4 pb-4 pt-3"
          style={{ animation: "fadeIn 0.3s ease" }}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Tu donnes */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                Tu donnes ({formatEuros(match.youGiveValueCents)})
              </p>
              <div className="flex gap-1 overflow-x-auto">
                {giveCards.slice(0, 8).map((card) =>
                  card.imageUrl ? (
                    <div key={card.id} className="relative h-[58px] w-[42px] shrink-0 overflow-hidden rounded-md">
                      <Image src={card.imageUrl} alt={card.name} fill className="object-cover" sizes="42px" />
                    </div>
                  ) : (
                    <div key={card.id} className="h-[58px] w-[42px] shrink-0 rounded-md bg-[var(--bg-secondary)]" />
                  )
                )}
                {giveCards.length === 0 && (
                  <p className="text-xs text-[var(--text-tertiary)]">{match.youGiveCardIds.length} carte(s)</p>
                )}
              </div>
            </div>

            {/* Tu reçois */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                Tu reçois ({formatEuros(match.youReceiveValueCents)})
              </p>
              <div className="flex gap-1 overflow-x-auto">
                {receiveCards.slice(0, 8).map((card) =>
                  card.imageUrl ? (
                    <div key={card.id} className="relative h-[58px] w-[42px] shrink-0 overflow-hidden rounded-md">
                      <Image src={card.imageUrl} alt={card.name} fill className="object-cover" sizes="42px" />
                    </div>
                  ) : (
                    <div key={card.id} className="h-[58px] w-[42px] shrink-0 rounded-md bg-[var(--bg-secondary)]" />
                  )
                )}
                {receiveCards.length === 0 && (
                  <p className="text-xs text-[var(--text-tertiary)]">{match.youReceiveCardIds.length} carte(s)</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.contact.discord && (
              <button
                onClick={handleCopyDiscord}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                📋 Copier Discord
              </button>
            )}
            {profile.contact.email && (
              <a
                href={`mailto:${profile.contact.email}`}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                ✉️ Email
              </a>
            )}
            {profile.contact.twitter && (
              <a
                href={`https://twitter.com/${profile.contact.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                🐦 Twitter
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PublicProfileClient({
  profile, visibility, stats, sections, match, isAuthenticated, isOwner, visitorWishlistIds,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const visitorSet = new Set(visitorWishlistIds);

  // Determine available tabs
  const allTabs: Tab[] = [];
  if (visibility.cards) allTabs.push("cards");
  if (visibility.doubles) allTabs.push("doubles");
  if (visibility.wishlist) allTabs.push("wishlist");

  const [activeTab, setActiveTab] = useState<Tab>(allTabs[0] ?? "cards");

  // One entry per (cardId, version) — no duplication by quantity
  const cardsFlat: CardItem[] = sections.cards.map((uc) => ({
    ...uc.card,
    version: uc.version,
  }));
  // Doubles = UserCard qty > 1, show version + quantity badge
  const doublesFlat: CardItem[] = sections.doubles.map((d) => ({
    ...d.card,
    version: d.version,
    quantity: d.quantity,
  }));
  const wishlistCards: CardItem[] = sections.wishlist.map((wi) => wi.card);

  const avatarSrc = profile.avatarUrl ?? getDefaultAvatar(profile.slug);

  async function handleShare() {
    await shareProfile(profile.slug, profile.displayName, () => {
      toast("Lien copié !", "success");
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back + Share */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Partager ce profil
        </button>
      </div>

      {/* Profile header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <Image
            src={avatarSrc}
            alt={profile.displayName}
            fill
            className="rounded-full object-cover ring-2 ring-[#E7BA76]/50"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{profile.displayName}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Dresseur depuis {memberYear(profile.memberSince)}</p>
          {/* Stats inline */}
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {stats.cardsCount} cartes · {stats.doublesCount} doubles · {stats.wishlistCount} ♡
          </p>
        </div>
      </div>

      {/* Match block — only when viable */}
      {match !== null && !isOwner && (
        <MatchBlock
          match={match}
          profile={profile}
          sections={sections}
          toast={toast}
        />
      )}

      {/* No match message */}
      {match === null && isAuthenticated && !isOwner && (
        <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Pas d&apos;échange viable pour l&apos;instant. Continue d&apos;ajouter des cartes à ta liste de souhaits pour augmenter tes chances.
        </div>
      )}

      {/* Not authenticated */}
      {!isAuthenticated && (
        <div className="mb-6 overflow-hidden rounded-2xl shadow-lg">
          <div className="btn-gold p-4 text-center">
            <p className="mb-1 font-bold text-black">Connecte-toi pour voir si tu peux échanger avec {profile.displayName}</p>
            <p className="mb-3 text-xs text-black/70">On compare vos doubles et listes de souhaits automatiquement</p>
            <a
              href="/connexion"
              className="inline-block rounded-xl bg-black/20 px-4 py-2 text-sm font-semibold text-black hover:bg-black/30 transition-colors"
            >
              Se connecter
            </a>
          </div>
        </div>
      )}

      {/* Owner view banner */}
      {isOwner && (
        <div className="mb-6 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
          C&apos;est ton profil public.
          <a href="/settings/sharing" className="ml-1 font-medium text-[#E7BA76] underline">
            Modifier les paramètres
          </a>
        </div>
      )}

      {/* Tabs */}
      {allTabs.length > 0 && (
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-[var(--bg-secondary)] p-1">
          {allTabs.map((tab) => {
            const count = tab === "cards" ? stats.cardsCount : tab === "doubles" ? stats.doublesCount : stats.wishlistCount;
            const label = tab === "cards" ? "Cartes" : tab === "doubles" ? "Doubles" : "Souhaits";
            const isEmpty = count === 0 && tab === "doubles";
            return (
              <button
                key={tab}
                onClick={() => { if (!isEmpty) setActiveTab(tab); }}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isEmpty
                    ? "cursor-not-allowed opacity-40 text-[var(--text-secondary)]"
                    : activeTab === tab
                      ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Card sections */}
      {activeTab === "cards" && (
        <ProfileCardSection cards={cardsFlat} visitorWishlistIds={visitorSet} />
      )}
      {activeTab === "doubles" && (
        <ProfileCardSection cards={doublesFlat} visitorWishlistIds={visitorSet} />
      )}
      {activeTab === "wishlist" && (
        <ProfileCardSection cards={wishlistCards} visitorWishlistIds={visitorSet} />
      )}
    </div>
  );
}
