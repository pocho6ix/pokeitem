"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Copy, Mail, AtSign } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  generateProposalMessage,
  type ProposalContext,
  type ProposalProfile,
  type ProposalType,
} from "@/lib/trade/generateProposalMessage";

const TWITTER_COMPOSE_URL = "https://twitter.com/messages/compose";

/**
 * Bottom sheet that renders the pre-formatted proposal message, lets the
 * user edit it inline, and offers one contact channel per row. Never writes
 * to the DB — the whole flow is "copy + paste into Discord/email/Twitter".
 */
export interface TradeProposalSheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  type:     ProposalType;
  context:  ProposalContext;
  target: {
    displayName: string;
    discord: string | null;
    email:   string | null;
    twitter: string | null;
  };
  myProfile: ProposalProfile;
}

export function TradeProposalSheet({
  isOpen, onClose, type, context, target, myProfile,
}: TradeProposalSheetProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Regenerate the default message on every open (so edits aren't carried
  // over to a future session) but let the user freely edit while open.
  const defaultMessage = useMemo(
    () => generateProposalMessage(type, context, target.displayName, myProfile),
    [type, context, target.displayName, myProfile],
  );
  const [message, setMessage] = useState(defaultMessage);

  // Reset the draft to the latest default each time we reopen.
  useEffect(() => {
    if (isOpen) setMessage(defaultMessage);
  }, [isOpen, defaultMessage]);

  // Esc + scroll-lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contacts: Array<{ kind: "discord" | "email" | "twitter"; value: string }> = [];
  if (target.discord) contacts.push({ kind: "discord", value: target.discord });
  if (target.email)   contacts.push({ kind: "email",   value: target.email });
  if (target.twitter) contacts.push({ kind: "twitter", value: target.twitter });

  // ── Copy helpers ─────────────────────────────────────────────────────
  async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fallthrough */ }
    }
    // Fallback for very old browsers / iframes without permission.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleDiscord() {
    const ok = await copyToClipboard(message);
    if (!ok) {
      toast("Impossible de copier. Sélectionne et copie manuellement.", "error");
      return;
    }
    toast(`Message copié ! Colle-le dans Discord à ${target.discord}`, "success");
    // If the "discord" value looks like an invite link, offer to open it.
    if (target.discord && /^(https?:\/\/)?discord\.gg\//.test(target.discord)) {
      const url = target.discord.startsWith("http") ? target.discord : `https://${target.discord}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
    onClose();
  }

  function handleEmail() {
    if (!target.email) return;
    const subject = `Échange Pokéitem avec ${myProfile.displayName}`;
    const mailto  = `mailto:${encodeURIComponent(target.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
    onClose();
  }

  async function handleTwitter() {
    const ok = await copyToClipboard(message);
    if (!ok) {
      toast("Impossible de copier. Sélectionne et copie manuellement.", "error");
      return;
    }
    toast(`Message copié ! Colle-le dans le DM à ${target.twitter}`, "success");
    window.open(TWITTER_COMPOSE_URL, "_blank", "noopener,noreferrer");
    onClose();
  }

  // Single-channel shortcut — if only one contact exists, surface it as the
  // primary button and skip the "Envoyer via" section header.
  const singleChannel = contacts.length === 1 ? contacts[0] : null;
  const charCount = message.length;
  const tooLong   = charCount > 5000;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-sheet-title"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl shadow-black/60 sm:rounded-3xl sm:border"
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <h2 id="proposal-sheet-title" className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
            📝 Ta proposition
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <label htmlFor="proposal-message" className="sr-only">Message éditable</label>
          <textarea
            id="proposal-message"
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[200px] max-h-[400px] w-full resize-y rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-3 py-3 text-[13px] leading-relaxed text-[var(--text-primary)] focus:border-[#E7BA76] focus:outline-none focus:ring-2 focus:ring-[#E7BA76]/30"
            spellCheck={false}
          />
          <div className="mt-1 flex items-center justify-between px-1">
            <span className={`text-[11px] ${tooLong ? "text-amber-400" : "text-[var(--text-tertiary)]"}`}>
              {charCount.toLocaleString("fr-FR")} caractère{charCount > 1 ? "s" : ""}
              {tooLong && " — long, pense à raccourcir pour Twitter"}
            </span>
            <button
              type="button"
              onClick={() => setMessage(defaultMessage)}
              className="text-[11px] font-medium text-[var(--text-tertiary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
            >
              Réinitialiser
            </button>
          </div>

          {/* Contacts */}
          {contacts.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3 text-center text-xs text-[var(--text-tertiary)]">
              {target.displayName} n&apos;a pas partagé de moyen de contact.
              Copie le message et envoie-le par le canal de ton choix.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {!singleChannel && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Envoyer via
                </p>
              )}
              {contacts.map((c, i) => {
                // The first available contact gets the gold treatment; the
                // rest render as ghost buttons.
                const primary = i === 0;
                if (c.kind === "discord") {
                  return (
                    <ChannelButton
                      key="discord"
                      primary={primary}
                      onClick={handleDiscord}
                      leading={<Image src="/discord_logo.png" alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />}
                      title="Copier pour Discord"
                      subtitle={c.value}
                      trailing={<Copy className="h-4 w-4 opacity-70" />}
                    />
                  );
                }
                if (c.kind === "email") {
                  return (
                    <ChannelButton
                      key="email"
                      primary={primary}
                      onClick={handleEmail}
                      leading={<Mail className="h-5 w-5 shrink-0 text-[#E7BA76]" />}
                      title="Envoyer par email"
                      subtitle={c.value}
                    />
                  );
                }
                return (
                  <ChannelButton
                    key="twitter"
                    primary={primary}
                    onClick={handleTwitter}
                    leading={<AtSign className="h-5 w-5 shrink-0 text-[#1DA1F2]" />}
                    title="Copier pour Twitter / X"
                    subtitle={c.value.startsWith("@") ? c.value : `@${c.value}`}
                    trailing={<Copy className="h-4 w-4 opacity-70" />}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t border-[var(--border-default)] px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── ChannelButton ───────────────────────────────────────────────────────────

function ChannelButton({
  primary, onClick, leading, title, subtitle, trailing,
}: {
  primary:   boolean;
  onClick:   () => void;
  leading:   React.ReactNode;
  title:     string;
  subtitle:  string;
  trailing?: React.ReactNode;
}) {
  const cls = primary
    ? "flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-4 py-3 text-left text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90"
    : "flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]";
  return (
    <button type="button" onClick={onClick} className={cls + " w-full"}>
      {leading}
      <span className="flex-1">
        <span className={primary ? "block text-sm" : "block text-sm"}>{title}</span>
        <span className={primary ? "block text-[11px] font-data opacity-70" : "block text-[11px] font-data text-[var(--text-tertiary)]"}>
          {subtitle}
        </span>
      </span>
      {trailing}
    </button>
  );
}
