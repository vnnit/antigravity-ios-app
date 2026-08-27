#!/bin/bash
set -e

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: ./scripts/bump-version.sh <new_version> (e.g. 1.0.1)"
  exit 1
fi

echo "Updating version to $NEW_VERSION..."

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update app.json
node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.version = '$NEW_VERSION';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
"

echo "Updated package.json and app.json to v$NEW_VERSION"

# Git commit and tag
git add package.json app.json
git commit -m "chore(release): bump version to v$NEW_VERSION" || true
git tag -a "v$NEW_VERSION" -m "Release Antigravity v$NEW_VERSION" || true

echo "Tagged v$NEW_VERSION. Push with: git push origin main --tags"
