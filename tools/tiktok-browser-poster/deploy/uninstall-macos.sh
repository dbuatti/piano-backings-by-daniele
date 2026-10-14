#!/usr/bin/env bash
# Stop and remove the launchd agent installed by install-macos.sh.
set -euo pipefail

LABEL="com.pianobackings.tiktok-poster"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Removed $LABEL. The browser profile in .auth/ was left in place."
