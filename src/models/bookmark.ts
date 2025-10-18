/**
 * Represents a Chromium-format bookmark structure
 */

export interface BookmarkNode {
  date_added?: string;
  date_last_used?: string;
  date_modified?: string;
  guid: string;
  id: string;
  name: string;
  type: 'url' | 'folder';
  url?: string;
  children?: BookmarkNode[];
}

export interface BookmarkRoots {
  bookmark_bar: BookmarkNode;
  other?: BookmarkNode;
  synced?: BookmarkNode;
}

export interface BookmarkFile {
  checksum: string;
  roots: BookmarkRoots;
  version?: number;
}

/**
 * Represents a flattened bookmark for easier comparison
 */
export interface FlatBookmark {
  url: string;
  name: string;
  path: string[]; // Folder hierarchy
  dateAdded: string;
  guid: string;
  id: string;
}

/**
 * Configuration for bookmark sync
 */
export interface SyncConfig {
  cometBookmarksPath: string;
  chromeBookmarksPath: string;
  syncStatePath: string;
  backupDir: string;
  logPath: string;
}

/**
 * Tracks the state of synchronization
 */
export interface SyncState {
  lastSyncTimestamp: number;
  cometLastModified: number;
  chromeLastModified: number;
  syncedBookmarks: Map<string, string>; // URL -> GUID mapping
}
