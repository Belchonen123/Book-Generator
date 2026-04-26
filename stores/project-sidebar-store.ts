import { create } from "zustand";

type ProjectSidebarState = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
};

export const useProjectSidebarStore = create<ProjectSidebarState>((set) => ({
  mobileOpen: false,
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
}));
