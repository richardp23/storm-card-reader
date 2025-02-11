import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ImportState, ProcessingError } from '../lib/excel/types';
import { CollapsibleError } from './ui/collapsible-error';
import { ScrollArea } from './ui/scroll-area';

interface ImportErrorModalProps {
  isOpen: boolean;
  error: string | null;
  importState: ImportState;
  onContinue: () => void;
  onCancel: () => void;
}

export function ImportErrorModal({
  isOpen,
  error,
  importState,
  onContinue,
  onCancel,
}: ImportErrorModalProps) {
  if (!isOpen || importState.status !== 'paused') {
    return null;
  }

  // Group errors by section
  const errorsBySection = importState.processingResult?.errors.reduce((acc, error) => {
    const section = error.section || 'Unknown Section';
    if (!acc[section]) acc[section] = [];
    acc[section].push(error);
    return acc;
  }, {} as Record<string, ProcessingError[]>) || {};

  const { totalRows, processedRows, skippedRows } = importState.processingResult || {};
  
  // Count actual errors (excluding missing X-numbers which are counted as skipped)
  const errorCount = Object.values(errorsBySection)
    .flat()
    .filter(e => e.errorType !== 'missing_xnumber' && e.errorType !== 'incomplete_header')
    .length;

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="bg-white dark:bg-gray-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <DialogHeader>
          <DialogTitle>Spreadsheet Import Issues</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            The following issues were found while processing your spreadsheet:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400">Total Rows</div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{totalRows}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400">Processed</div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{processedRows}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400">Skipped</div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{skippedRows}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400">Errors</div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{errorCount}</div>
            </div>
          </div>

          {/* Error Sections */}
          <ScrollArea className="min-h-[200px]">
            <div className="space-y-4 pr-4">
              {Object.entries(errorsBySection).map(([section, errors]) => (
                <CollapsibleError
                  key={section}
                  section={section}
                  errors={errors}
                  defaultOpen={false}
                />
              ))}

              {(skippedRows ?? 0) > 0 && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-4">
                  Note: If you continue, {skippedRows} row(s) will be skipped.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel Import
            </Button>
            <Button
              onClick={onContinue}
            >
              Continue with Valid Rows
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 