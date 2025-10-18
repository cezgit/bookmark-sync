# Bookmark Sync - Comet ↔ Chrome

Automated two-way bookmark synchronization between Perplexity Comet and Google Chrome browsers on macOS.

## Features

- **Two-way sync**: Keeps bookmarks in sync between both browsers
- **Automatic scheduling**: Runs every hour via macOS Launch Agent
- **Smart duplicate detection**: Skips bookmarks that already exist (by URL)
- **Automatic backups**: Creates timestamped backups before each sync
- **Folder hierarchy preservation**: Maintains bookmark folder structure
- **Comprehensive logging**: Detailed logs for monitoring and debugging

## Requirements

- macOS
- Node.js (v18 or later recommended)
- Google Chrome installed
- Perplexity Comet browser installed

## Important: Browser State

**⚠️ Both Chrome and Comet must be completely closed before running a sync.**

Chromium-based browsers keep bookmarks in memory and periodically write them to disk. If you run a sync while the browsers are open, they will overwrite the synced changes with their in-memory version, causing the sync to appear to fail.

**Before syncing:**
1. Completely quit Google Chrome (Cmd+Q or Chrome > Quit)
2. Completely quit Perplexity Comet (Cmd+Q or Comet > Quit)
3. Run the sync
4. Reopen your browsers

This applies to both manual syncs and the automatic hourly sync.

## Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/cezgit/bookmark-sync
   cd bookmark-sync
   ```

2. **Run the installer**:
   ```bash
   ./install.sh
   ```

   The installer will:
   - Install Node.js dependencies
   - Build the TypeScript code
   - Run a test synchronization
   - Generate launcher script and plist from templates
   - Install and start the macOS Launch Agent

## Manual Usage

### Run a one-time sync:

**Important:** Close both Chrome and Comet completely before running the sync.

```bash
npm run sync
```

### Build the project:
```bash
npm run build
```

### View logs:
```bash
tail -f ~/Library/Logs/bookmark-sync.log
```

## How It Works

1. **Backup**: Creates timestamped backups of both bookmark files
2. **Read**: Loads bookmark files from both browsers
3. **Analyze**: Flattens the bookmark tree and compares URLs
4. **Merge**: Adds missing bookmarks from each browser to the other
5. **Write**: Updates both bookmark files with merged bookmarks
6. **State**: Saves sync state for future runs

### Bookmark Locations

- **Comet**: `~/Library/Application Support/Comet/Default/Bookmarks`
- **Chrome**: `~/Library/Application Support/Google/Chrome/Default/Bookmarks`

### Data Storage

- **Backups**: `~/.bookmark-sync/backups/`
- **Sync state**: `~/.bookmark-sync/sync-state.json`
- **Logs**: `~/Library/Logs/bookmark-sync.log`

## Managing the Service

### Check if service is running:
```bash
launchctl list | grep bookmarksync
```

### Stop the service:
```bash
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist
```

### Start the service:
```bash
launchctl load ~/Library/LaunchAgents/ai.bookmarksync.plist
```

### Uninstall:
```bash
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist
rm ~/Library/LaunchAgents/ai.bookmarksync.plist
```

## Configuration

Edit `src/index.ts` to customize paths or sync behavior.

## Sync Schedule

By default, the sync runs:
- **Every hour** (3600 seconds)
- **On system startup** (RunAtLoad)

To change the interval:
1. Edit `ai.bookmarksync.plist.template` and update the `StartInterval` value (in seconds)
2. Re-run the installer: `./install.sh`

Alternatively, you can manually edit the generated `~/Library/LaunchAgents/ai.bookmarksync.plist` and reload:
```bash
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist
launchctl load ~/Library/LaunchAgents/ai.bookmarksync.plist
```

## Safety Features

- **Automatic backups**: Every sync creates timestamped backups
- **Validation**: Checks bookmark file structure before writing
- **Checksum updates**: Maintains Chromium checksum integrity
- **Error handling**: Comprehensive error logging and recovery
- **Browser-agnostic IDs**: Generates new GUIDs and IDs for each browser

## Duplicate Handling

Bookmarks are considered duplicates if they have the same URL. The sync:
- Skips adding bookmarks that already exist in the target browser
- Preserves all existing bookmarks
- Does not modify or remove any bookmarks

## Troubleshooting

### Sync not running:
1. Check if the service is loaded: `launchctl list | grep bookmarksync`
2. View error logs: `cat ~/Library/Logs/bookmark-sync-stderr.log`
3. Manually run sync to see errors: `npm run sync`

### Bookmarks not syncing:
1. **Most common issue:** Ensure both Chrome and Comet are completely closed (Cmd+Q) before and during sync
   - Browsers keep bookmarks in memory and will overwrite file changes
   - Check if browsers are running: `ps aux | grep -i "chrome\|comet" | grep -v grep`
2. Check logs: `tail -f ~/Library/Logs/bookmark-sync.log`
3. Verify bookmark file permissions
4. Check that bookmark files exist at expected paths

### Restore from backup:
```bash
# List backups
ls -lt ~/.bookmark-sync/backups/

# Restore Comet bookmarks
cp ~/.bookmark-sync/backups/Bookmarks.2025-10-17T15-30-00.backup \
   ~/Library/Application\ Support/Comet/Default/Bookmarks

# Restore Chrome bookmarks
cp ~/.bookmark-sync/backups/Bookmarks.2025-10-17T15-30-00.backup \
   ~/Library/Application\ Support/Google/Chrome/Default/Bookmarks
```

## Generated Files

The installation process generates user-specific files from templates:

**Template files (in repository):**
- `ai.bookmarksync.plist.template` - Launch Agent configuration template
- `bookmark-sync-launcher.sh.template` - Launcher script template

**Generated files (not in repository):**
- `ai.bookmarksync.plist` - Your personalized Launch Agent configuration
- `bookmark-sync-launcher.sh` - Your personalized launcher with Node.js path
- `~/Library/LaunchAgents/ai.bookmarksync.plist` - Installed Launch Agent

The launcher script sets a custom process name ("Bookmark Sync") so the service appears with a descriptive name in macOS System Settings instead of "node".

## Architecture

```
src/
├── index.ts                 # Main entry point
├── models/
│   └── bookmark.ts          # TypeScript types and interfaces
├── services/
│   ├── syncService.ts       # Main sync orchestration
│   └── bookmarkProcessor.ts # Bookmark comparison and merging
└── utils/
    ├── fileOps.ts           # File I/O operations
    └── logger.ts            # Logging utility
```

## Development

### Project structure:
- Written in TypeScript
- Uses Node.js built-in modules (fs, path, crypto, os)
- Follows SOLID principles
- Comprehensive error handling

### Key classes:
- `SyncService`: Orchestrates the sync process
- `BookmarkProcessor`: Handles bookmark tree traversal and merging
- `FileOperations`: Manages file reading, writing, and backups
- `Logger`: Provides structured logging

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

**Cezar Balaita**
- GitHub: [@cezgit](https://github.com/cezgit)
- Email: cezarb@gmail.com

Created for synchronizing Perplexity Comet and Google Chrome bookmarks on macOS.
