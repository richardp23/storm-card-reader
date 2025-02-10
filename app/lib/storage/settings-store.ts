import { create } from 'zustand';
import { StateCreator } from 'zustand';

interface SettingsState {
  autoSave: boolean;
  autoSaveFilePath: string | null;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveFilePath: (path: string | null) => void;
}

const createSettingsStore: StateCreator<SettingsState> = (set) => ({
  autoSave: false,
  autoSaveFilePath: null,
  setAutoSave: (enabled: boolean) => set({ autoSave: enabled }),
  setAutoSaveFilePath: (path: string | null) => set({ autoSaveFilePath: path }),
});

export const useSettingsStore = create<SettingsState>(createSettingsStore); 