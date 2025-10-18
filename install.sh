#!/bin/bash

# Bookmark Sync Installation Script
# This script installs the bookmark sync service as a macOS Launch Agent

set -e

echo "=== Bookmark Sync Installer ==="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js first."
    exit 1
fi

NODE_PATH=$(which node)
echo "✓ Node.js found: $(node --version) at $NODE_PATH"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "✓ Working directory: $SCRIPT_DIR"

# Install dependencies
echo ""
echo "Installing Node.js dependencies..."
npm install

# Build the TypeScript code
echo ""
echo "Building TypeScript code..."
npm run build

# Test run
echo ""
echo "Running test synchronization (dry run)..."
echo "NOTE: This will create backups but will sync your bookmarks!"
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

npm run sync

# Generate launcher script from template
LAUNCHER_TEMPLATE="$SCRIPT_DIR/bookmark-sync-launcher.sh.template"
LAUNCHER_GENERATED="$SCRIPT_DIR/bookmark-sync-launcher.sh"

echo ""
echo "Generating launcher script..."

# Check if launcher template exists
if [ ! -f "$LAUNCHER_TEMPLATE" ]; then
    echo "ERROR: Launcher template not found: $LAUNCHER_TEMPLATE"
    exit 1
fi

# Generate launcher script from template by replacing placeholders
sed -e "s|{{NODE_PATH}}|$NODE_PATH|g" \
    -e "s|{{PROJECT_DIR}}|$SCRIPT_DIR|g" \
    "$LAUNCHER_TEMPLATE" > "$LAUNCHER_GENERATED"

# Make launcher script executable
chmod +x "$LAUNCHER_GENERATED"

echo "✓ Generated launcher script: $LAUNCHER_GENERATED"

# Generate plist from template
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="ai.bookmarksync.plist"
PLIST_TEMPLATE="$SCRIPT_DIR/ai.bookmarksync.plist.template"
PLIST_GENERATED="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo ""
echo "Generating Launch Agent plist..."

# Check if template exists
if [ ! -f "$PLIST_TEMPLATE" ]; then
    echo "ERROR: Template file not found: $PLIST_TEMPLATE"
    exit 1
fi

# Generate plist from template by replacing placeholders
sed -e "s|{{NODE_PATH}}|$NODE_PATH|g" \
    -e "s|{{PROJECT_DIR}}|$SCRIPT_DIR|g" \
    -e "s|{{HOME_DIR}}|$HOME|g" \
    "$PLIST_TEMPLATE" > "$PLIST_GENERATED"

echo "✓ Generated plist file: $PLIST_GENERATED"

echo ""
echo "Installing Launch Agent..."

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Copy generated plist file
cp "$PLIST_GENERATED" "$PLIST_DEST"

echo "✓ Plist copied to: $PLIST_DEST"

# Load the launch agent
echo ""
echo "Loading Launch Agent..."
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo "✓ Launch Agent loaded successfully"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Bookmark synchronization is now running every hour."
echo ""
echo "Useful commands:"
echo "  Manual sync:     npm run sync"
echo "  View logs:       tail -f ~/Library/Logs/bookmark-sync.log"
echo "  Stop service:    launchctl unload ~/Library/LaunchAgents/ai.bookmarksync.plist"
echo "  Start service:   launchctl load ~/Library/LaunchAgents/ai.bookmarksync.plist"
echo "  Backups location: ~/.bookmark-sync/backups/"
echo ""
