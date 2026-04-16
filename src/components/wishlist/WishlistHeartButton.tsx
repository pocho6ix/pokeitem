"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useIsInWishlist, useWishlistStore } from "@/stores/wishlistStore";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Props {
  cardId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WishlistHeartButton({ cardId, size = "md", className }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const isIn = useIsInWishlist(cardId);
  const { add, remove } = useWishlistStore();
  const { toast } = useToast();
  const [animating, setAnimating] = useState(false);

  const sizeClass = size === "sm" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? 10 : size === "md" ? 14 : 18;

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (status !== "authenticated") {
      router.push("/connexion");
      return;
    }
    navigator.vibrate?.(10);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 320);

    if (isIn) {
      remove(cardId);
      try {
        const res = await fetch(`/api/wishlist/cards/${cardId}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast("Retiré de ta liste 💔", "info", {
          action: {
            label: "Annuler",
            onClick: () => {
              add(cardId);
              fetch("/api/wishlist/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cardId }),
              });
            },
          },
        });
      } catch {
        add(cardId);
        toast("Erreur, réessaie", "error");
      }
    } else {
      add(cardId);
      try {
        const res = await fetch("/api/wishlist/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId }),
        });
        if (!res.ok) throw new Error();
        toast("Ajouté à ta liste de souhaits 💜", "success", {
          action: {
            label: "Annuler",
            onClick: () => {
              remove(cardId);
              fetch(`/api/wishlist/cards/${cardId}`, { method: "DELETE" });
            },
          },
        });
      } catch {
        remove(cardId);
        toast("Erreur, réessaie", "error");
      }
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isIn ? "Retirer de la liste de souhaits" : "Ajouter à la liste de souhaits"}
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full transition-transform hover:scale-110",
        "bg-black/45 backdrop-blur-sm",
        animating && (isIn ? "scale-[0.85]" : "scale-[1.25]"),
        className
      )}
    >
      {isIn ? (
        // Filled heart — violet
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="#A855F7"
          stroke="#A855F7"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 4px rgba(168,85,247,0.5))" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ) : (
        // Outline heart — white
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.9"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
