// ---------------------------------------------------------------------------
// Simple link-based tab navigation (server-component compatible)
// ---------------------------------------------------------------------------

import Link from "next/link";

export interface TabNavItem {
  label: string;
  href: string;
  /** Whether this tab is currently active */
  active: boolean;
}

interface TabNavProps {
  tabs: TabNavItem[];
}

export function TabNav({ tabs }: TabNavProps) {
  return (
    <div className="mb-6 flex gap-1 border-b border-[var(--border-default)]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab.active
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
