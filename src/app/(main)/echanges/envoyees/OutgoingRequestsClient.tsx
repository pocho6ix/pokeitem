"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowLeftRight, Check, X, Clock, Ban } from "lucide-react";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { useToast } from "@/components/ui/Toast";

type Status = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
type Direction = "NONE" | "FROM_TO_TO" | "TO_TO_FROM";

interface OutgoingRequest {
  id:                    string;
  status:                Status;
  createdAt:             string;
  respondedAt:           string | null;
  givenCount:            number;
  receivedCount:         number;
  givenValueCents:       number;
  receivedValueCents:    number;
  compensationCents:     number;
  compensationDirection: Direction;
  recipient: {
    slug:      string | null;
    name:      string;
    avatarUrl: string | null;
  };
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_META: Record<Status, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:  { label: "En attente",    icon: Clock, className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  ACCEPTED: { label: "Acceptée",      icon: Check, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  DECLINED: { label: "Refusée",       icon: X,     className: "bg-red-500/15 text-red-300 border-red-500/30" },
  CANCELED: { label: "Annulée",       icon: Ban,   className: "bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-default)]" },
};

export function OutgoingRequestsClient({
  requests: initialRequests,
}: {
  requests: OutgoingRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const { toast } = useToast();

  const hasAny = requests.length > 0;
  const grouped = useMemo(() => {
    const order: Status[] = ["PENDING", "ACCEPTED", "DECLINED", "CANCELED"];
    const map = new Map<Status, OutgoingRequest[]>();
    for (const s of order) map.set(s, []);
    for (const r of requests) map.get(r.status)?.push(r);
    return order.map((s) => ({ status: s, items: map.get(s) ?? [] })).filter((g) => g.items.length > 0);
  }, [requests]);

  async function handleCancel(id: string) {
    // Optimistic flip
    const before = requests;
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "CANCELED" } : r));
    try {
      const res = await fetch(`/api/trade-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      if (!res.ok) throw new Error();
      toast("Demande annulée", "info");
    } catch {
      setRequests(before);
      toast("Impossible d'annuler — réessaye", "error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/echanges"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Échanges
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
        <ArrowLeftRight className="h-5 w-5 text-[#E7BA76]" />
        Mes demandes envoyées
      </h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Suis l&apos;état des échanges que tu as proposés à d&apos;autres dresseurs.
      </p>

      {!hasAny && (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-card)]/50 p-8 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Aucune demande envoyée pour le moment.
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Recherche un dresseur dans <Link href="/echanges" className="font-medium text-[#E7BA76] hover:underline">Échanges</Link>, ouvre son profil, sélectionne les cartes et envoie une proposition.
          </p>
        </div>
      )}

      {hasAny && (
        <div className="mt-6 space-y-6">
          {grouped.map((group) => (
            <section key={group.status}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {STATUS_META[group.status].label} ({group.items.length})
              </h2>
              <ul className="space-y-2">
                {group.items.map((r) => (
                  <RequestRow key={r.id} request={r} onCancel={handleCancel} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request, onCancel }: { request: OutgoingRequest; onCancel: (id: string) => void }) {
  const meta = STATUS_META[request.status];
  const Icon = meta.icon;
  const avatar = request.recipient.avatarUrl ?? getDefaultAvatar(request.recipient.name);

  const complementLine =
    request.compensationDirection === "NONE"
      ? "Échange équilibré"
      : request.compensationDirection === "FROM_TO_TO"
        ? `Tu verses ${formatEur(request.compensationCents)}`
        : `${request.recipient.name} te verse ${formatEur(request.compensationCents)}`;

  return (
    <li className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
      <div className="flex items-center gap-3">
        <Image
          src={avatar}
          alt={request.recipient.name}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            {request.recipient.slug ? (
              <Link href={`/u/${request.recipient.slug}`} className="hover:underline">
                {request.recipient.name}
              </Link>
            ) : (
              request.recipient.name
            )}
            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {request.givenCount} ↔ {request.receivedCount} · {formatDate(request.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-[var(--bg-secondary)]/60 px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-tertiary)]">Tu donnes</span>
          <span className="font-data text-[var(--text-primary)]">
            {request.givenCount} carte{request.givenCount > 1 ? "s" : ""} · {formatEur(request.givenValueCents)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[var(--text-tertiary)]">Tu reçois</span>
          <span className="font-data text-[var(--text-primary)]">
            {request.receivedCount} carte{request.receivedCount > 1 ? "s" : ""} · {formatEur(request.receivedValueCents)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-[var(--border-default)] pt-1">
          <span className="text-[var(--text-tertiary)]">Complément</span>
          <span className={`font-medium ${request.compensationDirection === "NONE" ? "text-emerald-400" : "text-[#E7BA76]"}`}>
            {complementLine}
          </span>
        </div>
      </div>
      {request.status === "PENDING" && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onCancel(request.id)}
            className="text-xs font-medium text-red-400 hover:underline"
          >
            Annuler la demande
          </button>
        </div>
      )}
    </li>
  );
}
