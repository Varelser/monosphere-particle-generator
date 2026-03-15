#!/bin/zsh

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "Kalokagathia launcher"
echo "Project: $SCRIPT_DIR"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed or not in PATH."
  echo "Install Node.js 18+ and run this launcher again."
  echo
  read -r "?Press Enter to close..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  echo "Install Node.js 18+ and run this launcher again."
  echo
  read -r "?Press Enter to close..."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
  if [[ $? -ne 0 ]]; then
    echo
    echo "npm install failed."
    read -r "?Press Enter to close..."
    exit 1
  fi
  echo
fi

echo "Starting development server and opening the app in your browser..."
echo "Leave this terminal window open while using Kalokagathia."
echo

npm run dev -- --host 127.0.0.1 --open

EXIT_CODE=$?
echo
echo "Kalokagathia stopped with exit code $EXIT_CODE."
read -r "?Press Enter to close..."
exit $EXIT_CODE