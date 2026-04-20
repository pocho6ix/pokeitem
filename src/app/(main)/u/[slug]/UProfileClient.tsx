"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicProfileClient } from "./PublicProfileClient";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";

type Visibility = {
  cards: boolean;
  doubles: boolean;
  wishlist: boolean;
  items: boolean;
};

type UserDTO = {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  memberSince: string;
  contact: {
    discord: string | null;
    email: string | null;
    twitter: string | null;
  };
};

type Stats = {
  cardsCount: number;
  cardsValueCents: number;
  doublesCount: number;
  wishlistCount: number;
};

export function UProfileClient() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { user: authUser, status } = useAuth();
  const [data, setData] = useState<{
    user: UserDTO;
    visibility: Visibility;
    stats: Stats;
    ownerId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi(`/api/u/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const payload = await res.json();
        if (cancelled) return;
        setData(payload);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Chargement…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[var(--text-secondary)]">
        Profil introuvable.
      </div>
    );
  }

  const isAuthenticated = status === "authenticated";
  const isOwner = Boolean(authUser?.id && authUser.id === data.ownerId);

  return (
    <PublicProfileClient
      user={data.user}
      visibility={data.visibility}
      stats={data.stats}
      viewer={{ isAuthenticated, isOwner }}
    />
  );
}
