import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | PokeItem",
  description: "La page que vous cherchez n'existe pas ou a été déplacée.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-bold text-blue-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
        Page introuvable
      </h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        La page que vous cherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Accueil
        </Link>
        <Link
          href="/collection"
          className="rounded-lg border border-[var(--border-default)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Collection
        </Link>
      </div>
    </div>
  );
}
