import { useState, useCallback } from 'react';
import { ExcelProcessor } from './processor';
import { SpreadsheetData, Student } from './types';

export function useSpreadsheet() {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const spreadsheetData = await ExcelProcessor.readFile(file);
      setData(spreadsheetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
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

  const checkInStudent = useCallback((xNumber: string) => {
    if (!data) return;

    setData(prevData => {
      if (!prevData) return null;

      const students = prevData.students.map(student => {
        if (student.xNumber.toLowerCase() === xNumber.toLowerCase()) {
          return { ...student, isCheckedIn: true };
        }
        return student;
      });

      return {
        ...prevData,
        students
      };
    });
  }, [data]);

  const exportSpreadsheet = useCallback(async () => {
    if (!data) {
      throw new Error('No spreadsheet data to export');
    }

    const buffer = await ExcelProcessor.exportWorkbook(data);
    
    // Create and download file
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
  }, [data]);

  return {
    hasSpreadsheet: !!data,
    isLoading,
    error,
    loadFile,
    findStudent,
    checkInStudent,
    exportSpreadsheet
  };
} 