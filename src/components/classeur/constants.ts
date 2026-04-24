// Shared design tokens for the Classeur screen.
//
// `GOLD_GRADIENT` is the app-wide premium accent. It's currently also
// hardcoded inline in the legacy PortfolioTiles / CollectionTile
// components, which go away in commit 3 — once those are deleted, this
// module owns the constant.

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
