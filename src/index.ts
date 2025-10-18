import * as os from 'node:os';
import * as path from 'node:path';
import type { SyncConfig } from './models/bookmark.js';
import { SyncService } from './services/syncService.js';

/**
 * Main entry point for bookmark synchronization
 */
async function main(): Promise<void> {
  const homeDir = os.homedir();

  const config: SyncConfig = {
    cometBookmarksPath: path.join(
      homeDir,
      'Library/Application Support/Comet/Default/Bookmarks'
    ),
    chromeBookmarksPath: path.join(
      homeDir,
      'Library/Application Support/Google/Chrome/Default/Bookmarks'
    ),
    syncStatePath: path.join(homeDir, '.bookmark-sync/sync-state.json'),
    backupDir: path.join(homeDir, '.bookmark-sync/backups'),
    logPath: path.join(homeDir, 'Library/Logs/bookmark-sync.log')
  };

  const syncService = new SyncService(config);

  try {
    await syncService.synchronize();
    process.exit(0);
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

// Run the synchronization
main();
