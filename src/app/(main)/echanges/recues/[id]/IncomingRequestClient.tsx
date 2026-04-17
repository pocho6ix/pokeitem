"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, X, ArrowLeftRight } from "lucide-react";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { useToast } from "@/components/ui/Toast";

type Status = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
type Direction = "NONE" | "FROM_TO_TO" | "TO_TO_FROM";

interface CardItem {
  id:       string;
  name:     string;
  number:   string;
  rarity:   string | null;
  imageUrl: string | null;
  serie:    { id: string; name: string; abbreviation: string | null };
}

interface IncomingRequest {
  id:                    string;
  status:                Status;
  createdAt:             string;
  respondedAt:           string | null;
  message:               string | null;
  givenValueCents:       number;
  receivedValueCents:    number;
  compensationCents:     number;
  compensationDirection: Direction;
  fromUser: { name: string; avatarUrl: string | null; slug: string | null };
  cardsGiven:    CardItem[];
  cardsReceived: CardItem[];
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export function IncomingRequestClient({
  request: initial, viewerRole,
}: {
  request: IncomingRequest;
  viewerRole: "sender" | "recipient";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState(initial);
  const [pending, setPending] = useState(false);

  async function respond(desired: "ACCEPTED" | "DECLINED") {
    setPending(true);
    try {
      const res = await fetch(`/api/trade-requests/${request.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: desired }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Erreur");
      setRequest((r) => ({ ...r, status: desired, respondedAt: new Date().toISOString() }));
      toast(desired === "ACCEPTED" ? "Demande acceptée ✅" : "Demande refusée", desired === "ACCEPTED" ? "success" : "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setPending(false);
    }
  }

  const avatar = request.fromUser.avatarUrl ?? getDefaultAvatar(request.fromUser.name);
  const complementLine =
    request.compensationDirection === "NONE"
      ? "Échange équilibré"
      // Here we're the RECIPIENT of the request. The request was modelled as
      // "sender gives X, sender receives Y". So for us, gives↔receives flip:
      : request.compensationDirection === "FROM_TO_TO"
        ? `${request.fromUser.name} te verse ${formatEur(request.compensationCents)}`
        : `Tu verses ${formatEur(request.compensationCents)} à ${request.fromUser.name}`;

  const statusBadge = (() => {
    switch (request.status) {
      case "ACCEPTED": return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"><Check className="h-3 w-3" /> Acceptée</span>;
      case "DECLINED": return <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300"><X className="h-3 w-3" /> Refusée</span>;
      case "CANCELED": return <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]">Annulée</span>;
      default: return null;
    }
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href={viewerRole === "sender" ? "/echanges/envoyees" : "/echanges"} className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
        <Image src={avatar} alt={request.fromUser.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-[var(--text-primary)]">
              {request.fromUser.slug ? (
                <Link href={`/u/${request.fromUser.slug}`} className="hover:underline">{request.fromUser.name}</Link>
              ) : request.fromUser.name}
            </p>
            {statusBadge}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {viewerRole === "recipient" ? "te propose un échange" : "— demande que tu as envoyée"}
          </p>
        </div>
      </div>

      {/* Trade recap */}
      <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <SideBlock
          title={viewerRole === "recipient" ? `${request.fromUser.name} te donne` : "Tu donnes"}
          cards={request.cardsGiven}
          totalCents={request.givenValueCents}
        />
        <div className="my-3 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
            <ArrowLeftRight className="h-4 w-4 text-[#E7BA76]" />
          </div>
        </div>
        <SideBlock
          title={viewerRole === "recipient" ? "Tu donnes" : `${request.fromUser.name} te donne`}
          cards={request.cardsReceived}
          totalCents={request.receivedValueCents}
        />

        <div className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${request.compensationDirection === "NONE" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-[#E7BA76]/30 bg-[#E7BA76]/10 text-[#E7BA76]"}`}>
          {complementLine}
        </div>
      </div>

      {request.message && (
        <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Message</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{request.message}</p>
        </div>
      )}

      {viewerRole === "recipient" && request.status === "PENDING" && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("DECLINED")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            Refuser
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("ACCEPTED")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 py-2.5 text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Accepter
          </button>
        </div>
      )}

      {viewerRole === "recipient" && request.status !== "PENDING" && request.respondedAt && (
        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          Réponse enregistrée le {new Date(request.respondedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. {request.status === "ACCEPTED" && "Contacte le demandeur pour finaliser l'échange."}
        </p>
      )}
    </div>
  );
}

function SideBlock({
  title, cards, totalCents,
}: {
  title: string;
  cards: CardItem[];
  totalCents: number;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {title} · {cards.length} carte{cards.length > 1 ? "s" : ""}
        </h3>
        <span className="font-data text-xs font-semibold text-[#E7BA76]">{formatEur(totalCents)}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cards.map((c) => (
          <div key={c.id} title={`${c.name} — ${c.number}`} className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded bg-[var(--bg-secondary)]">
            {c.imageUrl ? (
              <Image src={c.imageUrl} alt={c.name} fill sizes="68px" className="object-cover" loading="lazy" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] text-[var(--text-tertiary)]">{c.number}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
