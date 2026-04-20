"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SharingSettingsClient } from "./SharingSettingsClient";

export default function SharingSettingsPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion");
    }
  }, [status, router]);

  if (status !== "authenticated") return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <SharingSettingsClient />
    </div>
  );
}
