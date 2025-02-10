'use client';

import React, { useState } from 'react';
import { useSpreadsheet } from './lib/excel/use-spreadsheet';
import { AutoSaveToggle } from './components/settings/auto-save-toggle';

export default function Home() {
  const { 
    hasSpreadsheet, 
    isLoading, 
    error: spreadsheetError, 
    loadFile,
    findStudent,
    checkInStudent,
    exportSpreadsheet
  } = useSpreadsheet();

  const [xNumber, setXNumber] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await loadFile(file);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    }
  };

  const handleValidate = () => {
    setValidationStatus('validating');
    const student = findStudent(xNumber);

    if (student) {
      setStudentName(`${student.firstName} ${student.lastName}`);
      setValidationStatus('valid');
      setError(null);
    } else {
      setStudentName(null);
      setValidationStatus('invalid');
      setError('Student not found');
    }
  };

  const handleConfirm = () => {
    try {
      setIsSaving(true);
      checkInStudent(xNumber);
      setValidationStatus('idle');
      setXNumber('');
      setStudentName(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in student');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportSpreadsheet();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export spreadsheet');
    }
  };

  return (
    <main className="min-h-screen p-4">
      <div className="mb-4">
        <AutoSaveToggle />
      </div>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2">StormCard Reader</h1>
          <p className="text-gray-600 dark:text-gray-400">Event Check-in System</p>
        </header>

        {/* Error Display */}
        {(error || spreadsheetError) && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                         rounded-xl shadow-lg p-6 text-center">
            {error || spreadsheetError}
          </div>
        )}

        {!hasSpreadsheet ? (
          // File Import Section
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 text-center
                         border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Import Attendance Sheet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select an Excel spreadsheet to begin check-ins
            </p>
            <label 
              className={`inline-block px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer
                         hover:bg-blue-600 transition-colors ${
                           isLoading ? 'opacity-50 cursor-not-allowed' : ''
                         }`}
            >
              {isLoading ? 'Loading...' : 'Choose File'}
              <input 
                type="file" 
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>
          </div>
        ) : (
          // Check-in Interface
          <div className="space-y-6">
            {/* X-Number Input */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6
                          border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Check-In</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    X-Number
                  </label>
                  <input
                    type="text"
                    value={xNumber}
                    onChange={(e) => setXNumber(e.target.value.toUpperCase())}
                    placeholder="Enter X-Number"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                             focus:border-blue-500 outline-none transition-all
                             bg-white dark:bg-gray-900
                             text-gray-900 dark:text-gray-100
                             placeholder:text-gray-500 dark:placeholder:text-gray-400
                             border-gray-300 dark:border-gray-700"
                  />
                </div>
                <button
                  onClick={handleValidate}
                  disabled={validationStatus === 'validating' || !xNumber}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                           transition-colors disabled:opacity-50 disabled:bg-gray-500"
                >
                  {validationStatus === 'validating' ? 'Validating...' : 'Validate'}
                </button>
              </div>
            </div>

            {/* Validation Result */}
            {validationStatus === 'valid' && studentName && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6
                          border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-medium mb-4 dark:text-white">Confirm Check-In</h3>
                <p className="mb-4 dark:text-gray-300">
                  <span className="font-medium dark:text-white">Student:</span> {studentName}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={isSaving}
                    className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg 
                             hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setValidationStatus('idle');
                      setXNumber('');
                      setStudentName(null);
                    }}
                    disabled={isSaving}
                    className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg 
                             hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {validationStatus === 'invalid' && (
              <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 
                            rounded-xl shadow-xl p-6 text-center
                            border border-red-200 dark:border-red-900">
                X-Number not found. Please try again.
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="py-2 px-4 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 
                         dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Export Spreadsheet
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
