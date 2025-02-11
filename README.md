# StormCard Reader - Spreadsheet Processing Implementation

## Operating Modes

### Direct-Edit Mode (Default)
```typescript
- Changes are written directly back to the source file
- No export step needed - changes are saved immediately
- Requires file system access permissions
- Best for desktop usage
```

### Standard Mode
```typescript
- Changes are kept in memory until explicitly exported
- Requires manual export step to save changes
- Works in both web and desktop environments
- Supports auto-save functionality when enabled
```

## Implementation Flow

### 1. File Loading
```typescript
- User uploads Excel file
- File is read into memory as ArrayBuffer
- XLSX.read() converts it to a workbook object
- Takes first sheet from workbook.SheetNames[0]
```

### 2. Header Validation
```typescript
- Validates headers against required columns:
  - ID (X-Number)
  - LAST_NAME
  - SPRIDEN_PFN (First Name)
  - SIGN-IN
- Supports multiple header rows for combined sheets
- Returns detailed error if headers are missing/invalid
```

### 3. Data Processing
```typescript
- Handles section metadata rows (e.g., "2.12.25 Fletcher Consulting")
- For each data row:
  - Validates X-Number format (must match X########)
  - Creates Student object with:
    {
      firstName: string,
      lastName: string,
      xNumber: string,
      isCheckedIn: string | null,
      rowIndex: number,
      section?: string
    }
  - Tracks processing errors for invalid/missing data
```

### 4. Error Handling
```typescript
- Provides detailed error reporting for:
  - Invalid X-Numbers
  - Missing required data
  - Invalid/incomplete headers
  - Section-specific errors
- Allows continuing with valid rows while logging errors
- Shows error summary in modal for user review
```

### 5. Check-in Process
```typescript
- Validates student X-Number exists in spreadsheet
- Records check-in timestamp in EST/EDT
- In Direct-Edit mode:
  - Writes changes immediately to source file
- In Standard mode:
  - Keeps changes in memory
  - Requires manual export or auto-save
```
