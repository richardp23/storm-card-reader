import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir, join } from '@tauri-apps/api/path';
import { readDir, createDir, writeFile, readTextFile } from '@tauri-apps/api/fs';
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
    const appData = await appDataDir();
    const storageDir = await join(appData, this.STORAGE_DIR);
    
    try {
      await readDir(storageDir);
    } catch {
      await createDir(storageDir, { recursive: true });
    }
  }

  /**
   * Save spreadsheet to persistent storage
   */
  static async saveSpreadsheet(data: SpreadsheetData): Promise<StoredSpreadsheet> {
    const appData = await appDataDir();
    const storageDir = await join(appData, this.STORAGE_DIR);
    
    // Generate unique ID
    const id = crypto.randomUUID();
    const fileName = `${id}.xlsx`;
    const filePath = await join(storageDir, fileName);

    // Save the file
    await writeFile({
      path: filePath,
      contents: await data.originalFile.arrayBuffer()
    });

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
      const appData = await appDataDir();
      const metadataPath = await join(appData, this.STORAGE_DIR, this.METADATA_FILE);
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
    const appData = await appDataDir();
    const metadataPath = await join(appData, this.STORAGE_DIR, this.METADATA_FILE);
    
    // Get existing metadata
    let spreadsheets = await this.getStoredSpreadsheets();
    
    // Add or update spreadsheet
    const index = spreadsheets.findIndex(s => s.id === newSpreadsheet.id);
    if (index >= 0) {
      spreadsheets[index] = newSpreadsheet;
    } else {
      spreadsheets.push(newSpreadsheet);
    }

    // Write updated metadata
    await writeFile({
      path: metadataPath,
      contents: JSON.stringify(spreadsheets, null, 2)
    });
  }

  /**
   * Load spreadsheet from storage
   */
  static async loadSpreadsheet(id: string): Promise<File | null> {
    const spreadsheets = await this.getStoredSpreadsheets();
    const spreadsheet = spreadsheets.find(s => s.id === id);
    
    if (!spreadsheet) return null;

    try {
      const content = await readTextFile(spreadsheet.path, { encoding: 'base64' });
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
    
    const appData = await appDataDir();
    const metadataPath = await join(appData, this.STORAGE_DIR, this.METADATA_FILE);
    
    await writeFile({
      path: metadataPath,
      contents: JSON.stringify(filtered, null, 2)
    });
  }
} 