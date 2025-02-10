import { useState, useCallback } from 'react';
import { ExcelProcessor } from './processor';
import { SpreadsheetData, Student } from './types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useSettingsStore } from '../storage/settings-store';
import { useIsTauri } from '../hooks/use-is-tauri';

// TypeScript declaration for window.__TAURI_INTERNALS__
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  }
}

export function useSpreadsheet() {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { autoSave, autoSaveFilePath } = useSettingsStore();
  const isTauri = useIsTauri();

  const saveToFile = useCallback(async (dataToSave: SpreadsheetData, filePath: string) => {
    try {
      setIsSaving(true);
      const buffer = await ExcelProcessor.exportWorkbook(dataToSave);
      await writeFile(filePath, buffer);
      setError(null);
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save file. Please try again.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const spreadsheetData = await ExcelProcessor.readFile(file);
      setData(spreadsheetData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load spreadsheet');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const findStudent = useCallback((xNumber: string): Student | undefined => {
    return data?.students.find(student => 
      student.xNumber.toLowerCase() === xNumber.toLowerCase()
    );
  }, [data]);

  const checkInStudent = useCallback(async (xNumber: string) => {
    if (!data || isSaving) return;

    const updatedData = {
      ...data,
      students: data.students.map(student => {
        if (student.xNumber.toLowerCase() === xNumber.toLowerCase()) {
          return { ...student, isCheckedIn: true };
        }
        return student;
      })
    };

    try {
      // If auto-save is enabled and we're in Tauri, save immediately
      if (isTauri && autoSave && autoSaveFilePath) {
        await saveToFile(updatedData, autoSaveFilePath);
      }
      // Only update the state if save was successful or if we're not auto-saving
      setData(updatedData);
    } catch (error) {
      console.error('Check-in failed:', error);
      setError('Failed to check in student. Please try again.');
    }
  }, [data, isTauri, autoSave, autoSaveFilePath, isSaving, saveToFile]);

  const exportSpreadsheet = useCallback(async () => {
    if (!data || isSaving) {
      throw new Error('Cannot export: operation in progress or no data available');
    }

    try {
      const buffer = await ExcelProcessor.exportWorkbook(data);
      
      if (isTauri) {
        // Tauri environment - use native dialog and file system
        const filePath = await save({
          filters: [{
            name: 'Excel Spreadsheet',
            extensions: ['xlsx']
          }],
          defaultPath: autoSaveFilePath || `updated_${data.originalFile.name}`
        });

        if (filePath) {
          await saveToFile(data, filePath);
        }
      } else {
        // Web environment - use browser download
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `updated_${data.originalFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to export spreadsheet');
    }
  }, [data, isTauri, autoSaveFilePath, isSaving, saveToFile]);

  return {
    hasSpreadsheet: !!data,
    isLoading,
    isSaving,
    error,
    loadFile,
    findStudent,
    checkInStudent,
    exportSpreadsheet
  };
} 