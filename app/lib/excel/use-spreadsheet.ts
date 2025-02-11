import { useState, useCallback } from 'react';
import { ExcelProcessor } from './processor';
import { Student, ImportState } from './types';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { useSettingsStore } from '../storage/settings-store';
import * as XLSX from 'xlsx';

// TypeScript declaration for window.__TAURI_INTERNALS__
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  }
}

export function useSpreadsheet() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    isModalOpen: false,
    pendingFile: null,
    processingResult: null,
    status: 'idle'
  });
  const { directEdit } = useSettingsStore();

  const loadFile = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Read the file directly using Tauri's fs API
      const fileContent = await readFile(filePath);
      const workbook = XLSX.read(fileContent, { type: 'array' });
      
      // Process the workbook
      const processingResult = await ExcelProcessor.processWorkbook(workbook);
      
      // Handle processing errors or skipped rows
      if (processingResult.errors.length > 0 || processingResult.skippedRows > 0) {
        setImportState(prev => ({
          ...prev,
          isModalOpen: true,
          processingResult,
          status: 'paused'
        }));
        return;
      }

      setSourceFilePath(filePath);
      setWorkbook(workbook);
      setImportState(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load spreadsheet');
      setWorkbook(null);
      setImportState(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const findStudent = useCallback((xNumber: string): Student | undefined => {
    if (!workbook) return undefined;
    return ExcelProcessor.findStudent(workbook, xNumber);
  }, [workbook]);

  const checkInStudent = useCallback(async (xNumber: string) => {
    if (!workbook || !sourceFilePath || isSaving) return;

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    try {
      setIsSaving(true);
      // Update the workbook
      const updatedWorkbook = await ExcelProcessor.checkInStudent(workbook, xNumber, timestamp);
      setWorkbook(updatedWorkbook);
      
      // Write directly back to the file
      const buffer = XLSX.write(updatedWorkbook, { type: 'array', bookType: 'xlsx' });
      await writeFile(sourceFilePath, buffer);
      
      setError(null);
    } catch (error) {
      console.error('Check-in failed:', error);
      setError('Failed to check in student. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [workbook, sourceFilePath, isSaving]);

  const continueWithValidRows = useCallback(async () => {
    if (importState.pendingFile && importState.status === 'paused' && importState.processingResult) {
      setImportState(prev => ({ ...prev, isModalOpen: false, status: 'completed' }));
      const spreadsheetData = await ExcelProcessor.readFile(importState.pendingFile);
      setWorkbook(spreadsheetData.workbook);
    }
  }, [importState.pendingFile, importState.status, importState.processingResult]);

  const cancelImport = useCallback(() => {
    setImportState({
      isModalOpen: false,
      pendingFile: null,
      processingResult: null,
      status: 'idle'
    });
    setWorkbook(null);
    setError(null);
  }, []);

  const exportSpreadsheet = useCallback(async () => {
    if (!workbook || !sourceFilePath) return;
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    await writeFile(sourceFilePath, buffer);
  }, [workbook, sourceFilePath]);

  return {
    hasSpreadsheet: !!workbook,
    isLoading,
    isSaving,
    error,
    importState,
    loadFile,
    findStudent,
    checkInStudent,
    exportSpreadsheet,
    continueWithValidRows,
    cancelImport,
    directEdit
  };
} 