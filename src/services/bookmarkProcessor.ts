import type { BookmarkNode, BookmarkFile, FlatBookmark } from '../models/bookmark.js';
import { Logger } from '../utils/logger.js';

export class BookmarkProcessor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Flattens the bookmark tree structure into a list for easier comparison
   */
  flattenBookmarks(bookmarkFile: BookmarkFile): FlatBookmark[] {
    const flatBookmarks: FlatBookmark[] = [];

    const traverse = (node: BookmarkNode, path: string[] = [], isRoot: boolean = false): void => {
      if (node.type === 'folder') {
        // Skip adding the root folder's name to the path since we're already inside it
        const newPath = (node.name && !isRoot) ? [...path, node.name] : path;
        if (node.children) {
          node.children.forEach(child => traverse(child, newPath, false));
        }
      } else if (node.type === 'url' && node.url) {
        flatBookmarks.push({
          url: node.url,
          name: node.name,
          path,
          dateAdded: node.date_added || '0',
          guid: node.guid,
          id: node.id
        });
      }
    };

    // Process bookmark bar (pass isRoot=true to skip adding "Bookmarks Bar" to path)
    if (bookmarkFile.roots.bookmark_bar) {
      traverse(bookmarkFile.roots.bookmark_bar, [], true);
    }

    // Process other bookmarks if they exist
    if (bookmarkFile.roots.other) {
      traverse(bookmarkFile.roots.other, ['Other Bookmarks'], true);
    }

    return flatBookmarks;
  }

  /**
   * Creates a URL-based index of bookmarks for quick lookup
   */
  createBookmarkIndex(flatBookmarks: FlatBookmark[]): Map<string, FlatBookmark> {
    const index = new Map<string, FlatBookmark>();
    flatBookmarks.forEach(bookmark => {
      index.set(bookmark.url, bookmark);
    });
    return index;
  }

  /**
   * Finds bookmarks that exist in source but not in target (by URL)
   */
  findMissingBookmarks(
    sourceBookmarks: FlatBookmark[],
    targetIndex: Map<string, FlatBookmark>
  ): FlatBookmark[] {
    return sourceBookmarks.filter(bookmark => !targetIndex.has(bookmark.url));
  }

  /**
   * Generates a new unique GUID for bookmarks
   */
  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generates a unique ID for bookmarks
   */
  private generateUniqueId(existingIds: Set<string>): string {
    let id: string;
    do {
      id = Math.floor(Math.random() * 1000000).toString();
    } while (existingIds.has(id));
    return id;
  }

  /**
   * Gets all existing IDs from a bookmark file
   */
  private collectExistingIds(bookmarkFile: BookmarkFile): Set<string> {
    const ids = new Set<string>();

    const traverse = (node: BookmarkNode): void => {
      ids.add(node.id);
      if (node.children) {
        node.children.forEach(child => traverse(child));
      }
    };

    if (bookmarkFile.roots.bookmark_bar) {
      traverse(bookmarkFile.roots.bookmark_bar);
    }
    if (bookmarkFile.roots.other) {
      traverse(bookmarkFile.roots.other);
    }

    return ids;
  }

  /**
   * Finds or creates a folder path in the bookmark tree
   */
  private findOrCreateFolderPath(
    root: BookmarkNode,
    path: string[],
    existingIds: Set<string>
  ): BookmarkNode {
    if (path.length === 0) {
      return root;
    }

    if (!root.children) {
      root.children = [];
    }

    const folderName = path[0];
    if (!folderName) {
      return root;
    }

    let folder = root.children.find(
      child => child.type === 'folder' && child.name === folderName
    );

    if (!folder) {
      // Create new folder
      const newId = this.generateUniqueId(existingIds);
      existingIds.add(newId);

      folder = {
        date_added: Date.now().toString(),
        date_modified: Date.now().toString(),
        guid: this.generateGuid(),
        id: newId,
        name: folderName,
        type: 'folder',
        children: []
      };
      root.children.push(folder);
    }

    return this.findOrCreateFolderPath(folder, path.slice(1), existingIds);
  }

  /**
   * Adds missing bookmarks from source to target
   */
  addBookmarksToTarget(
    targetBookmarkFile: BookmarkFile,
    missingBookmarks: FlatBookmark[]
  ): number {
    if (missingBookmarks.length === 0) {
      return 0;
    }

    const existingIds = this.collectExistingIds(targetBookmarkFile);
    let addedCount = 0;

    missingBookmarks.forEach(bookmark => {
      const targetFolder = this.findOrCreateFolderPath(
        targetBookmarkFile.roots.bookmark_bar,
        bookmark.path,
        existingIds
      );

      if (!targetFolder.children) {
        targetFolder.children = [];
      }

      // Generate new ID and GUID for the target browser
      const newId = this.generateUniqueId(existingIds);
      existingIds.add(newId);

      const newBookmark: BookmarkNode = {
        date_added: Date.now().toString(),
        date_last_used: '0',
        guid: this.generateGuid(),
        id: newId,
        name: bookmark.name,
        type: 'url',
        url: bookmark.url
      };

      targetFolder.children.push(newBookmark);
      addedCount++;
      this.logger.debug(`Added bookmark: ${bookmark.name} (${bookmark.url})`);
    });

    return addedCount;
  }
}
