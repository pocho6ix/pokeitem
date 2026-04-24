// Portfolio → CSV serialisers.
//
// Two flat files are produced, matching the templates the user supplied:
//
//   • portefeuille_cartes.csv
//     Header: Nom,Numéro,Série,Bloc,État,Version,Langue Carte,Prix Achat,Prix Actuel
//   • portefeuille_items.csv
//     Header: Item,Série,Quantité,Prix Achat,Prix Actuel,Gain Théorique
//
// Format rules (RFC 4180, UTF-8 no BOM, CRLF line breaks):
//   • Prices in the cartes file use "X,XX €" (comma decimal, 2 digits,
//     euro symbol, always quoted because of the embedded comma).
//   • Prices in the items file use "X,XX" (no symbol, still quoted).
//   • A cell is only wrapped in double-quotes when it contains a comma,
//     quote or line break — never "surquoted" by default.

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * "0,70 €" — comma decimal, 2 fractional digits, euro symbol.
 * Returns "" for null/undefined (the caller expects an empty cell).
 */
export function formatPriceEuro(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return `${n.toFixed(2).replace(".", ",")} €`;
}

/**
 * "279,99" — comma decimal, 2 fractional digits, no symbol.
 * Returns "" for null/undefined.
 */
export function formatPriceComma(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

/**
 * Quote a single CSV cell per RFC 4180 when needed.
 * Never re-wraps an already-built cell (the caller passes raw text).
 */
export function csvCell(raw: string): string {
  if (raw === "") return "";
  if (!/[,"\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

/**
 * Format a card number as "NNN/TTT" using the Serie's total card count.
 *   • "62" + 88 → "062/088"
 *   • "TG12" + 30 → "TG12/30" (non-numeric tags are left untouched)
 *   • "62" + null → "62" (unknown total, skip the denominator)
 */
export function formatCardNumber(
  number: string,
  total: number | null | undefined,
): string {
  if (!total) return number;
  const totalStr = String(total);
  const pad = totalStr.length;
  const padded = /^\d+$/.test(number) ? number.padStart(pad, "0") : number;
  return `${padded}/${totalStr.padStart(pad, "0")}`;
}

// ── Row types ─────────────────────────────────────────────────────────────────

export interface CardExportRow {
  name: string;
  number: string;
  setTotal: number | null | undefined;
  serieName: string;
  blocName: string;
  condition: string; // pre-mapped via CARD_CONDITION_LABELS
  version: string; // pre-mapped via CARD_VERSION_LABELS
  language: string; // pre-mapped via LANGUAGE_LABELS
  purchasePrice: number | null | undefined;
  currentPrice: number | null | undefined;
}

export interface ItemExportRow {
  type: string; // pre-mapped via ITEM_TYPE_LABELS
  serieName: string;
  quantity: number;
  purchasePrice: number | null | undefined;
  currentPrice: number | null | undefined;
}

// ── Builders ──────────────────────────────────────────────────────────────────

const CRLF = "\r\n";

const CARDS_HEADER = [
  "Nom",
  "Numéro",
  "Série",
  "Bloc",
  "État",
  "Version",
  "Langue Carte",
  "Prix Achat",
  "Prix Actuel",
].join(",");

const ITEMS_HEADER = [
  "Item",
  "Série",
  "Quantité",
  "Prix Achat",
  "Prix Actuel",
  "Gain Théorique",
].join(",");

export function buildCardsCsv(rows: CardExportRow[]): string {
  const lines: string[] = [CARDS_HEADER];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(formatCardNumber(r.number, r.setTotal)),
        csvCell(r.serieName),
        csvCell(r.blocName),
        csvCell(r.condition),
        csvCell(r.version),
        csvCell(r.language),
        csvCell(formatPriceEuro(r.purchasePrice)),
        csvCell(formatPriceEuro(r.currentPrice)),
      ].join(","),
    );
  }
  return lines.join(CRLF) + CRLF;
}

export function buildItemsCsv(rows: ItemExportRow[]): string {
  const lines: string[] = [ITEMS_HEADER];
  for (const r of rows) {
    // Gain = currentPrice − purchasePrice. Emitted only when both prices
    // exist — otherwise the cell stays blank (a "0,00" there would be
    // misleading since 0 is a valid legitimate gain).
    const hasBothPrices =
      r.purchasePrice !== null &&
      r.purchasePrice !== undefined &&
      r.currentPrice !== null &&
      r.currentPrice !== undefined;
    const gain = hasBothPrices
      ? (r.currentPrice as number) - (r.purchasePrice as number)
      : null;

    lines.push(
      [
        csvCell(r.type),
        csvCell(r.serieName),
        csvCell(String(r.quantity)),
        csvCell(formatPriceComma(r.purchasePrice)),
        csvCell(formatPriceComma(r.currentPrice)),
        csvCell(formatPriceComma(gain)),
      ].join(","),
    );
  }
  return lines.join(CRLF) + CRLF;
}
