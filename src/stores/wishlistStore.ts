import { create } from "zustand";
import { fetchApi } from "@/lib/api";

interface WishlistStore {
  ids: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (cardId: string) => void;
  remove: (cardId: string) => void;
  has: (cardId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  ids: new Set(),
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetchApi("/api/wishlist/cards/ids");
      if (res.ok) {
        const data = await res.json();
        set({ ids: new Set(data.ids ?? []), hydrated: true });
      }
    } catch { /* silent */ }
  },
  add: (cardId) => set((s) => ({ ids: new Set([...s.ids, cardId]) })),
  remove: (cardId) =>
    set((s) => {
      const n = new Set(s.ids);
      n.delete(cardId);
      return { ids: n };
    }),
  has: (cardId) => get().ids.has(cardId),
}));

export const useIsInWishlist = (cardId: string) =>
  useWishlistStore((s) => s.ids.has(cardId));
