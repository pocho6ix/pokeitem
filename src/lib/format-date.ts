/**
 * Format an ISO date string (YYYY-MM-DD) as `DD/MM/YYYY` (French numeric).
 * Returns null if the input is null / invalid — callers decide the fallback.
 */
export function formatDateFR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}
