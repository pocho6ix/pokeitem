"use client";

/**
 * VariantStack — overlay en bas à droite d'une carte qui résume quelles
 * variantes (Normale / Reverse / Reverse Pokéball / Reverse Masterball)
 * existent pour la carte et lesquelles sont possédées.
 *
 * Chaque variante est une Pokéball SVG color-codée :
 *   - calotte rouge    → Normale
 *   - calotte jaune    → Reverse
 *   - calotte bleue    → Reverse Pokéball
 *   - calotte violette → Reverse Masterball
 *
 * Possédée = pleine couleur ; non possédée = grisée (opacity 0.35).
 * Un pill `×N` s'affiche à gauche de la Pokéball quand la quantité est ≥ 2.
 *
 * Stacking order : Normale en bas, Masterball au sommet (indépendamment de
 * l'ordre d'entrée dans `available` — on filtre/ordonne via VARIANT_ORDER).
 *
 * `FIRST_EDITION` n'est PAS un `VariantType` : la présence de cette variante
 * est signalée par le stamp rond sur la gauche (`FirstEditionStamp`), single
 * source of truth pour les 4 extensions WOTC.
 */
import { Tooltip } from "@/components/ui/Tooltip";
import { CardVersion } from "@/data/card-versions";

export type VariantType = "normal" | "reverse" | "pokeball" | "masterball";

/** Ordre canonique bas→haut dans la stack. */
export const VARIANT_ORDER: readonly VariantType[] = [
  "normal",
  "reverse",
  "pokeball",
  "masterball",
] as const;

/** Couleur de la calotte supérieure de la Pokéball (variante possédée). */
export const VARIANT_COLORS: Record<VariantType, string> = {
  normal:     "#dc2626", // rouge
  reverse:    "#fbbf24", // jaune
  pokeball:   "#3b82f6", // bleu
  masterball: "#a855f7", // violet
};

export const VARIANT_LABELS: Record<VariantType, string> = {
  normal:     "Normale",
  reverse:    "Reverse",
  pokeball:   "Reverse Pokéball",
  masterball: "Reverse Masterball",
};

/**
 * Mapping CardVersion (enum DB) → VariantType.
 * FIRST_EDITION est volontairement `null` : signalé à gauche via le stamp.
 */
export function cardVersionToVariantType(v: CardVersion): VariantType | null {
  switch (v) {
    case CardVersion.NORMAL:             return "normal";
    case CardVersion.REVERSE:            return "reverse";
    case CardVersion.REVERSE_POKEBALL:   return "pokeball";
    case CardVersion.REVERSE_MASTERBALL: return "masterball";
    case CardVersion.FIRST_EDITION:      return null;
    default:                             return null;
  }
}

// ── SVG Pokéball ──────────────────────────────────────────────────────────

interface VariantPokeballProps {
  variant: VariantType;
  owned: boolean;
  size?: number; // px, défaut 18
  className?: string;
}

/**
 * Pokéball SVG isolée — utile pour les vues à 1 seule variante (cartes
 * doublées, profil public). Pour le stack multi-variantes, utiliser
 * `<VariantStack />`.
 */
export function VariantPokeball({
  variant,
  owned,
  size = 18,
  className,
}: VariantPokeballProps) {
  if (owned) {
    const color = VARIANT_COLORS[variant];
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="11" fill="white" stroke="black" strokeWidth="1.2" />
        <path d="M 1 12 A 11 11 0 0 1 23 12 Z" fill={color} />
        <rect x="1" y="11" width="22" height="2" fill="black" />
        <circle cx="12" cy="12" r="3" fill="white" stroke="black" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ opacity: 0.35 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="11" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
      <path d="M 1 12 A 11 11 0 0 1 23 12 Z" fill="#94a3b8" />
      <rect x="1" y="11" width="22" height="2" fill="#64748b" />
      <circle cx="12" cy="12" r="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
    </svg>
  );
}

// ── Counter pill ──────────────────────────────────────────────────────────

function CounterPill({ value }: { value: number }) {
  // Cap à 99+ pour éviter tout débordement visuel sur les grosses quantités.
  const display = value >= 100 ? "99+" : String(value);
  return (
    <span className="rounded bg-black/75 px-1 py-px text-[9px] font-medium leading-none tracking-wide text-white whitespace-nowrap">
      ×{display}
    </span>
  );
}

// ── Full stack ────────────────────────────────────────────────────────────

interface VariantStackProps {
  /** Liste des variantes applicables à cette carte. */
  available: readonly VariantType[];
  /** Nombre d'exemplaires possédés par variante. Absent = 0. */
  counts: Partial<Record<VariantType, number>>;
  /** Classes supplémentaires (position override notamment). */
  className?: string;
}

/**
 * Stack vertical bas→haut des Pokéballs. Positionné en `absolute` en
 * bas-droite de l'illustration — le parent doit être en `position: relative`.
 */
export function VariantStack({
  available,
  counts,
  className = "",
}: VariantStackProps) {
  if (!available || available.length === 0) return null;

  // Filtre+ordonne strictement via VARIANT_ORDER : les variantes inconnues
  // ou celles absentes de `available` sont ignorées. Cela garde l'ordre
  // visuel stable (Normal en bas, Masterball en haut) quel que soit l'ordre
  // de `available`.
  const stack = VARIANT_ORDER.filter((v) => available.includes(v));
  if (stack.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Variantes disponibles"
      className={`absolute bottom-1.5 right-1.5 z-10 flex flex-col-reverse items-end gap-1 ${className}`}
    >
      {stack.map((v) => {
        const raw = counts[v] ?? 0;
        const owned = raw >= 1;
        const display = raw >= 100 ? "99+" : String(raw);
        const tooltipLabel = owned
          ? raw >= 2
            ? `${VARIANT_LABELS[v]} · Possédée ×${display}`
            : `${VARIANT_LABELS[v]} · Possédée`
          : `${VARIANT_LABELS[v]} · Manquante`;
        const ariaLabel = owned
          ? raw >= 2
            ? `${VARIANT_LABELS[v]} — possédée ×${display}`
            : `${VARIANT_LABELS[v]} — possédée`
          : `${VARIANT_LABELS[v]} — non possédée`;
        return (
          <Tooltip
            key={v}
            content={tooltipLabel}
            side="left"
            delayMs={300}
            aria-label={ariaLabel}
          >
            <span className="flex items-center gap-1" role="img" aria-label={ariaLabel}>
              {raw >= 2 && <CounterPill value={raw} />}
              <VariantPokeball variant={v} owned={owned} size={18} />
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}
