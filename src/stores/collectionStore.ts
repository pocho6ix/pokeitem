import { create } from "zustand";

interface PortfolioItemAPI {
  id: string;
  item: {
    id: string;
    name: string;
    type: string;
    imageUrl: string | null;
    currentPrice: number | null;
    serie?: { name: string; bloc?: { name: string } };
  };
  quantity: number;
  purchasePrice: number;
  purchasePricePerUnit: number;
  purchaseDate: string | null;
  currentValue: number;
  currentValuePerUnit: number;
  pnl: number;
  pnlPercent: number;
  notes: string | null;
  createdAt: string;
}

interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  itemCount: number;
  uniqueItemCount: number;
}

interface PortfolioState {
  items: PortfolioItemAPI[];
  summary: PortfolioSummary | null;
  isLoading: boolean;
  error: string | null;

  fetchPortfolio: () => Promise<void>;
  addItem: (data: {
    itemId: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate?: string;
    notes?: string;
  }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: Record<string, unknown>) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  items: [],
  summary: null,
  isLoading: false,
  error: null,

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error(`Failed to fetch portfolio: ${res.status}`);
      const data = await res.json();
      set({ items: data.items, summary: data.summary, isLoading: false });
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
      // Refetch the full portfolio to get updated summary
      const portfolioRes = await fetch("/api/portfolio");
      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        set({
          items: portfolioData.items,
          summary: portfolioData.summary,
          isLoading: false,
        });
      }
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
      const res = await fetch(`/api/portfolio/${id}`, {
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
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
      // Refetch full portfolio
      const portfolioRes = await fetch("/api/portfolio");
      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        set({
          items: portfolioData.items,
          summary: portfolioData.summary,
          isLoading: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Erreur inconnue",
        isLoading: false,
      });
    }
  },
}));
