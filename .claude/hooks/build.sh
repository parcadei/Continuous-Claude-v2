#!/bin/bash
# Rebuild bundled hooks from TypeScript source
# Only needed if you modify src/*.ts files

set -e
cd "$(dirname "$0")"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "Installing dev dependencies..."
    npm install
fi

echo "Building hooks..."
npm run build

echo "Done! Bundled files in dist/"
