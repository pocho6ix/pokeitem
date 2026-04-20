"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Renders the "← Classeur" back link at the top of every portfolio sub-page
 * (cartes, doubles, items, …). Hidden on the /portfolio root so the dashboard
 * stays clean.
 */
export function PortfolioBackLink() {
  const pathname = usePathname();
  // Static export (`trailingSlash: true`) returns "/portfolio/" — normalize
  // so the back link stays hidden on the root page in both builds.
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/portfolio") return null;

  return (
    <Link
      href="/portfolio"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      Classeur
    </Link>
  );
}
