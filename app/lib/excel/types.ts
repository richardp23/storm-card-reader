import * as XLSX from 'xlsx';

export interface Student {
  xNumber: string;
  lastName: string;
  firstName: string;
  isCheckedIn: string | null;
  rowIndex: number;
  section?: string;
}

export interface ProcessingError {
  rowNumber: number;
  value: string;
  errorType: 'invalid_xnumber' | 'missing_xnumber' | 'invalid_header' | 'incomplete_header';
  section?: string;
  details?: {
    expectedColumns?: string[];
    foundColumns?: string[];
    missingColumns?: string[];
  };
}

export interface ProcessingResult {
  students: Student[];
  errors: ProcessingError[];
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  requiresUserAction: boolean;
}

export interface SpreadsheetData {
  students: Student[];
  originalFile: File;
  processingResult: ProcessingResult;
  workbook: XLSX.WorkBook;
}

export interface ImportState {
  isModalOpen: boolean;
  pendingFile: File | null;
  processingResult: ProcessingResult | null;
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error';
  errorSummary?: string;
}

// Constants for validation
export const VALID_HEADERS = {
  id: ['id', 'studentid', 'student_id', 'xnumber'],
  lastName: ['lastname', 'last_name', 'lastnam'],
  firstName: ['spridenpfn', 'firstname', 'first_name', 'firstnam'],
  checkIn: ['signin', 'sign_in', 'checkin', 'sign-in']
};

export const REQUIRED_COLUMNS = ['ID', 'LAST_NAME', 'SPRIDEN_PFN', 'SIGN-IN'];

export const X_NUMBER_PATTERN = /^X\d{8}$/; 