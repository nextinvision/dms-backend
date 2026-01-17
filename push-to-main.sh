#!/bin/bash
set -e

echo "🚀 Pushing development code to GitHub current branch"
echo "Started at $(date)"

cd ~/dms-dev/backend

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || true)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "❌ Not on a branch (detached HEAD). Please checkout a branch."
    exit 1
fi

# Add all changes
echo "📦 Staging all changes..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit. Everything is up to date."
    exit 0
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "chore: update from development environment - $(date +%Y-%m-%d\ %H:%M:%S)" || {
    echo "⚠️  No changes to commit"
    exit 0
}

# Push to current branch
echo "📤 Pushing to GitHub branch: $CURRENT_BRANCH ..."
git push origin "$CURRENT_BRANCH"

echo "✅ Successfully pushed to GitHub branch: $CURRENT_BRANCH"
echo "🔄 Production will auto-deploy via GitHub Actions"
echo "Completed at $(date)"
