import { useState, useCallback } from 'react';
import { ExcelProcessor } from './processor';
import { SpreadsheetData, Student, ProcessingResult, ProcessingError, ImportState } from './types';
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
  const [importState, setImportState] = useState<ImportState>({
    isModalOpen: false,
    pendingFile: null,
    processingResult: null,
    status: 'idle'
  });
  const { autoSave, autoSaveFilePath } = useSettingsStore();
  const isTauri = useIsTauri();

  const generateErrorMessage = (error: ProcessingError): string => {
    const sectionInfo = error.section ? ` in section "${error.section}"` : '';
    const rowInfo = `Row ${error.rowNumber}${sectionInfo}`;

    switch (error.errorType) {
      case 'incomplete_header':
        return `${rowInfo}: Incomplete header row\n` +
               `Missing columns: ${error.details?.missingColumns?.join(', ')}\n` +
               `Found columns: ${error.details?.foundColumns?.join(', ')}`;
      
      case 'invalid_header':
        return `${rowInfo}: Invalid header format\n` +
               `Expected: ${error.details?.expectedColumns?.join(', ')}\n` +
               `Found: ${error.details?.foundColumns?.join(', ')}\n` +
               `Invalid columns: ${error.details?.missingColumns?.join(', ')}`;
      
      case 'invalid_xnumber':
        return `${rowInfo}: Invalid X-Number "${error.value}"\n` +
               'X-Numbers must start with X followed by exactly 8 digits';
      
      case 'missing_xnumber':
        return `${rowInfo}: Missing X-Number`;
      
      default:
        return `${rowInfo}: Unknown error`;
    }
  };

  const generateErrorSummary = (result: ProcessingResult): string => {
    const { errors, totalRows, processedRows, skippedRows } = result;
    
    let summary = `Spreadsheet Processing Summary:\n`;
    summary += `- Total Rows: ${totalRows}\n`;
    summary += `- Successfully Processed: ${processedRows}\n`;
    summary += `- Skipped Rows: ${skippedRows}\n`;
    summary += `- Errors Found: ${errors.length}\n\n`;

    if (errors.length > 0) {
      // Group errors by section
      const errorsBySection = errors.reduce((acc, error) => {
        const section = error.section || 'Unknown Section';
        if (!acc[section]) acc[section] = [];
        acc[section].push(error);
        return acc;
      }, {} as Record<string, ProcessingError[]>);

      summary += 'Errors by Section:\n';
      Object.entries(errorsBySection).forEach(([section, sectionErrors]) => {
        summary += `\n${section}:\n`;
        sectionErrors.forEach(error => {
          summary += `  ${generateErrorMessage(error)}\n`;
        });
      });

      if (result.requiresUserAction) {
        summary += '\nAction Required:\n';
        summary += '- Fix the errors in the spreadsheet and reimport\n';
        summary += '- Or click "Continue" to process only valid rows\n';
        
        if (skippedRows > 0) {
          summary += `\nNote: If you continue, ${skippedRows} row(s) will be skipped due to errors.`;
        }
      }
    }

    return summary;
  };

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

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const spreadsheetData = await ExcelProcessor.readFile(file);
      
      // Handle processing errors
      if (spreadsheetData.processingResult.errors.length > 0) {
        const errorSummary = generateErrorSummary(spreadsheetData.processingResult);
        setError(errorSummary);
        
        if (spreadsheetData.processingResult.requiresUserAction) {
          // Show modal for user action
          setImportState(prev => ({
            ...prev,
            isModalOpen: true,
            pendingFile: file,
            processingResult: spreadsheetData.processingResult,
            status: 'paused'
          }));
          return;
        }
      }
      
      setData(spreadsheetData);
      setImportState(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load spreadsheet');
      setData(null);
      setImportState(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setImportState({
      isModalOpen: false,
      pendingFile: file,
      processingResult: null,
      status: 'processing'
    });
    
    await processFile(file);
  }, [processFile]);

  const continueWithValidRows = useCallback(async () => {
    if (importState.pendingFile && importState.status === 'paused' && importState.processingResult) {
      // Use the existing processing result instead of reprocessing
      setImportState(prev => ({ ...prev, isModalOpen: false, status: 'completed' }));
      setData({
        students: importState.processingResult.students,
        originalFile: importState.pendingFile,
        processingResult: importState.processingResult
      });
    }
  }, [importState.pendingFile, importState.status, importState.processingResult]);

  const cancelImport = useCallback(() => {
    setImportState({
      isModalOpen: false,
      pendingFile: null,
      processingResult: null,
      status: 'idle'
    });
    setData(null);
    setError(null);
  }, []);

  const findStudent = useCallback((xNumber: string): Student | undefined => {
    return data?.students.find(student => 
      student.xNumber.toLowerCase() === xNumber.toLowerCase()
    );
  }, [data]);

  const checkInStudent = useCallback(async (xNumber: string) => {
    if (!data || isSaving) return;

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

    const updatedData = {
      ...data,
      students: data.students.map(student => {
        if (student.xNumber.toLowerCase() === xNumber.toLowerCase()) {
          return { ...student, isCheckedIn: timestamp };
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
    importState,
    loadFile,
    continueWithValidRows,
    cancelImport,
    findStudent,
    checkInStudent,
    exportSpreadsheet,
    processingResult: data?.processingResult
  };
} 