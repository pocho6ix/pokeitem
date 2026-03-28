import { create } from "zustand";
import type { ItemType } from "@/types";

interface FilterState {
  search: string;
  type: ItemType | null;
  serieId: string | null;
  blocId: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";

  setFilter: <K extends keyof Omit<FilterState, "setFilter" | "resetFilters">>(
    key: K,
    value: FilterState[K]
  ) => void;
  resetFilters: () => void;
}

const initialState = {
  search: "",
  type: null as ItemType | null,
  serieId: null as string | null,
  blocId: null as string | null,
  sortBy: "releaseDate",
  sortOrder: "desc" as const,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setFilter: (key, value) => {
    set({ [key]: value });
  },

  resetFilters: () => {
    set(initialState);
  },
}));
