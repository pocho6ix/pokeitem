import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SharingSettingsClient } from "./SharingSettingsClient";

// Auth-gated settings panel — redirects unauthenticated visitors. Not
// indexable; `follow: true` matches the portfolio convention.
export const metadata: Metadata = {
  title: "Partage du classeur",
  description:
    "Gérez le partage de votre classeur Pokémon TCG : activez ou désactivez l'accès public à votre collection PokeItem.",
  robots: { index: false, follow: true },
};

export default async function SharingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <SharingSettingsClient />
    </div>
  );
}
