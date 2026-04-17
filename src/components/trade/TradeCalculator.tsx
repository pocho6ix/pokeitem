"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, HandCoins, ArrowLeftRight, Info } from "lucide-react";
import { CardDetailModal } from "@/components/cards/CardDetailModal";
import { ContactBlock } from "./ContactBlock";

// ─── Types (mirror /api/users/:slug/trade-calculator) ────────────────────────

type CardSource = "doubles" | "collection";

interface CardPayload {
  cardId:     string;
  name:       string;
  setId:      string;
  setName:    string;
  number:     string;
  imageUrl:   string | null;
  rarity:     string | null;
  valueCents: number;
  source:     CardSource;
}

interface Section {
  cards:           CardPayload[];
  totalValueCents: number;
  count?:          number;
}

interface TradeSection {
  possible:           boolean;
  iGive:              Section;
  iReceive:           Section;
  complementCents:    number;
  complementDirection: "me_to_them" | "them_to_me" | "none";
  balancePercent:      number;
}

interface CalculatorPayload {
  canBuy:  Section;
  canSell: Section;
  trade:   TradeSection;
  hiddenSections: string[];
  isSelf:  boolean;
}

type TabKey = "buy" | "sell" | "trade";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function groupBySet(cards: CardPayload[]): { setId: string; setName: string; cards: CardPayload[] }[] {
  const map = new Map<string, { setId: string; setName: string; cards: CardPayload[] }>();
  for (const c of cards) {
    let g = map.get(c.setId);
    if (!g) {
      g = { setId: c.setId, setName: c.setName, cards: [] };
      map.set(c.setId, g);
    }
    g.cards.push(c);
  }
  // Sort cards within each set by number (natural)
  for (const g of map.values()) {
    g.cards.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }
  return Array.from(map.values()).sort((a, b) => a.setName.localeCompare(b.setName));
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface TradeCalculatorProps {
  slug:        string;
  displayName: string;
  contact: {
    discord: string | null;
    email:   string | null;
    twitter: string | null;
  };
}

export function TradeCalculator({ slug, displayName, contact }: TradeCalculatorProps) {
  const router = useRouter();
  const [data,    setData]    = useState<CalculatorPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<TabKey>("buy");
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/users/${slug}/trade-calculator`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, body: j })))
      .then((res) => {
        if (cancelled) return;
        if (res.status === 404) {
          // Owner toggled share off while we were loading.
          router.replace("/echanges?removed=1");
          return;
        }
        if (!res.ok) throw new Error(res.body?.error ?? "Erreur");
        setData(res.body);
        // Auto-select the most useful tab on first load.
        if (res.body.trade?.possible)        setTab("trade");
        else if ((res.body.canBuy?.count ?? 0) > 0)  setTab("buy");
        else if ((res.body.canSell?.count ?? 0) > 0) setTab("sell");
        else                                  setTab("buy");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, router]);

  const tradePossible = !!data?.trade.possible;
  const buyCount  = data?.canBuy.count  ?? 0;
  const sellCount = data?.canSell.count ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) return <CalculatorSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm font-semibold text-red-400">Impossible de calculer l&apos;échange.</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {/* Tabs */}
      <div role="tablist" aria-label="Calculateur d'échange" className="flex gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
        <TabButton
          active={tab === "buy"}
          onClick={() => setTab("buy")}
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          label="Acheter"
          count={buyCount}
        />
        <TabButton
          active={tab === "sell"}
          onClick={() => setTab("sell")}
          icon={<HandCoins className="h-3.5 w-3.5" />}
          label="Vendre"
          count={sellCount}
        />
        <TabButton
          active={tab === "trade"}
          onClick={() => tradePossible && setTab("trade")}
          disabled={!tradePossible}
          title={tradePossible ? undefined : "Un échange nécessite des cartes des deux côtés"}
          icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          label="Échange"
          badge={tradePossible ? "!" : undefined}
        />
      </div>

      <div className="mt-4">
        {tab === "buy"   && (
          <BuySellPane
            kind="buy"
            section={data.canBuy}
            displayName={displayName}
            hiddenSections={data.hiddenSections}
            onOpenDetail={setDetailCardId}
          />
        )}
        {tab === "sell"  && (
          <BuySellPane
            kind="sell"
            section={data.canSell}
            displayName={displayName}
            hiddenSections={data.hiddenSections}
            onOpenDetail={setDetailCardId}
          />
        )}
        {tab === "trade" && tradePossible && (
          <TradePane
            trade={data.trade}
            displayName={displayName}
            onOpenDetail={setDetailCardId}
          />
        )}
      </div>

      {/* Contact — pinned below the calculator, always visible */}
      <div className="mt-6">
        <ContactBlock
          displayName={displayName}
          discord={contact.discord}
          email={contact.email}
          twitter={contact.twitter}
        />
      </div>

      {/* Card detail modal — opened from any list of cards in any pane */}
      {detailCardId && (
        <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
      )}
    </>
  );
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabButton({
  active, disabled, onClick, icon, label, count, badge, title,
}: {
  active:   boolean;
  disabled?: boolean;
  onClick:  () => void;
  icon:     React.ReactNode;
  label:    string;
  count?:   number;
  badge?:   string;
  title?:   string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={disabled}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
          : disabled
            ? "cursor-not-allowed text-[var(--text-tertiary)]/70"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="text-[var(--text-tertiary)]">({count})</span>
      )}
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E7BA76] text-[9px] font-bold text-[#2A1A06]">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Buy / Sell pane ─────────────────────────────────────────────────────────

function BuySellPane({
  kind, section, displayName, hiddenSections, onOpenDetail,
}: {
  kind: "buy" | "sell";
  section: Section;
  displayName: string;
  hiddenSections: string[];
  onOpenDetail: (cardId: string) => void;
}) {
  // Show a helpful "no data" explanation when the owner hides the source
  // we'd need for this tab.
  if (kind === "buy" && (hiddenSections.includes("cards") && hiddenSections.includes("doubles"))) {
    return <EmptyNote>{displayName} n&apos;a pas partagé sa collection.</EmptyNote>;
  }
  if (kind === "sell" && hiddenSections.includes("wishlist")) {
    return <EmptyNote>{displayName} n&apos;a pas partagé sa liste de souhaits. Tu ne peux pas voir ce qu&apos;il cherche.</EmptyNote>;
  }
  if (section.count === 0) {
    return kind === "buy"
      ? <EmptyNote>Tu n&apos;as aucune carte de ta wishlist chez {displayName}.</EmptyNote>
      : <EmptyNote>Aucune de tes cartes n&apos;intéresse {displayName}.</EmptyNote>;
  }

  const groups = useMemo(() => groupBySet(section.cards), [section.cards]);
  const missingPrice = section.cards.some((c) => c.valueCents === 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-lg bg-[var(--bg-card)]/60 px-3 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {section.count} carte{(section.count ?? 0) > 1 ? "s" : ""}
        </span>
        <span className="font-data text-sm font-semibold text-[#E7BA76]">
          {formatEur(section.totalValueCents)}
        </span>
      </div>

      {missingPrice && <MissingPriceHint />}

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.setId}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {g.setName} · {g.setId} ({g.cards.length})
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {g.cards.map((c) => (
                <CardTile key={c.cardId} card={c} onOpen={() => onOpenDetail(c.cardId)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─── Trade pane ──────────────────────────────────────────────────────────────

function TradePane({
  trade, displayName, onOpenDetail,
}: {
  trade: TradeSection;
  displayName: string;
  onOpenDetail: (cardId: string) => void;
}) {
  const complementAbs = Math.abs(trade.complementCents);
  const isBalanced    = trade.complementDirection === "none";

  const complementText = isBalanced
    ? "Échange parfaitement équilibré !"
    : trade.complementDirection === "them_to_me"
      ? `${displayName} peut te verser un complément de ${formatEur(complementAbs)}`
      : `Tu peux verser un complément de ${formatEur(complementAbs)} à ${displayName}`;

  const missingPrice =
    trade.iGive.cards.some((c) => c.valueCents === 0) ||
    trade.iReceive.cards.some((c) => c.valueCents === 0);

  return (
    <div>
      {/* Summary blocks */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <SummaryTile label="Tu donnes"  count={trade.iGive.cards.length}    totalCents={trade.iGive.totalValueCents} />
        <ArrowLeftRight className="h-5 w-5 text-[#E7BA76]" />
        <SummaryTile label="Tu reçois"  count={trade.iReceive.cards.length} totalCents={trade.iReceive.totalValueCents} />
      </div>

      {/* Balance */}
      <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
        <p className={`text-sm font-medium ${isBalanced ? "text-emerald-400" : "text-[var(--text-primary)]"}`}>
          {complementText}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F]"
              style={{ width: `${Math.min(100, Math.max(0, trade.balancePercent))}%` }}
            />
          </div>
          <span className="font-data text-[11px] tabular-nums text-[var(--text-tertiary)]">
            Équilibre {trade.balancePercent.toFixed(1)} %
          </span>
        </div>
      </div>

      {missingPrice && <div className="mt-3"><MissingPriceHint /></div>}

      {/* Card lists */}
      <div className="mt-4 space-y-4">
        <TradeCardList
          title="Tu donnes"
          cards={trade.iGive.cards}
          onOpen={onOpenDetail}
        />
        <TradeCardList
          title="Tu reçois"
          cards={trade.iReceive.cards}
          onOpen={onOpenDetail}
        />
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3 text-xs text-[var(--text-secondary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        <p>
          Les montants sont basés sur les prix du marché FR. Discutez
          ensemble pour ajuster le complément ou la sélection finale.
        </p>
      </div>
    </div>
  );
}

function SummaryTile({ label, count, totalCents }: { label: string; count: number; totalCents: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
        {count} carte{count > 1 ? "s" : ""}
      </p>
      <p className="mt-0.5 font-data text-xs text-[#E7BA76]">{formatEur(totalCents)}</p>
    </div>
  );
}

function TradeCardList({
  title, cards, onOpen,
}: {
  title: string;
  cards: CardPayload[];
  onOpen: (cardId: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {title} ({cards.length})
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {cards.map((c) => (
          <CardTile key={c.cardId} card={c} onOpen={() => onOpen(c.cardId)} />
        ))}
      </div>
    </section>
  );
}

// ─── Card tile ───────────────────────────────────────────────────────────────

function CardTile({ card, onOpen }: { card: CardPayload; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E7BA76] rounded-lg"
      aria-label={`${card.name} — ${card.number}`}
    >
      <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg bg-[var(--bg-secondary)] shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={`${card.name} — ${card.number}`}
            fill
            sizes="(max-width: 640px) 33vw, 20vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
            <span className="text-xs font-bold text-[var(--text-secondary)]">{card.number}</span>
            <span className="text-[10px] leading-tight text-[var(--text-tertiary)]">{card.name}</span>
          </div>
        )}
        <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
          {card.number}
        </div>
        {card.valueCents > 0 && (
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {formatEur(card.valueCents)}
          </div>
        )}
        <SourceBadge source={card.source} />
      </div>
      <p className="mt-1 truncate px-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
        {card.name}
      </p>
    </button>
  );
}

function SourceBadge({ source }: { source: CardSource }) {
  const label = source === "doubles" ? "doubles" : "collection";
  const cls   = source === "doubles"
    ? "bg-emerald-500/80 text-white"
    : "bg-[#E7BA76]/80 text-[#2A1A06]";
  return (
    <span className={`absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none backdrop-blur-sm ${cls}`}>
      {label}
    </span>
  );
}

// ─── Empty / hint / skeleton ─────────────────────────────────────────────────

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/40 p-8 text-center">
      <p className="text-sm text-[var(--text-secondary)]">{children}</p>
    </div>
  );
}

function MissingPriceHint() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>Certaines cartes n&apos;ont pas de prix de référence et ne sont pas incluses dans le calcul.</p>
    </div>
  );
}

function CalculatorSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 flex-1 animate-pulse rounded-lg bg-[var(--bg-card)]/50" />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-[var(--bg-card)]/40" />
        ))}
      </div>
    </div>
  );
}
