import { create } from "zustand";
import type { UserItem } from "@/types";

interface CollectionState {
  items: UserItem[];
  isLoading: boolean;
  error: string | null;

  fetchCollection: () => Promise<void>;
  addItem: (data: Omit<UserItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: Partial<UserItem>) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchCollection: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/collection");
      if (!res.ok) throw new Error(`Failed to fetch collection: ${res.status}`);
      const data: UserItem[] = await res.json();
      set({ items: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Erreur inconnue",
        isLoading: false,
      });
    }
  },

  addItem: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to add item: ${res.status}`);
      const newItem: UserItem = await res.json();
      set((state) => ({
        items: [...state.items, newItem],
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Erreur inconnue",
        isLoading: false,
      });
    }
  },

  removeItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/collection?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed to remove item: ${res.status}`);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Erreur inconnue",
        isLoading: false,
      });
    }
  },

  updateItem: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/collection?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
      const updated: UserItem = await res.json();
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? updated : item)),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Erreur inconnue",
        isLoading: false,
      });
    }
  },
}));
