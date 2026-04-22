import type { Metadata } from "next";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EchangesPageClient } from "./EchangesPageClient";

// Auth-gated — redirects unauthenticated visitors. Not indexable;
// `follow: true` matches the portfolio convention.
export const metadata: Metadata = {
  title: "Échanges",
  description:
    "Trouvez des partenaires d'échange Pokémon TCG parmi les collectionneurs PokeItem ayant partagé leur classeur.",
  robots: { index: false, follow: true },
};

export default async function EchangesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/connexion");

  const userId = (session.user as { id: string }).id;
  // Only used for the empty-state hint ("to be findable too, activate sharing").
  // A single boolean is enough; no full share row needed.
  const share = await prisma.classeurShare.findUnique({
    where:  { userId },
    select: { isActive: true },
  });

  return (
    <Suspense fallback={null}>
      <EchangesPageClient hasActiveShare={share?.isActive ?? false} />
    </Suspense>
  );
}
