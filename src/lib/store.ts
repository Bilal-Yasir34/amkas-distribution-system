import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Clear any legacy whole-state localStorage business data blob on startup
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('amkas-erp-data-store');
  } catch {
    // ignore storage errors
  }
}

interface AppState {
  theme: 'dark' | 'light';
  activeModule: string;
  selectedOrg: string;
  selectedBranch: string;
  toggleTheme: () => void;
  setActiveModule: (m: string) => void;
  setSelectedOrg: (org: string) => void;
  setSelectedBranch: (branch: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeModule: 'dashboard',
      selectedOrg: 'NICE ENTERPRISES',
      selectedBranch: 'All Branches',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setActiveModule: (m) => set({ activeModule: m }),
      setSelectedOrg: (org) => set({ selectedOrg: org }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
    }),
    {
      name: 'amkas-erp-ui',
      version: 2,
      partialize: (state) => ({
        theme: state.theme,
        activeModule: state.activeModule,
        selectedOrg: state.selectedOrg,
        selectedBranch: state.selectedBranch,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.selectedOrg === 'AMKAS INTERNATIONAL') {
          state.selectedOrg = 'NICE ENTERPRISES';
        }
      },
    }
  )
);
