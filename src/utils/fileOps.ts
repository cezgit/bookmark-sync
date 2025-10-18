import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { BookmarkFile } from '../models/bookmark.js';

export class FileOperations {
  /**
   * Reads and parses a bookmark JSON file
   */
  static readBookmarkFile(filePath: string): BookmarkFile {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bookmark file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BookmarkFile;
  }

  /**
   * Writes bookmark data to a file with proper formatting
   */
  static writeBookmarkFile(filePath: string, bookmarks: BookmarkFile): void {
    // Chromium uses 3-space indentation for bookmark files
    const content = JSON.stringify(bookmarks, null, 3);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Creates a backup of a file with timestamp
   */
  static createBackup(sourceFilePath: string, backupDir: string): string {
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(sourceFilePath);
    const backupFileName = `${baseName}.${timestamp}.backup`;
    const backupPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(sourceFilePath, backupPath);
    return backupPath;
  }

  /**
   * Gets the file modification time in milliseconds
   */
  static getFileModifiedTime(filePath: string): number {
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  }

  /**
   * Validates that the bookmark structure is valid JSON
   */
  static validateBookmarkStructure(bookmarks: BookmarkFile): boolean {
    if (!bookmarks.roots) {
      return false;
    }
    if (!bookmarks.roots.bookmark_bar) {
      return false;
    }
    if (!bookmarks.checksum) {
      return false;
    }
    return true;
  }

  /**
   * Calculates MD5 checksum for bookmark content (excluding the checksum field itself)
   */
  static calculateChecksum(bookmarks: BookmarkFile): string {
    // Create a copy without checksum for calculation
    const { checksum, ...dataToHash } = bookmarks;
    const content = JSON.stringify(dataToHash);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Updates the checksum field in the bookmark file
   */
  static updateChecksum(bookmarks: BookmarkFile): void {
    bookmarks.checksum = this.calculateChecksum(bookmarks);
  }
}
