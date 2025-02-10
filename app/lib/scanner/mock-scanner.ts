import { ScannerInterface, ScanResult, ScannerConfig } from './types';

export class MockScanner implements ScannerInterface {
  private isInitialized: boolean = false;
  private config: ScannerConfig;

  constructor(config: ScannerConfig = {}) {
    this.config = {
      mockMode: true,
      timeout: 500,
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isInitialized = true;
    console.log('Mock scanner initialized');
  }

  async readCard(): Promise<ScanResult> {
    if (!this.isInitialized) {
      throw new Error('Scanner not initialized');
    }

    // Simulate card read delay
    await new Promise(resolve => setTimeout(resolve, this.config.timeout || 500));

    // Generate a random X-ID for testing
    const randomXID = 'X' + Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 10)).join('');

    return {
      xid: randomXID,
      timestamp: new Date(),
      success: true
    };
  }

  async disconnect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isInitialized = false;
    console.log('Mock scanner disconnected');
  }
} 