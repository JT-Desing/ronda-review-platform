#!/bin/sh
# Builds the Chrome Web Store ZIP: the extension files only, without its docs.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$root/extension/manifest.json")
out="$root/dist-extension/ronda-anotaciones-web-$version.zip"
mkdir -p "$root/dist-extension"
rm -f "$out"
cd "$root/extension"
zip -qr "$out" manifest.json service-worker.js content popup icons
echo "$out"
