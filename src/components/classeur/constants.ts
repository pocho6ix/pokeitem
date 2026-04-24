// Shared design tokens for the Classeur screen.
//
// `GOLD_GRADIENT` is the app-wide premium accent — the same string
// still lives inlined in ~12 other components (BetaBanner, ProButton,
// PricingPageClient, etc.). Factoring it app-wide is out of scope for
// the Classeur refactor; we only own the Classeur-local usage here.

export const GOLD_GRADIENT =
  "linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)";

// Primary gold accent used on icons, borders, and numeric highlights.
// Matches `--color-primary` / `--color-accent-gold` in globals.css.
export const GOLD = "#E7BA76";

// Currency formatter shared across the Classeur surface. Keeps FR
// conventions (NBSP thousand separator, comma decimal, € suffix).
export const fmtEUR = (v: number, fractionDigits = 0) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(v);
