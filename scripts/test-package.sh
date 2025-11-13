#!/bin/bash

# Script to test package installation locally
# This simulates what happens when someone installs from npm

set -e

echo "Testing @ask-io/chat-widget package..."

# Get the current directory (should be packages/chat-widget)
PACKAGE_DIR=$(pwd)
echo "Package directory: $PACKAGE_DIR"

# Pack the package
echo "Packing package..."
PACKAGE_FILE=$(npm pack 2>&1 | tail -n 1)
PACKAGE_PATH="$PACKAGE_DIR/$PACKAGE_FILE"
echo "Package file: $PACKAGE_PATH"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Navigate to temp directory
cd "$TEMP_DIR"

# Initialize a test project
echo "Initializing test project..."
npm init -y

# Install React (peer dependency)
echo "Installing peer dependencies..."
npm install react@18 react-dom@18

# Install the packed package
echo "Installing packed package..."
npm install "$PACKAGE_PATH"

# Verify installation
echo "Verifying installation..."

# Check if main exports exist
if [ -f "node_modules/@ask-io/chat-widget/dist/index.js" ]; then
  echo "✓ ESM bundle exists"
else
  echo "✗ ESM bundle missing"
  exit 1
fi

if [ -f "node_modules/@ask-io/chat-widget/dist/index.cjs" ]; then
  echo "✓ CommonJS bundle exists"
else
  echo "✗ CommonJS bundle missing"
  exit 1
fi

if [ -f "node_modules/@ask-io/chat-widget/dist/index.d.ts" ]; then
  echo "✓ TypeScript definitions exist"
else
  echo "✗ TypeScript definitions missing"
  exit 1
fi

if [ -f "node_modules/@ask-io/chat-widget/dist/index.css" ]; then
  echo "✓ Styles exist"
else
  echo "✗ Styles missing"
  exit 1
fi

if [ -f "node_modules/@ask-io/chat-widget/dist/embed.js" ]; then
  echo "✓ Embed script exists"
else
  echo "✗ Embed script missing"
  exit 1
fi

# Check package.json exports
echo "Checking package.json..."
node -e "
  const fs = require('fs');
  const path = require('path');
  const pkgPath = path.join(process.cwd(), 'node_modules/@ask-io/chat-widget/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log('Package name:', pkg.name);
  console.log('Package version:', pkg.version);
  console.log('Main:', pkg.main);
  console.log('Module:', pkg.module);
  console.log('Types:', pkg.types);
"

# Test import (basic syntax check)
echo "Testing imports..."
node -e "
  try {
    const widget = require('@ask-io/chat-widget');
    console.log('✓ CommonJS import works');
    console.log('Exports:', Object.keys(widget));
  } catch (e) {
    console.error('✗ CommonJS import failed:', e.message);
    process.exit(1);
  }
"

# Cleanup
echo "Cleaning up..."
cd "$PACKAGE_DIR"
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"

echo ""
echo "✓ Package test completed successfully!"
echo "The package is ready for publishing to npm."
