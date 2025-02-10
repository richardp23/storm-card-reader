export interface Student {
  firstName: string;
  lastName: string;
  xNumber: string;
  isCheckedIn: boolean;
  rowIndex: number;
}

export interface SpreadsheetData {
  students: Student[];
  originalFile: File;
} 