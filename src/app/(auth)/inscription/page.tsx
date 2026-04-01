import type { Metadata } from "next";
import { Suspense } from "react";
import { InscriptionForm } from "./InscriptionForm";

export const metadata: Metadata = {
  title: "Inscription | PokeItem",
};

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionForm />
    </Suspense>
  );
}
