// Default evolution-chart timeframe derived from the user's first activity
// date (earliest of: first card added, first sealed item added).
//
// Rationale: we want a brand-new account to default to "7J" (so the chart
// shows *something* meaningful instead of an empty MAX view), and a
// long-standing account to default to "MAX" (so they see the full story
// at a glance). The home page's `CollectionHeroCard` uses the same rule
// — this module exists to keep both call sites in sync.

export const PERIODS = ["7J", "1M", "3M", "6M", "1A", "MAX"] as const;
export type Period = (typeof PERIODS)[number];

export function getPeriodFromFirstActivity(
  firstActivityDate: string | Date | null,
): Period {
  if (!firstActivityDate) return "1M";
  const date =
    firstActivityDate instanceof Date
      ? firstActivityDate
      : new Date(firstActivityDate);
  const ageMs = Date.now() - date.getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days < 7) return "7J";
  if (days < 30) return "1M";
  if (days < 90) return "3M";
  if (days < 180) return "6M";
  if (days < 365) return "1A";
  return "MAX";
}
