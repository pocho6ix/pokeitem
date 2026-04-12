"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const CARDS = ["Dracaufeu", "Pikachu", "Mewtwo", "Florizarre", "Tortank", "Évoli", "Rayquaza", "Lucario"];

export function HeroSearchBar() {
  const router = useRouter();
  const [card, setCard] = useState<string>("");

  useEffect(() => {
    setCard(CARDS[Math.floor(Math.random() * CARDS.length)]);
  }, []);

  return (
    <button
      onClick={() => router.push("/collection/cartes")}
      className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:brightness-110"
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
      <span className="text-sm leading-none text-[#9CA3AF]">
        {card ? `Rechercher '${card}'` : "Rechercher une carte…"}
      </span>
    </button>
  );
}
