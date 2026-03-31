"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Cartes",   href: "/portfolio/cartes" },
  { label: "Doubles",  href: "/portfolio/doubles" },
  { label: "Items",    href: "/portfolio/items" },
];

export function PortfolioTabNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-[var(--border-default)]">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-[#E7BA76] text-[#E7BA76]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
