# Quick Start Guide

## Installation

Clone the repository and run the automated installer:

```bash
git clone https://github.com/cezgit/bookmark-sync
cd bookmark-sync
./install.sh
```

The installer will:
1. Install Node.js dependencies
2. Build the TypeScript code
3. Run a test synchronization
4. Install the Launch Agent for hourly syncing

## Manual Sync

To run a manual sync at any time:

```bash
npm run sync
```

## View Logs

```bash
# View full log
cat ~/Library/Logs/bookmark-sync.log

# Follow logs in real-time
tail -f ~/Library/Logs/bookmark-sync.log
```

## Backups

Backups are automatically created before each sync:

```bash
ls -lth ~/.bookmark-sync/backups/
```

## Restore from Backup

If you need to restore bookmarks from a backup:

```bash
# List available backups
ls -lt ~/.bookmark-sync/backups/

# For Comet
cp ~/.bookmark-sync/backups/Bookmarks.TIMESTAMP.backup \
   ~/Library/Application\ Support/Comet/Default/Bookmarks

# For Chrome
cp ~/.bookmark-sync/backups/Bookmarks.TIMESTAMP.backup \
   ~/Library/Application\ Support/Google/Chrome/Default/Bookmarks
```

## Service Management

```bash
# Check if service is running
launchctl list | grep bookmarksync

# Stop the service
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist

# Start the service
launchctl load ~/Library/LaunchAgents/ai.bookmarksync.plist

# Uninstall completely
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist
rm ~/Library/LaunchAgents/ai.bookmarksync.plist
```

## How It Works

1. **Hourly Sync**: Automatically runs every hour via macOS Launch Agent
2. **Two-Way**: Bookmarks from Comet → Chrome and Chrome → Comet
3. **Smart Duplicate Detection**: Skips bookmarks that already exist (by URL)
4. **Safe**: Creates backups before every sync
5. **Logged**: All operations logged to `~/Library/Logs/bookmark-sync.log`

## What Gets Synced

- ✅ Bookmark URLs
- ✅ Bookmark names
- ✅ Folder hierarchy (preserved and recreated)
- ✅ New bookmarks in either browser

## What Doesn't Get Synced

- ❌ Deleted bookmarks (sync only adds, never removes)
- ❌ Modified bookmark names (keeps original)
- ❌ Bookmark order within folders

## Troubleshooting

### Is sync not working?

1. Check logs: `tail -f ~/Library/Logs/bookmark-sync.log`
2. Run manual sync to see errors: `npm run sync`
3. Verify both browsers are installed and have bookmark files

### Need to change the sync interval?

Edit `ai.bookmarksync.plist` and change the `StartInterval` value (in seconds):
- 3600 = 1 hour (default)
- 1800 = 30 minutes
- 7200 = 2 hours

Then reload:
```bash
launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist
launchctl load ~/Library/LaunchAgents/ai.bookmarksync.plist
```

## Test Results

Successfully synchronized 1013 bookmarks between Comet and Chrome browsers ✅

Tested on macOS with:
- Perplexity Comet Browser
- Google Chrome
- Node.js v18+
