import { useCallback } from 'react';
import { useSettingsStore } from '../../lib/storage/settings-store';
import { save } from '@tauri-apps/plugin-dialog';
import { useIsTauri } from '../../lib/hooks/use-is-tauri';

export function AutoSaveToggle() {
  const isTauri = useIsTauri();
  const { 
    autoSave, 
    autoSaveFilePath, 
    setAutoSave, 
    setAutoSaveFilePath,
    directEdit 
  } = useSettingsStore();

  const handleToggle = useCallback(async () => {
    if (!isTauri || directEdit) {
      return;
    }

    if (!autoSave) {
      // When enabling auto-save, prompt for file location
      try {
        const filePath = await save({
          filters: [{
            name: 'Excel Spreadsheet',
            extensions: ['xlsx']
          }],
          defaultPath: autoSaveFilePath || 'attendance.xlsx'
        });

        if (filePath) {
          setAutoSaveFilePath(filePath);
          setAutoSave(true);
        }
      } catch (err) {
        console.error('Failed to set auto-save file:', err);
      }
    } else {
      // When disabling auto-save, clear the file path
      setAutoSave(false);
      setAutoSaveFilePath(null);
    }
  }, [autoSave, autoSaveFilePath, setAutoSave, setAutoSaveFilePath, isTauri, directEdit]);

  if (!isTauri) {
    return null; // Don't show the toggle in web version
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={autoSave}
            onChange={handleToggle}
            disabled={directEdit}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Auto-Save {autoSave ? 'On' : 'Off'}
        </span>
      </div>
      {autoSave && autoSaveFilePath && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs pl-14">
          {autoSaveFilePath}
        </span>
      )}
    </div>
  );
} 