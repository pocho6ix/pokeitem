"use client";

import { CardScanner } from "@/components/scanner/CardScanner";
import { useAuth } from "@/lib/auth-context";

export default function ScannerPage() {
  const { status } = useAuth();

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-lg font-semibold text-[var(--text-primary)]">
          Connexion requise
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Connectez-vous pour utiliser le scanner de cartes.
        </p>
      </div>
    );
  }

  return <CardScanner />;
}
