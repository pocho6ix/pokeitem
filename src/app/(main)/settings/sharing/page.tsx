import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SharingSettingsClient } from "./SharingSettingsClient";

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
