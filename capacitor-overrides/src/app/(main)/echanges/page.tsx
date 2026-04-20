"use client";

import { Suspense, useEffect, useState } from "react";
import { EchangesPageClient } from "./EchangesPageClient";
import { fetchApi } from "@/lib/api";

export default function EchangesPage() {
  const [hasActiveShare, setHasActiveShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchApi("/api/share/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setHasActiveShare(Boolean(data?.settings?.isActive));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <EchangesPageClient hasActiveShare={hasActiveShare} />
    </Suspense>
  );
}
