"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TILES = [
  {
    label: "Mes cartes",
    href: "/portfolio/cartes",
    description: "Gérez votre collection par série",
    image: "/images/pokemon/dracaufeu.png",
    accent: "from-orange-500/20 to-red-500/10",
  },
  {
    label: "Mes doubles",
    href: "/portfolio/doubles",
    description: "Cartes en doublon",
    image: "/images/pokemon/tortank.png",
    accent: "from-blue-500/20 to-cyan-500/10",
  },
  {
    label: "Mes items",
    href: "/portfolio/items",
    description: "Boosters, ETB et produits scellés",
    image: "/images/pokemon/florizarre.png",
    accent: "from-green-500/20 to-emerald-500/10",
  },
];

export function PortfolioTiles() {
  const pathname = usePathname();
  const isSubPage = pathname !== "/portfolio";

  if (isSubPage) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
      {TILES.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className={`group relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-br ${tile.accent} bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-focus)] hover:-translate-y-0.5 hover:shadow-lg`}
          style={{ aspectRatio: "2 / 1" }}
        >
          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{tile.label}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)] leading-tight hidden sm:block">{tile.description}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.image}
            alt=""
            className="absolute bottom-0 right-0 h-20 w-20 object-contain object-bottom opacity-50 transition-all duration-300 group-hover:opacity-70 group-hover:scale-105 drop-shadow-lg"
          />
        </Link>
      ))}
    </div>
  );
}
