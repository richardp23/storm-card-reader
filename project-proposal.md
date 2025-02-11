# StormCard Check-In System Project Proposal

## Overview
The StormCard Check-In System is a desktop application designed to streamline the event check-in process at St. John's University events. This solution allows event coordinators to efficiently process attendee check-ins using existing attendance spreadsheets while maintaining data integrity through a cache-based approach.

## Purpose
To provide a simple, reliable way to mark attendance at St. John's University events by validating StormCard X-numbers against existing Excel spreadsheets, without modifying the original files.

## Key Features

### Excel File Handling
- Import existing attendance spreadsheets
- Create working copies in cache
- Export updated spreadsheets after check-ins
- Original files remain untouched

### Check-In Methods
1. **Manual X-Number Entry**
   - Simple text input field
   - Compatible with USB card scanner (HID device)
   - Real-time validation against spreadsheet

### Check-In Process
- Instant X-number validation
- Display student information for confirmation
- Two-step verification (validate then confirm)
- Clear error handling for invalid entries

### Data Management
- Non-destructive operation (cached copies)
- Simple export of updated records
- Clear visual feedback
- Checkbox-based attendance marking

## Benefits

### For Event Coordinators
- Simple, focused interface
- Clear validation feedback
- No risk to original files
- Compatible with existing spreadsheets
- Works with standard USB card readers

### For the University
- Maintains data integrity
- Works with existing spreadsheet format
- Accurate attendance records
- No special training required

## Technical Stack
- Frontend: Next.js
- Desktop Application: Tauri
- Excel Processing: SheetJS

---
*[Richard Perez Jr.]*  
*[2025-02-10]*  
*[sw.richard.perez23@stjohns.edu]* 