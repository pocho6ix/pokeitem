"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function RedirectClient() {
  const router = useRouter();
  const params = useParams<{ blocSlug: string }>();

  useEffect(() => {
    if (params?.blocSlug) {
      router.replace(`/collection/cartes/${params.blocSlug}`);
    }
  }, [params, router]);

  return null;
}
