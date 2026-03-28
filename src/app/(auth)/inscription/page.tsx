import type { Metadata } from "next";
import { InscriptionForm } from "./InscriptionForm";

export const metadata: Metadata = {
  title: "Inscription | PokeItem",
};

export default function InscriptionPage() {
  return <InscriptionForm />;
}
