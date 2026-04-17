"use client";

import { ShoppingCart, HandCoins, ArrowLeftRight } from "lucide-react";

/**
 * Sticky bottom CTA that opens the proposal sheet. Its label and icon track
 * the active tab (Acheter / Vendre / Échange), and it dims to "disabled"
 * when the corresponding section is empty or the target has no contact
 * channel (with a tooltip explaining why).
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
    <div
      className="pointer-events-none fixed bottom-16 left-0 right-0 z-40 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent px-4 pb-3 pt-8 md:bottom-0"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title}
        className="pointer-events-auto flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 text-base font-semibold text-[#2A1A06] shadow-lg shadow-[#E7BA76]/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 animate-in slide-in-from-bottom-2 duration-200"
      >
        <spec.Icon className="h-5 w-5" />
        {spec.label}
      </button>
    </div>
  );
}

const SPECS: Record<"buy" | "sell" | "trade", { label: string; Icon: React.ElementType }> = {
  buy:   { label: "Proposer l'achat",    Icon: ShoppingCart },
  sell:  { label: "Proposer la vente",   Icon: HandCoins },
  trade: { label: "Proposer l'échange",  Icon: ArrowLeftRight },
};
