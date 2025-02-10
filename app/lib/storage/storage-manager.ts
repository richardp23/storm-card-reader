import { readDir, create, writeFile, readTextFile } from '@tauri-apps/plugin-fs';
import { path } from '@tauri-apps/api';
import { SpreadsheetData } from '../excel/types';

export interface StoredSpreadsheet {
  id: string;
  name: string;
  lastModified: number;
  path: string;
}

export class StorageManager {
  private static STORAGE_DIR = 'spreadsheets';
  private static METADATA_FILE = 'metadata.json';

  /**
   * Initialize storage directory
   */
  static async initialize(): Promise<void> {
    const appData = await path.appDataDir();
    const storageDir = await path.join(appData, this.STORAGE_DIR);
    
    try {
      await readDir(storageDir);
    } catch {
      await create(storageDir);
    }
  }

  /**
   * Save spreadsheet to persistent storage
   */
  static async saveSpreadsheet(data: SpreadsheetData): Promise<StoredSpreadsheet> {
    const appData = await path.appDataDir();
    const storageDir = await path.join(appData, this.STORAGE_DIR);
    
    // Generate unique ID
    const id = crypto.randomUUID();
    const fileName = `${id}.xlsx`;
    const filePath = await path.join(storageDir, fileName);

    // Save the file
    const buffer = await data.originalFile.arrayBuffer();
    await writeFile(filePath, new Uint8Array(buffer));

    // Create metadata
    const spreadsheet: StoredSpreadsheet = {
      id,
      name: data.originalFile.name,
      lastModified: Date.now(),
      path: filePath
    };

    // Update metadata file
    await this.updateMetadata(spreadsheet);

    return spreadsheet;
  }

  /**
   * Get list of stored spreadsheets
   */
  static async getStoredSpreadsheets(): Promise<StoredSpreadsheet[]> {
    try {
      const appData = await path.appDataDir();
      const metadataPath = await path.join(appData, this.STORAGE_DIR, this.METADATA_FILE);
      const content = await readTextFile(metadataPath);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Update metadata file
   */
  private static async updateMetadata(newSpreadsheet: StoredSpreadsheet): Promise<void> {
    const appData = await path.appDataDir();
    const metadataPath = await path.join(appData, this.STORAGE_DIR, this.METADATA_FILE);
    
    // Get existing metadata
    const spreadsheets = await this.getStoredSpreadsheets();
    
    // Add or update spreadsheet
    const index = spreadsheets.findIndex(s => s.id === newSpreadsheet.id);
    if (index >= 0) {
      spreadsheets[index] = newSpreadsheet;
    } else {
      spreadsheets.push(newSpreadsheet);
    }

    // Write updated metadata
    const content = JSON.stringify(spreadsheets, null, 2);
    await writeFile(metadataPath, new TextEncoder().encode(content));
  }

  /**
   * Load spreadsheet from storage
   */
  static async loadSpreadsheet(id: string): Promise<File | null> {
    const spreadsheets = await this.getStoredSpreadsheets();
    const spreadsheet = spreadsheets.find(s => s.id === id);
    
    if (!spreadsheet) return null;

    try {
      const content = await readTextFile(spreadsheet.path);
      const buffer = Buffer.from(content, 'base64');
      
      return new File([buffer], spreadsheet.name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: spreadsheet.lastModified
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete spreadsheet from storage
   */
  static async deleteSpreadsheet(id: string): Promise<void> {
    const spreadsheets = await this.getStoredSpreadsheets();
    const filtered = spreadsheets.filter(s => s.id !== id);
    
    const appData = await path.appDataDir();
    const metadataPath = await path.join(appData, this.STORAGE_DIR, this.METADATA_FILE);
    
    const content = JSON.stringify(filtered, null, 2);
    await writeFile(metadataPath, new TextEncoder().encode(content));
  }
} 