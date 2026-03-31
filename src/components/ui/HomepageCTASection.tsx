"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

export function HomepageCTASection() {
  const { data: session, status } = useSession();

  if (status === "loading" || session) return null;

  return (
    <section className="py-20 bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">
          Prêt à gérer votre collection ?
        </h2>
        <p className="mt-4 text-[var(--text-secondary)]">
          Rejoignez PokeItem et commencez à suivre la valeur de vos items Pokémon scellés dès aujourd&apos;hui.
        </p>
        <Link
          href="/inscription"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-black shadow-lg hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          Créer mon compte gratuitement
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
