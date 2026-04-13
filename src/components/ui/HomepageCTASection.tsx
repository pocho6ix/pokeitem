"use client";

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
      </div>
    </section>
  );
}
