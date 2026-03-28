import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon profil | PokeItem",
  description: "Gerez votre profil et vos preferences PokeItem.",
};

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Mon profil
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gerez vos informations personnelles et vos preferences
        </p>
      </div>

      {/* User info placeholder */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Informations
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            P
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              Collectionneur Pokemon
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              collectionneur@pokeitem.fr
            </p>
          </div>
        </div>
      </section>

      {/* Settings placeholder */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Preferences
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Devise
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Devise utilisee pour l&apos;affichage des prix
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
              Bientot disponible
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Export des donnees
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Telecharger votre collection au format CSV
              </p>
            </div>
            <span className="text-sm text-[var(--text-tertiary)]">
              Bientot disponible
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
