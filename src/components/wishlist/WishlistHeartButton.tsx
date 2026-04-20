"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-context";
import { useIsInWishlist, useWishlistStore } from "@/stores/wishlistStore";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/api";

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

  const sizeClass = size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? 13 : size === "md" ? 17 : 22;

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
        const res = await fetchApi(`/api/wishlist/cards/${cardId}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast("Retiré de ta liste 💔", "info", {
          action: {
            label: "Annuler",
            onClick: () => {
              add(cardId);
              fetchApi("/api/wishlist/cards", {
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
        const res = await fetchApi("/api/wishlist/cards", {
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
              fetchApi(`/api/wishlist/cards/${cardId}`, { method: "DELETE" });
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
        "bg-black/60 backdrop-blur-sm",
        animating && (isIn ? "scale-[0.85]" : "scale-[1.25]"),
        className
      )}
    >
      {isIn ? (
        // Filled heart — violet with strong glow
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="#C084FC"
          stroke="#C084FC"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 5px rgba(192,132,252,0.9)) drop-shadow(0 0 2px rgba(168,85,247,1))" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ) : (
        // Outline heart — bright white with subtle shadow for contrast
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
