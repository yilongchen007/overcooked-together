#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs --open
elif [[ -x ../../.tools/bin/node ]]; then
  exec ../../.tools/bin/node server.mjs --open
else
  echo "Node.js 20 or newer is required."
  read -r
fi
