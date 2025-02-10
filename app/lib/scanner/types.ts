export interface ScanResult {
  xid: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ScannerInterface {
  initialize(): Promise<void>;
  readCard(): Promise<ScanResult>;
  disconnect(): Promise<void>;
}

export type ScannerStatus = 'disconnected' | 'connected' | 'error';

export interface ScannerConfig {
  devicePath?: string;  // For USB device path
  mockMode?: boolean;   // For development
  timeout?: number;     // Scan timeout in milliseconds
} 