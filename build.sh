#!/bin/bash
# Build the slim deploy bundle (webp images, normalized mp3s) into dist/, then deploy to the IKAROS Pages project.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist/assets/voice dist/assets/sprites dist/assets/arenas dist/assets/crowd
cp index.html manifest.webmanifest dist/ && cp -R js icons dist/ && mkdir -p dist/assets/ui && cp assets/ui/*.webp dist/assets/ui/
BUILD=$(date +%s)
sed "s/__BUILD__/$BUILD/" sw.js > dist/sw.js
# cache-bust every script + data URL per deploy (the zone's browser-cache TTL overrides _headers)
sed -e "s/__BUILD__/$BUILD/" -e "s#src=\"js/\([a-z]*\)\.js\"#src=\"js/\1.js?v=$BUILD\"#g" index.html > dist/index.html
rsync -a --include='*/' --include='*.webp' --include='*.json' --exclude='*' assets/sprites/ dist/assets/sprites/
cp assets/arenas/*.webp dist/assets/arenas/ && cp assets/crowd/*.webp dist/assets/crowd/
cp assets/voice/*.mp3 assets/voice/manifest.json assets/voice/lines.json dist/assets/voice/
printf '/assets/*\n  Cache-Control: public, max-age=86400\n/js/*\n  Cache-Control: public, max-age=60\n' > dist/_headers
echo "dist: $(du -sh dist | cut -f1), $(find dist -type f | wc -l | tr -d ' ') files"
[ "${1:-}" = "deploy" ] && worker/deploy.sh pages deploy "$PWD/dist" --project-name tokken --branch main --commit-dirty=true
