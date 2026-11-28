#!/bin/sh
# Builds the store ZIPs from extension/: one for Chrome Web Store and one for
# Firefox Add-ons (AMO). The Firefox manifest is derived from the Chrome one by
# scripts/extension-manifest.mjs, so only extension/manifest.json is edited.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$root/extension/manifest.json")
files="manifest.json service-worker.js content popup icons"
mkdir -p "$root/dist-extension"

chrome="$root/dist-extension/ronda-anotaciones-web-$version.zip"
rm -f "$chrome"
(cd "$root/extension" && zip -qr "$chrome" $files)
echo "$chrome"

firefox="$root/dist-extension/ronda-anotaciones-web-$version-firefox.zip"
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
(cd "$root/extension" && cp -r service-worker.js content popup icons "$stage/")
node --input-type=module -e "
import {readFileSync, writeFileSync} from 'node:fs';
import {toFirefoxManifest} from '$root/scripts/extension-manifest.mjs';
const chrome = JSON.parse(readFileSync('$root/extension/manifest.json', 'utf8'));
writeFileSync('$stage/manifest.json', JSON.stringify(toFirefoxManifest(chrome), null, 2) + '\n');
"
rm -f "$firefox"
(cd "$stage" && zip -qr "$firefox" $files)
echo "$firefox"
