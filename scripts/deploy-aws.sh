#!/bin/bash

# Deploy chat widget to AWS S3 + CloudFront
# Requires: AWS CLI and AWS credentials configured

set -e

echo "Deploying Chat Widget to AWS S3/CloudFront..."

# Check required environment variables
if [ -z "$AWS_S3_BUCKET" ]; then
  echo "Error: AWS_S3_BUCKET environment variable is not set"
  exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed. Install it first:"
  echo "  pip install awscli"
  exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo "Error: AWS credentials are not configured"
  echo "Run: aws configure"
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

# Set S3 path prefix
S3_PREFIX="${S3_PATH_PREFIX:-chat-widget}"

echo "Deploying to S3 bucket: $AWS_S3_BUCKET"
echo "Path prefix: $S3_PREFIX"

# Upload versioned files (immutable, long cache)
echo "Uploading versioned files..."
aws s3 cp dist/embed.js \
  "s3://$AWS_S3_BUCKET/$S3_PREFIX/v$VERSION/embed.js" \
  --content-type "application/javascript" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

aws s3 cp dist/embed.css \
  "s3://$AWS_S3_BUCKET/$S3_PREFIX/v$VERSION/embed.css" \
  --content-type "text/css" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Upload latest files (shorter cache for updates)
echo "Uploading latest files..."
aws s3 cp dist/embed.js \
  "s3://$AWS_S3_BUCKET/$S3_PREFIX/latest/embed.js" \
  --content-type "application/javascript" \
  --cache-control "public, max-age=3600" \
  --metadata-directive REPLACE

aws s3 cp dist/embed.css \
  "s3://$AWS_S3_BUCKET/$S3_PREFIX/latest/embed.css" \
  --content-type "text/css" \
  --cache-control "public, max-age=3600" \
  --metadata-directive REPLACE

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$AWS_CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/$S3_PREFIX/latest/*"
  echo "✓ CloudFront cache invalidated"
fi

echo ""
echo "✓ Deployment completed successfully!"
echo ""
echo "S3 URLs:"
echo "  Versioned JS:  s3://$AWS_S3_BUCKET/$S3_PREFIX/v$VERSION/embed.js"
echo "  Versioned CSS: s3://$AWS_S3_BUCKET/$S3_PREFIX/v$VERSION/embed.css"
echo "  Latest JS:     s3://$AWS_S3_BUCKET/$S3_PREFIX/latest/embed.js"
echo "  Latest CSS:    s3://$AWS_S3_BUCKET/$S3_PREFIX/latest/embed.css"
echo ""

if [ -n "$CDN_DOMAIN" ]; then
  echo "CDN URLs:"
  echo "  Versioned JS:  https://$CDN_DOMAIN/$S3_PREFIX/v$VERSION/embed.js"
  echo "  Versioned CSS: https://$CDN_DOMAIN/$S3_PREFIX/v$VERSION/embed.css"
  echo "  Latest JS:     https://$CDN_DOMAIN/$S3_PREFIX/latest/embed.js"
  echo "  Latest CSS:    https://$CDN_DOMAIN/$S3_PREFIX/latest/embed.css"
  echo ""
  echo "Usage example:"
  echo '<link rel="stylesheet" href="https://'"$CDN_DOMAIN"'/'"$S3_PREFIX"'/latest/embed.css">'
  echo '<script src="https://'"$CDN_DOMAIN"'/'"$S3_PREFIX"'/latest/embed.js"'
  echo '  data-askio-token="your-site-token"'
  echo '  data-askio-theme="default">'
  echo '</script>'
fi
