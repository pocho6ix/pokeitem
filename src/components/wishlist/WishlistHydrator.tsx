"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/stores/wishlistStore";

export function WishlistHydrator() {
  const { status } = useSession();
  const hydrate = useWishlistStore((s) => s.hydrate);
  useEffect(() => {
    if (status === "authenticated") hydrate();
  }, [status, hydrate]);
  return null;
}
