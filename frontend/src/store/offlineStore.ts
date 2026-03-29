import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Last-fetched expense list cache for offline UX */
type OfflineState = {
  lastExpensesJson: string | null;
  setLastExpenses: (json: string) => void;
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      lastExpensesJson: null,
      setLastExpenses: (json) => set({ lastExpensesJson: json }),
    }),
    { name: 'sr-offline' }
  )
);
