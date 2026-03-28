import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  modalOpen: boolean;
  activeModal: string | null;

  toggleSidebar: () => void;
  openModal: (name: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  modalOpen: false,
  activeModal: null,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  openModal: (name) => {
    set({ modalOpen: true, activeModal: name });
  },

  closeModal: () => {
    set({ modalOpen: false, activeModal: null });
  },
}));
