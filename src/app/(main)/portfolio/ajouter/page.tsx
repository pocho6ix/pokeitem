import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ajouter un item | Ma Collection | PokeItem",
  description:
    "Ajoutez un nouvel item a votre collection de produits Pokemon scelles.",
};

export default function AjouterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Ajouter un item
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Selectionnez un produit dans le catalogue pour l&apos;ajouter a votre
          collection.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] shadow-md shadow-[#E7BA76]/30">
          <svg
            className="h-8 w-8 text-[#2A1A06]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Parcourir le catalogue
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Naviguez dans le catalogue par série et extension pour trouver le produit
          que vous souhaitez ajouter a votre collection.
        </p>
        <Link
          href="/collection/produits"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F2D58A] via-[#E7BA76] to-[#C99A4F] px-6 text-sm font-semibold text-[#2A1A06] shadow-md shadow-[#E7BA76]/30 transition-opacity hover:opacity-90"
        >
          Voir le catalogue
        </Link>
      </div>
    </div>
  );
}
