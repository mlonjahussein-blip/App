#!/bin/bash
set -e

echo "=== Syncing AI Studio to GitHub (mlonjahussein-blip/App) ==="

git config --global user.name "mlonjahussein-blip"
git config --global user.email "mlonjahussein@gmail.com"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment secret is missing."
  exit 1
fi

git remote set-url origin "https://${GITHUB_TOKEN}@github.com/mlonjahussein-blip/App.git"

git add -A

if git diff-index --quiet HEAD --; then
  echo "No local changes to commit."
else
  COMMIT_MSG="${1:-Update from Google AI Studio ($(date -u +'%Y-%m-%d %H:%M:%S UTC'))}"
  git commit -m "$COMMIT_MSG"
  echo "Committed changes: $COMMIT_MSG"
fi

git push origin main
echo "=== Successfully pushed to https://github.com/mlonjahussein-blip/App ==="
