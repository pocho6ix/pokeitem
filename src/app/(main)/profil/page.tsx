import type { Metadata } from "next";
import { ProfilForm } from "@/components/profil/ProfilForm";
import { TelegramBannerButton } from "@/components/ui/TelegramBannerButton";

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
      <TelegramBannerButton />
    </div>
  );
}
