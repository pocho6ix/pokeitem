import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Désabonnement",
  description: "Désabonnez-vous des communications email de PokeItem en un clic.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DesabonnementPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center shadow-xl">

        {success ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Désabonnement confirmé
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Tu ne recevras plus d&apos;emails de PokeItem.
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Tu peux te réabonner à tout moment depuis les paramètres de ton compte.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Une erreur est survenue
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Impossible de traiter ta demande. Réessaie plus tard.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[var(--bg-secondary)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
