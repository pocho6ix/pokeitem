import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CardScanner } from "@/components/scanner/CardScanner";

export const metadata: Metadata = { title: "Scanner — PokeItem" };

export default async function ScannerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-lg font-semibold text-[var(--text-primary)]">Connexion requise</p>
        <p className="text-sm text-[var(--text-secondary)]">Connectez-vous pour utiliser le scanner de cartes.</p>
      </div>
    );
  }
  return <CardScanner />;
}
