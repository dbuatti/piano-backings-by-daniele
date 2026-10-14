#!/bin/bash
# Double-click this on the Mac Mini (over Screen Sharing) to log into TikTok once.
# It opens a Chromium window; log in by hand. It finishes on its own once detected.
set -uo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"   # the mini's /usr/local/bin/node is an old v14

echo "Node: $(node -v 2>/dev/null || echo 'not found — install with: brew install node')"
echo
HEADLESS=0 npm run login
echo
read -n 1 -s -r -p "Press any key to close…"
