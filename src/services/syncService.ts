import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SyncConfig, SyncState } from '../models/bookmark.js';
import { Logger } from '../utils/logger.js';
import { FileOperations } from '../utils/fileOps.js';
import { BookmarkProcessor } from './bookmarkProcessor.js';

export class SyncService {
  private config: SyncConfig;
  private logger: Logger;
  private processor: BookmarkProcessor;

  constructor(config: SyncConfig) {
    this.config = config;
    this.logger = new Logger(config.logPath);
    this.processor = new BookmarkProcessor(this.logger);
  }

  /**
   * Loads the sync state from disk, or creates a new one if it doesn't exist
   */
  private loadSyncState(): SyncState {
    if (fs.existsSync(this.config.syncStatePath)) {
      try {
        const content = fs.readFileSync(this.config.syncStatePath, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          syncedBookmarks: new Map(Object.entries(parsed.syncedBookmarks || {}))
        };
      } catch (error) {
        this.logger.warn('Failed to load sync state, creating new one');
      }
    }

    return {
      lastSyncTimestamp: 0,
      cometLastModified: 0,
      chromeLastModified: 0,
      syncedBookmarks: new Map()
    };
  }

  /**
   * Saves the sync state to disk
   */
  private saveSyncState(state: SyncState): void {
    const stateDir = path.dirname(this.config.syncStatePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const serializable = {
      ...state,
      syncedBookmarks: Object.fromEntries(state.syncedBookmarks)
    };

    fs.writeFileSync(
      this.config.syncStatePath,
      JSON.stringify(serializable, null, 2),
      'utf-8'
    );
  }

  /**
   * Main synchronization method - performs two-way sync
   */
  async synchronize(): Promise<void> {
    this.logger.info('=== Starting bookmark synchronization ===');

    try {
      // Step 1: Create backups
      this.logger.info('Creating backups...');
      const cometBackup = FileOperations.createBackup(
        this.config.cometBookmarksPath,
        this.config.backupDir
      );
      const chromeBackup = FileOperations.createBackup(
        this.config.chromeBookmarksPath,
        this.config.backupDir
      );
      this.logger.info(`Backups created: ${cometBackup}, ${chromeBackup}`);

      // Step 2: Load bookmark files
      this.logger.info('Loading bookmark files...');
      const cometBookmarks = FileOperations.readBookmarkFile(this.config.cometBookmarksPath);
      const chromeBookmarks = FileOperations.readBookmarkFile(this.config.chromeBookmarksPath);

      // Validate structure
      if (!FileOperations.validateBookmarkStructure(cometBookmarks)) {
        throw new Error('Invalid Comet bookmark structure');
      }
      if (!FileOperations.validateBookmarkStructure(chromeBookmarks)) {
        throw new Error('Invalid Chrome bookmark structure');
      }

      // Step 3: Flatten bookmarks for comparison
      this.logger.info('Analyzing bookmarks...');
      const flatComet = this.processor.flattenBookmarks(cometBookmarks);
      const flatChrome = this.processor.flattenBookmarks(chromeBookmarks);

      this.logger.info(`Comet bookmarks: ${flatComet.length}`);
      this.logger.info(`Chrome bookmarks: ${flatChrome.length}`);

      // Step 4: Create indexes for quick lookup
      const cometIndex = this.processor.createBookmarkIndex(flatComet);
      const chromeIndex = this.processor.createBookmarkIndex(flatChrome);

      // Step 5: Find differences
      const missingInChrome = this.processor.findMissingBookmarks(flatComet, chromeIndex);
      const missingInComet = this.processor.findMissingBookmarks(flatChrome, cometIndex);

      this.logger.info(`Bookmarks missing in Chrome: ${missingInChrome.length}`);
      this.logger.info(`Bookmarks missing in Comet: ${missingInComet.length}`);

      if (missingInChrome.length === 0 && missingInComet.length === 0) {
        this.logger.info('Bookmarks are already in sync. No changes needed.');
        return;
      }

      // Step 6: Perform two-way merge
      let chromeModified = false;
      let cometModified = false;

      if (missingInChrome.length > 0) {
        this.logger.info(`Adding ${missingInChrome.length} bookmarks to Chrome...`);
        const added = this.processor.addBookmarksToTarget(chromeBookmarks, missingInChrome);
        this.logger.info(`Added ${added} bookmarks to Chrome`);
        chromeModified = true;
      }

      if (missingInComet.length > 0) {
        this.logger.info(`Adding ${missingInComet.length} bookmarks to Comet...`);
        const added = this.processor.addBookmarksToTarget(cometBookmarks, missingInComet);
        this.logger.info(`Added ${added} bookmarks to Comet`);
        cometModified = true;
      }

      // Step 7: Write changes back to disk
      if (chromeModified) {
        FileOperations.updateChecksum(chromeBookmarks);
        FileOperations.writeBookmarkFile(this.config.chromeBookmarksPath, chromeBookmarks);
        this.logger.info('Chrome bookmarks updated');
      }

      if (cometModified) {
        FileOperations.updateChecksum(cometBookmarks);
        FileOperations.writeBookmarkFile(this.config.cometBookmarksPath, cometBookmarks);
        this.logger.info('Comet bookmarks updated');
      }

      // Step 8: Update sync state
      const syncedUrls = new Map<string, string>();
      cometIndex.forEach((bookmark, url) => {
        syncedUrls.set(url, bookmark.guid);
      });

      const syncState: SyncState = {
        lastSyncTimestamp: Date.now(),
        cometLastModified: FileOperations.getFileModifiedTime(this.config.cometBookmarksPath),
        chromeLastModified: FileOperations.getFileModifiedTime(this.config.chromeBookmarksPath),
        syncedBookmarks: syncedUrls
      };
      this.saveSyncState(syncState);

      this.logger.info('=== Synchronization completed successfully ===');
    } catch (error) {
      this.logger.error('Synchronization failed', error as Error);
      throw error;
    }
  }

  /**
   * Checks if synchronization is needed based on file modification times
   */
  isSyncNeeded(): boolean {
    const syncState = this.loadSyncState();
    const cometModTime = FileOperations.getFileModifiedTime(this.config.cometBookmarksPath);
    const chromeModTime = FileOperations.getFileModifiedTime(this.config.chromeBookmarksPath);

    return (
      cometModTime > syncState.cometLastModified ||
      chromeModTime > syncState.chromeLastModified
    );
  }
}
