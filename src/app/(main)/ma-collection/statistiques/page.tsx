import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiques | Ma Collection | PokeItem",
  description:
    "Statistiques detaillees de votre collection de produits Pokemon scelles.",
};

export default function StatistiquesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Statistiques de ma collection
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Analyse detaillee de la performance de votre portefeuille
        </p>
      </div>

      {/* Value over time */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Evolution de la valeur
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <span className="text-sm text-[var(--text-tertiary)]">
            Graphique ligne — valeur totale dans le temps
          </span>
        </div>
      </section>

      {/* P&L breakdown */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Repartition du P&amp;L par type
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <span className="text-sm text-[var(--text-tertiary)]">
            Graphique barres — P&amp;L par categorie
          </span>
        </div>
      </section>

      {/* Allocation */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Allocation du portefeuille
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <span className="text-sm text-[var(--text-tertiary)]">
            Treemap — repartition par serie et type
          </span>
        </div>
      </section>
    </div>
  );
}
