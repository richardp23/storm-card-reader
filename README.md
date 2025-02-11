# StormCard Reader - Spreadsheet Processing Implementation

## Current Implementation Flow

### 1. File Loading
```typescript
- User uploads Excel file
- File is read into memory as ArrayBuffer
- XLSX.read() converts it to a workbook object
- Takes first sheet from workbook.SheetNames[0]
```

### 2. Header Validation
```typescript
- Reads first row (currently assumed to be headers)
- Validates headers against VALID_HEADERS mapping:
  firstName: ['first name', 'firstname', 'first', etc.]
  lastName: ['last name', 'lastname', 'last', etc.]
  xNumber: ['x#', 'xnumber', 'x number', etc.]
  checkIn: ['check-in', 'checkin', 'check in', etc.]
- Returns error if required headers are missing/invalid
```

### 3. Data Extraction
```typescript
- Starts from FIRST_DATA_ROW (currently hardcoded as 2)
- For each row:
  - Gets values from each column
  - Skips row if firstName, lastName, AND xNumber are all empty
  - Creates Student object with:
    {
      firstName: string,
      lastName: string,
      xNumber: string,
      isCheckedIn: false,
      rowIndex: number
    }
```

### 4. Return Data
```typescript
- Returns SpreadsheetData object:
  {
    students: Student[],
    originalFile: File
  }
```

## Planned Enhancements

### Sheet Selection Capability
```typescript
- Add method to list available sheets
- Allow user to select specific sheet
- Modify readFile to use selected sheet instead of first sheet
```

### Combined Sheet Handling
```typescript
- Modify FIRST_DATA_ROW to start after metadata row
- Add X-number validation in extractStudents:
  - Skip rows where Column A doesn't start with 'X'
  - Skip rows where Column A is empty
- Handle section metadata rows (like "Fletcher Consulting")
- Reset header validation after finding new header rows
```
