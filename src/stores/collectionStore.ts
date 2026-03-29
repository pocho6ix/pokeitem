import { create } from "zustand";
import type { PortfolioItem } from "@/types/collection";

interface PortfolioState {
  items: PortfolioItem[];
  isLoading: boolean;
  error: string | null;

  fetchPortfolio: () => Promise<void>;
  addItem: (data: Omit<PortfolioItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: Partial<PortfolioItem>) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error(`Failed to fetch portfolio: ${res.status}`);
      const data: PortfolioItem[] = await res.json();
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
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to add item: ${res.status}`);
      const newItem: PortfolioItem = await res.json();
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
      const res = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, {
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
      const res = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
      const updated: PortfolioItem = await res.json();
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
