import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  lowDataMode: boolean;
  setLowDataMode: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      lowDataMode: false,
      setLowDataMode: enabled => set({ lowDataMode: enabled }),
    }),
    { name: "cc-preferences-storage" },
  ),
);
