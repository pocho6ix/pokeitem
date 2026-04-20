"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function RedirectClient() {
  const router = useRouter();
  const params = useParams<{ blocSlug: string; serieSlug: string; itemSlug: string }>();

  useEffect(() => {
    if (params?.blocSlug && params?.serieSlug && params?.itemSlug) {
      router.replace(
        `/collection/produits/${params.blocSlug}/${params.serieSlug}/${params.itemSlug}`,
      );
    }
  }, [params, router]);

  return null;
}
