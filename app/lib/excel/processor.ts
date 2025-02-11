import * as XLSX from 'xlsx';
import { 
  Student, 
  SpreadsheetData, 
  ProcessingError, 
  ProcessingResult, 
  X_NUMBER_PATTERN, 
  REQUIRED_COLUMNS 
} from './types';

export class ExcelProcessor {
  // Column mappings for new schema
  private static COLUMN_X_NUMBER = 0;    // Column A (ID)
  private static COLUMN_LAST_NAME = 1;   // Column B (LAST_NAME)
  private static COLUMN_FIRST_NAME = 2;  // Column C (SPRIDEN_PFN)
  private static COLUMN_CHECK_IN = 3;    // Column D (SIGN-IN)

  /**
   * Normalize header text for comparison
   */
  private static normalizeHeaderText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Check if a row contains section metadata
   */
  private static isSectionMetadata(row: (string | null)[]): boolean {
    const datePattern = /^\d+\.\d+\.\d+$/;
    return datePattern.test(row[0]?.toString() || '');
  }

  /**
   * Extract section info from metadata row
   */
  private static getSectionInfo(row: string[]): string {
    // Use Column D (index 3) for section info, fall back to Column B if D is empty
    return row[3]?.trim() || row[1]?.trim() || 'Unknown Section';
  }

  /**
   * Check if a row contains headers and provide detailed validation
   */
  private static validateHeaderRow(row: string[]): { 
    isValid: boolean; 
    error?: ProcessingError;
  } {
    // Check if any header cell is empty
    const missingColumns: string[] = [];
    const foundColumns: string[] = row.map(h => h.trim());
    
    // Check each required column
    REQUIRED_COLUMNS.forEach((col: string, index: number) => {
      if (!row[index] || !row[index].trim()) {
        missingColumns.push(col);
      }
    });

    if (missingColumns.length > 0) {
      return {
        isValid: false,
        error: {
          rowNumber: -1, // Will be set by caller
          value: row.join(', '),
          errorType: 'incomplete_header',
          details: {
            expectedColumns: REQUIRED_COLUMNS,
            foundColumns,
            missingColumns
          }
        }
      };
    }

    // Define valid patterns for each column
    const validPatterns = {
      id: ['id', 'studentid', 'student_id', 'xnumber'],
      lastName: ['lastname', 'last_name', 'lastnam'],
      firstName: ['spridenpfn', 'firstname', 'first_name', 'firstnam'],
      signIn: ['signin', 'sign_in', 'checkin', 'sign-in']
    };

    // More flexible matching that allows for partial matches and common variations
    const matchesPattern = (header: string, patterns: string[]) => {
      const normalized = this.normalizeHeaderText(header);
      return patterns.some(pattern => {
        const normalizedPattern = this.normalizeHeaderText(pattern);
        return normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized);
      });
    };

    // Check each header against its patterns
    const isIdValid = matchesPattern(row[0], validPatterns.id);
    const isLastNameValid = matchesPattern(row[1], validPatterns.lastName);
    const isFirstNameValid = matchesPattern(row[2], validPatterns.firstName);
    const isSignInValid = matchesPattern(row[3], validPatterns.signIn);

    if (!isIdValid || !isLastNameValid || !isFirstNameValid || !isSignInValid) {
      const invalidColumns: string[] = [];
      if (!isIdValid) invalidColumns.push('ID');
      if (!isLastNameValid) invalidColumns.push('LAST_NAME');
      if (!isFirstNameValid) invalidColumns.push('SPRIDEN_PFN');
      if (!isSignInValid) invalidColumns.push('SIGN-IN');

      return {
        isValid: false,
        error: {
          rowNumber: -1, // Will be set by caller
          value: row.join(', '),
          errorType: 'invalid_header',
          details: {
            expectedColumns: REQUIRED_COLUMNS,
            foundColumns,
            missingColumns: invalidColumns
          }
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Validate X number format
   */
  private static isValidXNumber(value: string): boolean {
    return X_NUMBER_PATTERN.test(value);
  }

  /**
   * Read and parse an Excel file
   */
  static async readFile(file: File): Promise<SpreadsheetData> {
    console.log('Starting to read file:', file.name);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          console.log('File loaded into memory');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellFormula: false,
            cellHTML: false,
            cellText: false
          });

          if (workbook.SheetNames.length === 0) {
            throw new Error('The Excel file appears to be empty.');
          }

          // Process first sheet by default (can be modified to handle sheet selection)
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!worksheet['!ref']) {
            throw new Error('The worksheet appears to be empty.');
          }

          const processingResult = await this.processWorksheet(worksheet);
          
          resolve({ 
            students: processingResult.students, 
            originalFile: file,
            processingResult 
          });
        } catch (error) {
          console.error('Error processing file:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process worksheet and extract student data with error handling
   */
  private static async processWorksheet(worksheet: XLSX.WorkSheet): Promise<ProcessingResult> {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const students: Student[] = [];
    const errors: ProcessingError[] = [];
    let currentRow = 0;
    let currentSection = '';
    let processedRows = 0;
    let skippedRows = 0;
    let requiresUserAction = false;

    while (currentRow <= range.e.r) {
      const rowData = this.getRowValues(worksheet, currentRow);

      // Handle section metadata
      if (this.isSectionMetadata(rowData)) {
        currentSection = this.getSectionInfo(rowData);
        currentRow += 1;
        
        // Validate next row is header
        const headerRow = this.getRowValues(worksheet, currentRow);
        const headerValidation = this.validateHeaderRow(headerRow);
        
        if (!headerValidation.isValid && headerValidation.error) {
          headerValidation.error.rowNumber = currentRow + 1;
          headerValidation.error.section = currentSection;
          errors.push(headerValidation.error);
          requiresUserAction = true;
          currentRow += 1;
          continue;
        }
        
        currentRow += 1;
        continue;
      }

      // Get and validate X number
      const xNumber = this.getCellValue(worksheet, currentRow, this.COLUMN_X_NUMBER);
      
      if (!xNumber) {
        if (rowData.some(cell => cell)) { // If row has any data
          errors.push({
            rowNumber: currentRow + 1,
            value: '',
            errorType: 'missing_xnumber',
            section: currentSection
          });
        }
        skippedRows++;
        currentRow += 1;
        continue;
      }

      if (!this.isValidXNumber(xNumber)) {
        errors.push({
          rowNumber: currentRow + 1,
          value: xNumber,
          errorType: 'invalid_xnumber',
          section: currentSection
        });
        skippedRows++;
        currentRow += 1;
        continue;
      }

      // Process valid student data
      students.push({
        xNumber: xNumber,
        lastName: this.getCellValue(worksheet, currentRow, this.COLUMN_LAST_NAME),
        firstName: this.getCellValue(worksheet, currentRow, this.COLUMN_FIRST_NAME),
        isCheckedIn: null, // Initialize as null, will be updated with timestamp when checked in
        rowIndex: currentRow + 1,
        section: currentSection
      });

      processedRows++;
      currentRow += 1;
    }

    return {
      students,
      errors,
      totalRows: range.e.r + 1,
      processedRows,
      skippedRows,
      requiresUserAction
    };
  }

  /**
   * Get cell value safely
   */
  private static getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): string {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[cellAddress];
    return cell ? cell.v.toString().trim() : '';
  }

  /**
   * Get all values in a row
   */
  private static getRowValues(worksheet: XLSX.WorkSheet, row: number): string[] {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const values: string[] = [];
    
    for (let col = 0; col <= range.e.c; col++) {
      values.push(this.getCellValue(worksheet, row, col));
    }
    
    return values;
  }

  /**
   * Export workbook with updated check-in status
   */
  static async exportWorkbook(data: SpreadsheetData): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const originalData = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(originalData, { 
            type: 'array',
            cellFormula: true,
            cellHTML: false,
            cellStyles: true
          });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Update check-in status with timestamps
          data.students.forEach(student => {
            if (student.isCheckedIn) {
            const cellAddress = XLSX.utils.encode_cell({ 
              r: student.rowIndex - 1, 
              c: this.COLUMN_CHECK_IN 
            });

            worksheet[cellAddress] = {
                t: 's', // string type
              v: student.isCheckedIn,
                w: student.isCheckedIn
            };
            }
          });

          const wbout = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'buffer',
            compression: true,
            bookSST: false
          });
          
          resolve(new Uint8Array(wbout));
        };

        reader.onerror = (error) => {
          console.error('Export error:', error);
          reject(new Error('Failed to read original file for export'));
        };

        reader.readAsArrayBuffer(data.originalFile);
      } catch (error) {
        console.error('Export error:', error);
        reject(error);
      }
    });
  }
} 