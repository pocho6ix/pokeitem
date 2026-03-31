"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

export function HeroCTAButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <div className="h-12 w-52 rounded-xl bg-white/20 animate-pulse" />
        <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link
          href="/portfolio"
          className="inline-flex items-center justify-center rounded-xl bg-[#E7BA76] px-6 py-3 text-sm font-semibold text-black shadow-lg hover:bg-[#d4a660] transition-colors"
        >
          Voir mon classeur
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <Link
          href="/collection/produits"
          className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Explorer le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-4">
      <Link
        href="/inscription"
        className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
      >
        Commencer gratuitement
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
      <Link
        href="/collection/produits"
        className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        Explorer le catalogue
      </Link>
    </div>
  );
}
