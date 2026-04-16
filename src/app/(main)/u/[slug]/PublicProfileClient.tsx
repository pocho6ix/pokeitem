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
  cashBalanceCents?: number;
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

// ── Main Component ────────────────────────────────────────────────────────────

export function PublicProfileClient({
  profile, visibility, stats, sections, match, isAuthenticated, isOwner, visitorWishlistIds,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const visitorSet = new Set(visitorWishlistIds);

  // Determine available tabs
  const tabs: Tab[] = [];
  if (visibility.cards) tabs.push("cards");
  if (visibility.doubles) tabs.push("doubles");
  if (visibility.wishlist) tabs.push("wishlist");

  const [activeTab, setActiveTab] = useState<Tab>(tabs[0] ?? "cards");
  const [showMatchModal, setShowMatchModal] = useState(false);

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

  const tabLabels: Record<Tab, string> = {
    cards: `Cartes (${stats.cardsCount})`,
    doubles: `Doubles (${stats.doublesCount})`,
    wishlist: `Souhaits (${stats.wishlistCount})`,
  };

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

          {/* Stats chips */}
          <div className="mt-2 flex flex-wrap gap-2">
            {visibility.cards && (
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {stats.cardsCount} cartes
              </span>
            )}
            {visibility.doubles && (
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {stats.doublesCount} doubles
              </span>
            )}
            {visibility.wishlist && (
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {stats.wishlistCount} souhaits
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Match block */}
      {match && match.isViable && !isOwner && (
        <div className="mb-6 overflow-hidden rounded-2xl shadow-lg">
          <div className="btn-gold p-4">
            <div className="mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              <span className="text-sm font-bold text-black">Échange possible !</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/10 p-3 text-center">
                <p className="text-xs font-semibold text-black/70">Tu donnes</p>
                <p className="text-lg font-bold text-black">{match.youGiveCardIds.length} cartes</p>
                <p className="text-xs text-black/70">{formatEuros(match.youGiveValueCents)}</p>
              </div>
              <div className="rounded-xl bg-black/10 p-3 text-center">
                <p className="text-xs font-semibold text-black/70">Tu reçois</p>
                <p className="text-lg font-bold text-black">{match.youReceiveCardIds.length} cartes</p>
                <p className="text-xs text-black/70">{formatEuros(match.youReceiveValueCents)}</p>
              </div>
            </div>

            {/* Balance bar */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-black/70">
                <span>Équilibre</span>
                <span>{Math.round(match.balanceScore * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-black/50 transition-all"
                  style={{ width: `${Math.round(match.balanceScore * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowMatchModal(true)}
                className="flex-1 rounded-xl bg-black/20 py-2 text-sm font-semibold text-black hover:bg-black/30 transition-colors"
              >
                Voir le détail
              </button>
              {/* Contact button */}
              {profile.contact.discord && (
                <a
                  href={`https://discord.com/users/${profile.contact.discord}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-black hover:bg-black/30 transition-colors"
                >
                  Discord
                </a>
              )}
              {!profile.contact.discord && profile.contact.twitter && (
                <a
                  href={`https://twitter.com/${profile.contact.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-black hover:bg-black/30 transition-colors"
                >
                  Twitter
                </a>
              )}
              {!profile.contact.discord && !profile.contact.twitter && profile.contact.email && (
                <a
                  href={`mailto:${profile.contact.email}`}
                  className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-black hover:bg-black/30 transition-colors"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No match messages */}
      {!match && isAuthenticated && !isOwner && (
        <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Pas d&apos;échange possible pour l&apos;instant — tes doubles et ta wishlist ne correspondent pas avec ceux de {profile.displayName}.
        </div>
      )}
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

      {/* Contact section for owner view */}
      {isOwner && (
        <div className="mb-6 rounded-xl border border-[#E7BA76]/30 bg-[#E7BA76]/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
          C&apos;est ton profil public.
          <a href="/settings/sharing" className="ml-1 font-medium text-[#E7BA76] underline">
            Modifier les paramètres
          </a>
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-[var(--bg-secondary)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      )}

      {/* Card sections — grouped by série + rarity filter */}
      {activeTab === "cards" && (
        <ProfileCardSection cards={cardsFlat} visitorWishlistIds={visitorSet} />
      )}
      {activeTab === "doubles" && (
        <ProfileCardSection cards={doublesFlat} visitorWishlistIds={visitorSet} />
      )}
      {activeTab === "wishlist" && (
        <ProfileCardSection cards={wishlistCards} visitorWishlistIds={visitorSet} />
      )}

      {/* Match detail modal */}
      {showMatchModal && match && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setShowMatchModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-[var(--bg-card)] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
            </div>
            <div className="overflow-y-auto px-5 pt-2 pb-8 max-h-[80vh]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Détail de l&apos;échange</h2>
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                    Tu donnes ({match.youGiveCardIds.length})
                  </p>
                  <p className="mb-3 text-xs text-[var(--text-secondary)]">{formatEuros(match.youGiveValueCents)}</p>
                  <ReadOnlyCardGrid
                    cards={sections.doubles
                      .filter((d) => match.youGiveCardIds.includes(d.card.id))
                      .map((d) => d.card)}
                    gridSize="small"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                    Tu reçois ({match.youReceiveCardIds.length})
                  </p>
                  <p className="mb-3 text-xs text-[var(--text-secondary)]">{formatEuros(match.youReceiveValueCents)}</p>
                  <ReadOnlyCardGrid
                    cards={sections.doubles
                      .filter((d) => match.youReceiveCardIds.includes(d.card.id))
                      .map((d) => d.card)
                      .concat(
                        sections.wishlist
                          .filter((wi) => match.youReceiveCardIds.includes(wi.card.id) &&
                            !sections.doubles.some(d => match.youReceiveCardIds.includes(d.card.id) && d.card.id === wi.card.id))
                          .map((wi) => wi.card)
                      )}
                    gridSize="small"
                  />
                </div>
              </div>

              {/* Contact in modal */}
              <div className="mt-6 space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Contacter {profile.displayName}</p>
                {profile.contact.discord && (
                  <a
                    href={`https://discord.com/users/${profile.contact.discord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Discord : {profile.contact.discord}
                  </a>
                )}
                {profile.contact.email && (
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Email : {profile.contact.email}
                  </a>
                )}
                {profile.contact.twitter && (
                  <a
                    href={`https://twitter.com/${profile.contact.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Twitter : {profile.contact.twitter}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
