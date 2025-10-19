#!/usr/bin/env node

/**
 * Build script to inject version into service worker
 * Runs during build to update cache name with current version
 */

const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);
const version = packageJson.version;

// Read service worker template
const swPath = path.join(__dirname, '../public/sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

// Replace __VERSION__ placeholder with actual version
const updatedContent = swContent.replace(
  /const CACHE_NAME = ['"]sabzzi-v1['"];/,
  `const CACHE_NAME = 'sabzzi-v${version}';`
);

// Write updated service worker
fs.writeFileSync(swPath, updatedContent);

// Create version.ts file for the app to import
const versionTsPath = path.join(__dirname, '../src/lib/version.ts');
const versionTsContent = `// Auto-generated file - do not edit manually
// Updated by scripts/version-sw.js during build

export const APP_VERSION = '${version}';
export const BUILD_DATE = '${new Date().toISOString()}';
`;
fs.writeFileSync(versionTsPath, versionTsContent);

console.log(`✅ Service worker updated with version: ${version}`);
console.log(`   Cache name: sabzzi-v${version}`);
console.log(`   App version: ${version}`);
