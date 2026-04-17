/**
 * Pure helper that formats a trade-calculator snapshot into a plain-text
 * message ready to be pasted into Discord / email body / Twitter DM. The
 * output is deliberately plain (emojis OK, no markdown, no HTML) so it
 * renders identically everywhere.
 *
 * The helper is split into three templates (buy / sell / trade) and caps each
 * card list at MAX_CARDS_LISTED so a 130-card intersection doesn't blow up
 * the message length. Prices are French-formatted (6,00 €) and cards with a
 * 0-cent value are flagged "Prix indisponible" and excluded from totals —
 * matching the calculator's own rendering rules.
 */

export type ProposalType = "buy" | "sell" | "trade";

export interface ProposalCard {
  cardId:     string;
  name:       string;
  number:     string;
  valueCents: number;
}

export interface ProposalSectionInput {
  cards: ProposalCard[];
  totalValueCents: number;
  count?: number;
}

export interface ProposalTradeInput {
  possible: boolean;
  iGive:    ProposalSectionInput;
  iReceive: ProposalSectionInput;
  complementCents:      number; // magnitude, always >= 0 when a direction is set
  complementDirection: "me_to_them" | "them_to_me" | "none";
}

export interface ProposalContext {
  canBuy:  ProposalSectionInput;
  canSell: ProposalSectionInput;
  trade:   ProposalTradeInput;
}

export interface ProposalProfile {
  displayName: string;
  slug:        string | null;
  shareActive: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_CARDS_LISTED = 10;
const BASE_URL = "https://app.pokeitem.fr";

// ─── Formatters ──────────────────────────────────────────────────────────────

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/**
 * Format a single card line. Cards with a 0-cent value are deliberately
 * rendered as "Prix indisponible" — they appear in the list so the recipient
 * knows they're part of the discussion, but they never contribute to the
 * price math (matching the calculator's own rule).
 */
function formatCardLine(c: ProposalCard): string {
  const price = c.valueCents > 0 ? formatEur(c.valueCents) : "Prix indisponible";
  return `• ${c.name} (${c.number}) — ${price}`;
}

/**
 * Render a bounded card list. Beyond MAX_CARDS_LISTED cards, the list is
 * truncated with a "... et N autres cartes" footer so Discord/Twitter
 * message-length limits stay comfortably respected.
 */
function formatCardList(cards: ProposalCard[]): string {
  if (cards.length === 0) return "";
  const visible  = cards.slice(0, MAX_CARDS_LISTED).map(formatCardLine).join("\n");
  const overflow = cards.length - MAX_CARDS_LISTED;
  return overflow > 0
    ? `${visible}\n... et ${overflow} autre${overflow > 1 ? "s" : ""} carte${overflow > 1 ? "s" : ""}`
    : visible;
}

/**
 * Compute the contribution-valid total. Mirrors the server-side rule: only
 * cards with a strictly positive valueCents feed into the headline total, so
 * a single unpriced card can't skew the number shown to the recipient.
 */
function totalForMessage(section: ProposalSectionInput): number {
  return section.cards.reduce((s, c) => (c.valueCents > 0 ? s + c.valueCents : s), 0);
}

function signatureFooter(myProfile: ProposalProfile): string {
  if (myProfile.shareActive && myProfile.slug) {
    return `\n\nMon profil : ${BASE_URL}/u/${myProfile.slug}`;
  }
  return "\n\n(Active ton partage sur Pokéitem pour que je voie ton classeur)";
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function generateProposalMessage(
  type: ProposalType,
  ctx: ProposalContext,
  targetDisplayName: string,
  myProfile: ProposalProfile,
): string {
  switch (type) {
    case "buy":   return buildBuyMessage(ctx, targetDisplayName, myProfile);
    case "sell":  return buildSellMessage(ctx, targetDisplayName, myProfile);
    case "trade": return buildTradeMessage(ctx, targetDisplayName, myProfile);
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function buildBuyMessage(ctx: ProposalContext, targetName: string, me: ProposalProfile): string {
  const { canBuy } = ctx;
  const total = totalForMessage(canBuy);

  return [
    `Salut ${targetName} ! 👋`,
    "",
    `Je suis intéressé par ${canBuy.cards.length} de tes cartes sur Pokéitem :`,
    "",
    formatCardList(canBuy.cards),
    "",
    `💰 Valeur totale : ${formatEur(total)}`,
    "",
    "On peut en discuter ?",
  ].join("\n") + signatureFooter(me);
}

function buildSellMessage(ctx: ProposalContext, targetName: string, me: ProposalProfile): string {
  const { canSell } = ctx;
  const total = totalForMessage(canSell);

  return [
    `Salut ${targetName} ! 👋`,
    "",
    `J'ai ${canSell.cards.length} cartes que tu cherches sur Pokéitem :`,
    "",
    formatCardList(canSell.cards),
    "",
    `💰 Valeur totale : ${formatEur(total)}`,
    "",
    "Ça t'intéresse ?",
  ].join("\n") + signatureFooter(me);
}

function buildTradeMessage(ctx: ProposalContext, targetName: string, me: ProposalProfile): string {
  const { trade } = ctx;
  const giveTotal    = totalForMessage(trade.iGive);
  const receiveTotal = totalForMessage(trade.iReceive);

  const complementLine = (() => {
    if (trade.complementDirection === "none" || trade.complementCents < 100) {
      return "⚖️ Échange parfaitement équilibré !";
    }
    const amount = formatEur(trade.complementCents);
    return trade.complementDirection === "me_to_them"
      ? `⚖️ Complément de ${amount} de ma part pour équilibrer.`
      : `⚖️ Complément de ${amount} de ta part pour équilibrer.`;
  })();

  return [
    `Salut ${targetName} ! 👋`,
    "",
    "J'ai trouvé un échange possible entre nous sur Pokéitem :",
    "",
    `🔄 Je te donne (${trade.iGive.cards.length} cartes · ${formatEur(giveTotal)}) :`,
    formatCardList(trade.iGive.cards),
    "",
    `🔄 Tu me donnes (${trade.iReceive.cards.length} cartes · ${formatEur(receiveTotal)}) :`,
    formatCardList(trade.iReceive.cards),
    "",
    complementLine,
    "",
    "Qu'est-ce que t'en dis ?",
  ].join("\n") + signatureFooter(me);
}
