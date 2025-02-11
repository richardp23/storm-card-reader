import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  autoSave: boolean;
  autoSaveFilePath: string | null;
  directEdit: boolean;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveFilePath: (path: string | null) => void;
  setDirectEdit: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoSave: false,
      autoSaveFilePath: null,
      directEdit: true, // Default to true
      setAutoSave: (enabled) => set({ autoSave: enabled }),
      setAutoSaveFilePath: (path) => set({ autoSaveFilePath: path }),
      setDirectEdit: (enabled) => set({ directEdit: enabled }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 