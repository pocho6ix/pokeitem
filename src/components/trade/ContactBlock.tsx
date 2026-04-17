"use client";

import Image from "next/image";
import { Copy, Mail, AtSign } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export interface ContactBlockProps {
  displayName: string;
  discord:     string | null | undefined;
  email:       string | null | undefined;
  twitter:     string | null | undefined;
}

/**
 * Unified contact card for a public profile. Shown below the calculator on
 * every tab. Renders one row per channel the owner shares; falls back to a
 * single muted "no contact shared" line when they've left everything blank.
 */
export function ContactBlock({ displayName, discord, email, twitter }: ContactBlockProps) {
  const { toast } = useToast();
  const anyContact = Boolean(discord || email || twitter);

  if (!anyContact) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">
          {displayName} n&apos;a pas partagé de moyen de contact.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Contact
      </p>
      <div className="flex flex-col gap-1">
        {discord && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(discord);
              toast(`Discord copié — ${discord}`, "success");
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <Image
              src="/discord_logo.png"
              alt="Discord"
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="flex-1">
              <span className="font-semibold">Discord</span>
              <span className="ml-2 font-data text-xs text-[var(--text-secondary)]">{discord}</span>
            </span>
            <Copy className="h-4 w-4 text-[var(--text-tertiary)]" />
          </button>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <Mail className="h-4 w-4 text-[#E7BA76]" />
            <span className="flex-1">
              <span className="font-semibold">Email</span>
              <span className="ml-2 truncate font-data text-xs text-[var(--text-secondary)]">{email}</span>
            </span>
          </a>
        )}
        {twitter && (
          <a
            href={`https://twitter.com/${twitter.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <AtSign className="h-4 w-4 text-[#1DA1F2]" />
            <span className="flex-1">
              <span className="font-semibold">Twitter</span>
              <span className="ml-2 font-data text-xs text-[var(--text-secondary)]">
                {twitter.startsWith("@") ? twitter : `@${twitter}`}
              </span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
