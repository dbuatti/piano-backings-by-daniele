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

# Node detection: pick a modern Node (18+). Homebrew's node can be shadowed by
# an older /usr/local/bin/node, so probe the common locations and take the first
# that is new enough — otherwise the agent would run an ancient Node and die.
NODE_BIN=""
NODE_DIR=""
for candidate in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node || true)"; do
  [[ -n "$candidate" && -x "$candidate" ]] || continue
  major="$("$candidate" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
  [[ "$major" =~ ^[0-9]+$ ]] || continue
  if (( major >= 18 )); then
    NODE_BIN="$candidate"
    NODE_DIR="$(dirname "$candidate")"
    break
  fi
done
if [[ -z "$NODE_BIN" ]]; then
  echo "No Node 18+ found (looked at /opt/homebrew/bin/node and /usr/local/bin/node)." >&2
  echo "Install one with: brew install node" >&2
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
    <string>$HERE/node_modules/tsx/dist/cli.mjs</string>
    <string>src/index.ts</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin</string>
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

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST" 2>/dev/null || true
if ! launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null; then
  launchctl load "$PLIST" 2>/dev/null || true
fi
launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || true

if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo "Installed and running: $LABEL"
else
  echo "Installed $LABEL, but it isn't running yet."
  echo "Over SSH with no desktop session? Enable auto-login on the mini so the agent can start."
fi
echo "Logs:   tail -f \"$HERE/.launchd.out.log\" \"$HERE/.launchd.err.log\""
echo "Stop:   launchctl unload \"$PLIST\""
