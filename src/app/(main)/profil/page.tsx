import type { Metadata } from "next";
import { ProfilForm } from "@/components/profil/ProfilForm";

export const metadata: Metadata = {
  title: "Mon profil | PokeItem",
  description: "Gérez votre profil et vos préférences PokeItem.",
};

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Mon profil
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <ProfilForm />

      {/* Settings placeholder */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Préférences
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Devise
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Devise utilisée pour l&apos;affichage des prix
              </p>
            </div>
            <span className="font-data text-sm text-[var(--text-primary)]">
              EUR
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Notifications
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Alertes de prix et nouveaux produits
              </p>
            </div>
            <span className="text-sm text-[var(--text-tertiary)]">
              Bientôt disponible
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Export des données
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Télécharger votre collection au format CSV
              </p>
            </div>
            <span className="text-sm text-[var(--text-tertiary)]">
              Bientôt disponible
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
