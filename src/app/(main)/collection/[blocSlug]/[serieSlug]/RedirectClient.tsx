"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function RedirectClient() {
  const router = useRouter();
  const params = useParams<{ blocSlug: string; serieSlug: string }>();

  useEffect(() => {
    if (params?.blocSlug && params?.serieSlug) {
      router.replace(`/collection/cartes/${params.blocSlug}/${params.serieSlug}`);
    }
  }, [params, router]);

  return null;
}
