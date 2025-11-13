#!/bin/bash

# Deploy chat widget to Cloudflare R2
# Requires: wrangler CLI and CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN env vars

set -e

echo "Deploying Chat Widget to Cloudflare R2..."

# Check required environment variables
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID environment variable is not set"
  exit 1
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN environment variable is not set"
  exit 1
fi

# Get package version
VERSION=$(node -p "require('./package.json').version")
echo "Package version: $VERSION"

# Check if dist files exist
if [ ! -f "dist/embed.js" ]; then
  echo "Error: dist/embed.js not found. Run 'bun run build:embed' first."
  exit 1
fi

if [ ! -f "dist/embed.css" ]; then
  echo "Error: dist/embed.css not found. Run 'bun run build:embed' first."
  exit 1
fi

# Install wrangler if not available
if ! command -v wrangler &> /dev/null; then
  echo "Installing wrangler..."
  npm install -g wrangler
fi

# Set R2 bucket name (customize as needed)
BUCKET_NAME="${R2_BUCKET_NAME:-chat-widget}"

echo "Deploying to bucket: $BUCKET_NAME"

# Upload versioned files (immutable, long cache)
echo "Uploading versioned files..."
wrangler r2 object put "$BUCKET_NAME/v$VERSION/embed.js" \
  --file=dist/embed.js \
  --content-type="application/javascript" \
  --cache-control="public, max-age=31536000, immutable"

wrangler r2 object put "$BUCKET_NAME/v$VERSION/embed.css" \
  --file=dist/embed.css \
  --content-type="text/css" \
  --cache-control="public, max-age=31536000, immutable"

# Upload latest files (shorter cache for updates)
echo "Uploading latest files..."
wrangler r2 object put "$BUCKET_NAME/latest/embed.js" \
  --file=dist/embed.js \
  --content-type="application/javascript" \
  --cache-control="public, max-age=3600"

wrangler r2 object put "$BUCKET_NAME/latest/embed.css" \
  --file=dist/embed.css \
  --content-type="text/css" \
  --cache-control="public, max-age=3600"

echo ""
echo "✓ Deployment completed successfully!"
echo ""
echo "CDN URLs:"
echo "  Versioned JS:  https://cdn.askio.com/$BUCKET_NAME/v$VERSION/embed.js"
echo "  Versioned CSS: https://cdn.askio.com/$BUCKET_NAME/v$VERSION/embed.css"
echo "  Latest JS:     https://cdn.askio.com/$BUCKET_NAME/latest/embed.js"
echo "  Latest CSS:    https://cdn.askio.com/$BUCKET_NAME/latest/embed.css"
echo ""
echo "Usage example:"
echo '<link rel="stylesheet" href="https://cdn.askio.com/'"$BUCKET_NAME"'/latest/embed.css">'
echo '<script src="https://cdn.askio.com/'"$BUCKET_NAME"'/latest/embed.js"'
echo '  data-askio-token="your-site-token"'
echo '  data-askio-theme="default">'
echo '</script>'
