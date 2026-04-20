"use client";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-context";
import { useWishlistStore } from "@/stores/wishlistStore";

export function WishlistHydrator() {
  const { status } = useSession();
  const hydrate = useWishlistStore((s) => s.hydrate);
  useEffect(() => {
    if (status === "authenticated") hydrate();
  }, [status, hydrate]);
  return null;
}
