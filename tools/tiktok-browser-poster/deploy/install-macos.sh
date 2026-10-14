#!/usr/bin/env bash
# Install the TikTok browser poster as a per-user macOS launch agent, so it runs
# on login and restarts itself if it ever dies.
#
#   cd tools/tiktok-browser-poster
#   npm install && npx playwright install chromium
#   cp .env.example .env   # fill SUPABASE_SERVICE_ROLE_KEY
#   bash deploy/install-macos.sh
#
# Run this on the machine that will host it (e.g. the Mac Mini) so the TikTok
# session and the posting IP stay together.
set -euo pipefail

LABEL="com.pianobackings.tiktok-poster"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
if [[ -z "$NODE_BIN" || ! -x "$NPM_BIN" ]]; then
  echo "Couldn't find node/npm on PATH. Install Node (e.g. via Homebrew) first." >&2
  exit 1
fi
if [[ ! -f "$HERE/.env" ]]; then
  echo "Missing $HERE/.env — copy .env.example and fill in SUPABASE_SERVICE_ROLE_KEY first." >&2
  exit 1
fi
if [[ ! -d "$HERE/node_modules" ]]; then
  echo "Run 'npm install' in $HERE first." >&2
  exit 1
fi
if [[ ! -d "$HERE/.auth/profile" ]]; then
  echo "No saved session found. Run 'HEADLESS=0 npm run login' first (or copy .auth/profile from the machine you logged in on)." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>WorkingDirectory</key>
  <string>$HERE</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-s</string>
    <string>$NODE_BIN</string>
    <string>$HERE/node_modules/.bin/tsx</string>
    <string>src/index.ts</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$NODE_BIN"):/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HEADLESS</key>
    <string>1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HERE/.launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$HERE/.launchd.err.log</string>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed and started: $LABEL"
echo "Logs:   tail -f \"$HERE/.launchd.out.log\" \"$HERE/.launchd.err.log\""
echo "Stop:   launchctl unload \"$PLIST\""
