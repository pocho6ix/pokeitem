import type { Metadata } from "next";
import { ConnexionForm } from "./ConnexionForm";

export const metadata: Metadata = {
  title: "Connexion | PokeItem",
};

export default function ConnexionPage() {
  return <ConnexionForm />;
}
