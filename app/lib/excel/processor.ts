import * as XLSX from 'xlsx';
import { Student, SpreadsheetData } from './types';

export class ExcelProcessor {
  // Column mappings
  private static COLUMN_FIRST_NAME = 0;  // Column A
  private static COLUMN_LAST_NAME = 1;   // Column B
  private static COLUMN_X_NUMBER = 2;    // Column C
  private static COLUMN_CHECK_IN = 3;    // Column D
  private static FIRST_DATA_ROW = 2;     // Start from row 2 (after headers)

  // Valid header variations
  private static VALID_HEADERS = {
    firstName: ['first name', 'firstname', 'first', 'given name', 'first_name'],
    lastName: ['last name', 'lastname', 'last', 'family name', 'last_name'],
    xNumber: ['x#', 'xnumber', 'x number', 'id', 'student id', 'stormcard', 'x-number', 'x_number', 'x', 'x-id', 'x_id'],
    checkIn: ['check-in', 'checkin', 'check in', 'attendance', 'check_in', 'checked', 'present', 'here', 'checkbox']
  };

  /**
   * Normalize header text for comparison
   */
  private static normalizeHeaderText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .trim();
  }

  /**
   * Read and parse an Excel file
   */
  static async readFile(file: File): Promise<SpreadsheetData> {
    console.log('Starting to read file:', file.name);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          console.log('File loaded into memory');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);

          // Read with more options to better handle empty cells
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellFormula: false,
            cellHTML: false,
            cellText: false
          });

          if (workbook.SheetNames.length === 0) {
            throw new Error('The Excel file appears to be empty.');
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!worksheet['!ref']) {
            throw new Error('The worksheet appears to be empty.');
          }

          // Get headers and validate
          const headerRowCells = this.getHeaderRow(worksheet);
          console.log('Found headers:', headerRowCells);
          
          // Validate worksheet structure
          const validationResult = this.validateWorksheet(worksheet, headerRowCells);
          if (!validationResult.isValid) {
            const errorMessage = this.generateHeaderErrorMessage(validationResult.error);
            throw new Error(errorMessage);
          }

          const students = this.extractStudents(worksheet);
          console.log('Extracted students:', students.length);
          
          if (students.length > 0) {
            console.log('First student data:', students[0]);
          }

          resolve({ students, originalFile: file });
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
   * Generate a helpful error message for header validation failures
   */
  private static generateHeaderErrorMessage(error?: string): string {
    let message = 'Invalid spreadsheet format.\n\n';
    message += 'Required column headers (in order):\n';
    message += '- Column A: First Name\n';
    message += '- Column B: Last Name\n';
    message += '- Column C: X#\n';
    message += '- Column D: Check-In\n\n';
    
    if (error) {
      message += `Error: ${error}\n\n`;
    }
    
    message += 'Alternative header names accepted:\n';
    message += `- First Name: ${this.VALID_HEADERS.firstName.join(', ')}\n`;
    message += `- Last Name: ${this.VALID_HEADERS.lastName.join(', ')}\n`;
    message += `- X#: ${this.VALID_HEADERS.xNumber.join(', ')}\n`;
    message += `- Check-In: ${this.VALID_HEADERS.checkIn.join(', ')}`;
    
    return message;
  }

  /**
   * Get the header row values
   */
  private static getHeaderRow(worksheet: XLSX.WorkSheet): string[] {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headers: string[] = [];
    
    console.log('\n=== Reading Headers ===');
    console.log('Worksheet reference:', worksheet['!ref']);
    console.log('Range:', range);
    
    // Read the first row (headers)
    for (let col = 0; col <= Math.max(range.e.c, 3); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      const rawValue = cell ? cell.v.toString().trim() : '';
      headers[col] = rawValue;
      
      console.log(`Column ${String.fromCharCode(65 + col)} (${cellAddress}):`, {
        raw: rawValue,
        normalized: this.normalizeHeaderText(rawValue)
      });
    }
    
    return headers;
  }

  /**
   * Check if a header matches any of the valid variations
   */
  private static headerMatches(headerText: string, validVariations: string[]): boolean {
    const normalizedHeader = this.normalizeHeaderText(headerText);
    return validVariations.some(variation => 
      this.normalizeHeaderText(variation) === normalizedHeader ||
      normalizedHeader.includes(this.normalizeHeaderText(variation)) ||
      this.normalizeHeaderText(variation).includes(normalizedHeader)
    );
  }

  /**
   * Validate worksheet has required columns and proper structure
   */
  private static validateWorksheet(worksheet: XLSX.WorkSheet, headers: string[]): { isValid: boolean; error?: string } {
    if (!worksheet['!ref']) {
      return { isValid: false, error: 'Worksheet is empty' };
    }

    console.log('\n=== Validating Headers ===');
    
    // Check each required header
    const missingHeaders: string[] = [];
    const validationResults = [];

    // First Name validation
    const firstNameValid = this.headerMatches(headers[0], this.VALID_HEADERS.firstName);
    validationResults.push({
      column: 'A',
      expected: 'First Name',
      found: headers[0],
      normalized: this.normalizeHeaderText(headers[0]),
      valid: firstNameValid,
      acceptableValues: this.VALID_HEADERS.firstName
    });
    if (!firstNameValid) missingHeaders.push('First Name');

    // Last Name validation
    const lastNameValid = this.headerMatches(headers[1], this.VALID_HEADERS.lastName);
    validationResults.push({
      column: 'B',
      expected: 'Last Name',
      found: headers[1],
      normalized: this.normalizeHeaderText(headers[1]),
      valid: lastNameValid,
      acceptableValues: this.VALID_HEADERS.lastName
    });
    if (!lastNameValid) missingHeaders.push('Last Name');

    // X# validation
    const xNumberValid = this.headerMatches(headers[2], this.VALID_HEADERS.xNumber);
    validationResults.push({
      column: 'C',
      expected: 'X#',
      found: headers[2],
      normalized: this.normalizeHeaderText(headers[2]),
      valid: xNumberValid,
      acceptableValues: this.VALID_HEADERS.xNumber
    });
    if (!xNumberValid) missingHeaders.push('X#');

    // Check-In validation
    const checkInValid = this.headerMatches(headers[3], this.VALID_HEADERS.checkIn);
    validationResults.push({
      column: 'D',
      expected: 'Check-In',
      found: headers[3],
      normalized: this.normalizeHeaderText(headers[3]),
      valid: checkInValid,
      acceptableValues: this.VALID_HEADERS.checkIn
    });
    if (!checkInValid) missingHeaders.push('Check-In');

    // Log validation results
    console.log('\nValidation Results:');
    validationResults.forEach(result => {
      console.log(`\nColumn ${result.column}:`, {
        expected: result.expected,
        found: result.found,
        normalized: result.normalized,
        valid: result.valid,
        acceptableValues: result.acceptableValues
      });
    });

    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        error: `Missing or invalid columns: ${missingHeaders.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Extract student data from worksheet
   */
  private static extractStudents(worksheet: XLSX.WorkSheet): Student[] {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const students: Student[] = [];

    // Start from row 2 (after headers)
    for (let row = this.FIRST_DATA_ROW - 1; row <= range.e.r; row++) {
      const firstName = this.getCellValue(worksheet, row, this.COLUMN_FIRST_NAME);
      const lastName = this.getCellValue(worksheet, row, this.COLUMN_LAST_NAME);
      const xNumber = this.getCellValue(worksheet, row, this.COLUMN_X_NUMBER);
      
      // Debug row data
      console.log(`Row ${row + 1} data:`, { firstName, lastName, xNumber });
      
      // Skip empty rows
      if (!firstName && !lastName && !xNumber) {
        console.log(`Skipping empty row ${row + 1}`);
        continue;
      }

      students.push({
        firstName: firstName || '',
        lastName: lastName || '',
        xNumber: xNumber || '',
        isCheckedIn: false,
        rowIndex: row + 1
      });
    }

    return students;
  }

  /**
   * Get cell value safely
   */
  private static getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): string {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[cellAddress];
    const value = cell ? cell.v.toString() : '';
    console.log(`Reading cell ${cellAddress}:`, value);
    return value;
  }

  /**
   * Create a new workbook with updated check-in status
   */
  static async exportWorkbook(data: SpreadsheetData): Promise<Uint8Array> {
    console.log('Starting export for file:', data.originalFile.name);
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          console.log('Original file loaded for export');
          const originalData = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(originalData, { 
            type: 'array',
            cellFormula: true,  // Enable formulas
            cellHTML: false,
            cellStyles: true    // Maintain styles
          });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Update check-in status
          let updatedCount = 0;
          data.students.forEach(student => {
            const cellAddress = XLSX.utils.encode_cell({ 
              r: student.rowIndex - 1, 
              c: this.COLUMN_CHECK_IN 
            });

            // Set cell value as boolean
            worksheet[cellAddress] = {
              t: 'b',  // boolean type
              v: student.isCheckedIn,
              w: student.isCheckedIn ? 'TRUE' : 'FALSE'
            };

            if (student.isCheckedIn) {
              updatedCount++;
              console.log(`Marked check-in for student at row ${student.rowIndex}:`, student.firstName, student.lastName);
            }
          });
          console.log(`Updated ${updatedCount} check-ins`);

          // Write to buffer with all options needed to maintain formatting
          const wbout = XLSX.write(workbook, { 
            type: 'array',
            bookType: 'xlsx',
            cellStyles: true,
            compression: true,
            bookSST: false,
            cellFormula: true,
            cellHTML: false
          });
          console.log('Workbook written to buffer, size:', wbout.byteLength);
          
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