import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      selectedOrg: 'AMKAS INTERNATIONAL',
      selectedBranch: 'All Branches',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setActiveModule: (m) => set({ activeModule: m }),
      setSelectedOrg: (org) => set({ selectedOrg: org }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
    }),
    { name: 'amkas-erp-ui' }
  )
);
