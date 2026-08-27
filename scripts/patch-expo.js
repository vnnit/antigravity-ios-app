const fs = require('fs');
const path = require('path');

// 1. Patch RuntimeScheduler.h in expo-modules-jsi
const targetHeader = path.join(__dirname, '../node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h');
if (fs.existsSync(targetHeader)) {
  let content = fs.readFileSync(targetHeader, 'utf8');
  content = content.replace(/SWIFT_RETURNS_RETAINED\s+RuntimeScheduler/g, 'RuntimeScheduler');
  fs.writeFileSync(targetHeader, content, 'utf8');
  console.log('[Patch] Successfully patched RuntimeScheduler.h');
}

// 2. Patch Package.swift to swift-tools-version: 6.0
const targetPackage = path.join(__dirname, '../node_modules/expo-modules-jsi/apple/Package.swift');
if (fs.existsSync(targetPackage)) {
  let content = fs.readFileSync(targetPackage, 'utf8');
  content = content.replace('// swift-tools-version: 6.2', '// swift-tools-version: 6.0');
  fs.writeFileSync(targetPackage, content, 'utf8');
  console.log('[Patch] Successfully patched Package.swift');
}
