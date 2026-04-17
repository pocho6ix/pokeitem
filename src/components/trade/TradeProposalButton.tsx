"use client";

import { ShoppingCart, HandCoins, ArrowLeftRight } from "lucide-react";

/**
 * Inline CTA that opens the proposal sheet. Rendered *inside* the active
 * pane (between the summary header and the card lists) rather than as a
 * floating sticky bar — keeps it close to the value it summarises and
 * avoids fighting for viewport space with the bottom nav.
 *
 * Uses the shared `.btn-gold` class (globals.css) so the gradient matches
 * every other primary CTA in the app ("Partager le lien", "Ajouter à ma
 * collection", etc.).
 */
export interface TradeProposalButtonProps {
  activeTab: "buy" | "sell" | "trade";
  canBuyCount:    number;
  canSellCount:   number;
  tradePossible:  boolean;
  hasContact:     boolean;
  onClick:        () => void;
}

export function TradeProposalButton({
  activeTab, canBuyCount, canSellCount, tradePossible, hasContact, onClick,
}: TradeProposalButtonProps) {
  const spec = SPECS[activeTab];
  const emptyForThisTab =
    (activeTab === "buy"   && canBuyCount === 0) ||
    (activeTab === "sell"  && canSellCount === 0) ||
    (activeTab === "trade" && !tradePossible);

  const disabled = emptyForThisTab || !hasContact;

  const title = !hasContact
    ? "Ce dresseur n'a pas partagé ses moyens de contact."
    : emptyForThisTab
      ? "Aucune carte concernée pour cette action."
      : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="btn-gold flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
    >
      <spec.Icon className="h-5 w-5" />
      {spec.label}
    </button>
  );
}

const SPECS: Record<"buy" | "sell" | "trade", { label: string; Icon: React.ElementType }> = {
  buy:   { label: "Proposer l'achat",    Icon: ShoppingCart },
  sell:  { label: "Proposer la vente",   Icon: HandCoins },
  trade: { label: "Proposer l'échange",  Icon: ArrowLeftRight },
};
