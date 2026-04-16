import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EchangesPageClient } from "./EchangesPageClient";

export default async function EchangesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/connexion");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <EchangesPageClient />
    </div>
  );
}
