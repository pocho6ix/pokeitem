"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The web build uses `redirect("/collection/cartes")` in this file — fine for
 * SSR on Vercel, but Next emits `__next_error__` HTML in static export because
 * `redirect()` can't run at build time. Client-side `router.replace` produces
 * a valid static page that forwards as soon as the WebView hydrates.
 */
export default function CollectionPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/collection/cartes");
  }, [router]);
  return null;
}
