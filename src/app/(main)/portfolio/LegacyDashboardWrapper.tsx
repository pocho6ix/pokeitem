"use client";

import { usePathname } from "next/navigation";

// Renders its children only on Classeur sub-pages (/portfolio/cartes,
// /portfolio/items, etc.) — never on the /portfolio root.
//
// Used by the layout to keep the legacy stats + evolution chart
// dashboard visible on sub-pages (unchanged UX) while letting the new
// ClasseurView own the root layout entirely.
//
// The `trailingSlash: true` config for the Capacitor build means the
// pathname arrives as "/portfolio/" on iOS, so we strip the trailing
// slash before comparing.

export function LegacyDashboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const normalized = pathname.replace(/\/$/, "") || "/";
  const isSubPage = normalized !== "/portfolio";

  if (!isSubPage) return null;
  return <>{children}</>;
}
