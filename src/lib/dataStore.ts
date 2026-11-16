import { create } from 'zustand';

/**
 * Legacy whole-state business data store has been retired.
 * All server/business data is owned by React Query (`src/lib/queries.ts`)
 * and mutated via row-level Supabase services (`src/lib/services/`).
 *
 * On startup, any stale `amkas-erp-data-store` key in localStorage is purged
 * so stale local snapshots can never exist or be merged back in.
 */
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('amkas-erp-data-store');
  } catch {
    // ignore storage access errors
  }
}

export interface UIOnlyStoreState {
  isGlobalModalOpen: boolean;
  setGlobalModalOpen: (open: boolean) => void;
}

export const useDataStore = create<UIOnlyStoreState>()((set) => ({
  isGlobalModalOpen: false,
  setGlobalModalOpen: (open) => set({ isGlobalModalOpen: open }),
}));
