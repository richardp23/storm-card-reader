import * as React from "react"
import { ProcessingError } from "../../lib/excel/types"

interface CollapsibleErrorProps {
  section: string;
  errors: ProcessingError[];
  defaultOpen?: boolean;
}

export function CollapsibleError({ section, errors, defaultOpen = false }: CollapsibleErrorProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-200 dark:hover:bg-gray-900/70 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">{section}</span>
        <svg
          className={`w-4 h-4 transform transition-transform text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 font-mono text-sm bg-white dark:bg-gray-900/30">
          {errors.map((error, index) => (
            <div key={index} className="mb-2 last:mb-0">
              {error.errorType === 'incomplete_header' && (
                <>
                  <div className="text-gray-900 dark:text-gray-100">Row {error.rowNumber}: Incomplete header row</div>
                  <div className="pl-4 text-red-600 dark:text-red-400">Missing columns: {error.details?.missingColumns?.join(', ')}</div>
                  <div className="pl-4 text-gray-500 dark:text-gray-400">Found columns: {error.details?.foundColumns?.join(', ')}</div>
                </>
              )}
              
              {error.errorType === 'invalid_header' && (
                <>
                  <div className="text-gray-900 dark:text-gray-100">Row {error.rowNumber}: Invalid header format</div>
                  <div className="pl-4 text-gray-500 dark:text-gray-400">Expected: {error.details?.expectedColumns?.join(', ')}</div>
                  <div className="pl-4 text-gray-500 dark:text-gray-400">Found: {error.details?.foundColumns?.join(', ')}</div>
                  <div className="pl-4 text-red-600 dark:text-red-400">Invalid columns: {error.details?.missingColumns?.join(', ')}</div>
                </>
              )}
              
              {error.errorType === 'invalid_xnumber' && (
                <>
                  <div className="text-gray-900 dark:text-gray-100">Row {error.rowNumber}: Invalid X-Number "{error.value}"</div>
                  <div className="pl-4 text-gray-500 dark:text-gray-400">X-Numbers must start with X followed by exactly 8 digits</div>
                </>
              )}
              
              {error.errorType === 'missing_xnumber' && (
                <div className="text-gray-900 dark:text-gray-100">Row {error.rowNumber}: Missing X-Number</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 