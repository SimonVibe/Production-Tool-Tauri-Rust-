import fs from 'fs';
import path from 'path';
import { getChangelogVersion } from './sync-version.js';

const version = getChangelogVersion();
const appName = 'Production-Tool';
const targetExeName = `${appName}_v${version}.exe`;
const portableExeName = `${appName}_v${version}_Portable.exe`;
const releaseDir = path.join('src-tauri', 'target', 'release');
const distPortableDir = path.join('dist', '1_portable');
const distInstallerDir = path.join('dist', '2_installer');

console.log(`\n=======================================================`);
console.log(`[post-build] 📦 Packaging ${appName} v${version}...`);
console.log(`  📁 Portable Destination : ./${distPortableDir}/`);
console.log(`  📁 Installer Destination: ./${distInstallerDir}/`);
console.log(`=======================================================`);

// Ensure output directories exist
fs.mkdirSync(distPortableDir, { recursive: true });
fs.mkdirSync(distInstallerDir, { recursive: true });

function safeCopy(src, dest) {
  try {
    const absSrc = path.resolve(src);
    const absDest = path.resolve(dest);
    if (absSrc === absDest) return true;
    fs.copyFileSync(src, dest);
    return true;
  } catch (err) {
    console.warn(`  [-] Failed to copy ${src} -> ${dest}:`, err.message);
    return false;
  }
}

function findFilesRecursively(dir, filterFn, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFilesRecursively(fullPath, filterFn, results);
    } else if (filterFn(entry.name, fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

let portableCopied = false;
let installerCopied = false;

// 1. Process Standalone Portable Executable in releaseDir
if (fs.existsSync(releaseDir)) {
  const rootFiles = fs.readdirSync(releaseDir, { withFileTypes: true });
  
  for (const entry of rootFiles) {
    if (entry.isFile() && entry.name.endsWith('.exe')) {
      const lower = entry.name.toLowerCase();
      // Exclude build scripts and uninstaller helpers
      if (
        lower.includes('build_script') || 
        lower.includes('unins') || 
        lower.startsWith('.')
      ) {
        continue;
      }

      const srcPath = path.join(releaseDir, entry.name);
      const destReleasePath = path.join(releaseDir, targetExeName);
      const portablePath = path.join(distPortableDir, portableExeName);
      const standardPortablePath = path.join(distPortableDir, `${appName}.exe`);

      safeCopy(srcPath, destReleasePath);
      if (safeCopy(srcPath, portablePath)) {
        console.log(`  [+] Portable Application copied to: ${portablePath}`);
        portableCopied = true;
      }
      if (safeCopy(srcPath, standardPortablePath)) {
        console.log(`  [+] Portable Application (standard name): ${standardPortablePath}`);
      }
    }
  }

  // 2. Search recursively inside bundle directory for Installers (.exe, .msi)
  const bundleDir = path.join(releaseDir, 'bundle');
  if (fs.existsSync(bundleDir)) {
    console.log(`  [i] Searching for installers in: ${bundleDir}`);
    const installerFiles = findFilesRecursively(bundleDir, (name) => {
      const lower = name.toLowerCase();
      return (lower.endsWith('.exe') || lower.endsWith('.msi')) && !lower.includes('unins');
    });

    for (const pkgSrc of installerFiles) {
      const ext = path.extname(pkgSrc);
      const baseName = path.basename(pkgSrc);
      const installerDestName = `${appName}_v${version}_Installer${ext}`;
      const standardInstallerName = `${appName}_Installer${ext}`;
      
      const pkgDest = path.join(distInstallerDir, installerDestName);
      const standardPkgDest = path.join(distInstallerDir, standardInstallerName);
      const originalPkgDest = path.join(distInstallerDir, baseName);

      if (safeCopy(pkgSrc, pkgDest)) {
        console.log(`  [+] Installer (${ext}) copied to: ${pkgDest}`);
        installerCopied = true;
      }
      safeCopy(pkgSrc, standardPkgDest);
      safeCopy(pkgSrc, originalPkgDest);
    }
  }
}

// 3. Fallback: Check if root or dist has any standalone .exe to ensure dist/1_portable is populated
if (!portableCopied) {
  const potentialLocations = [
    path.join('src-tauri', 'target', 'release', 'production-tool.exe'),
    path.join('src-tauri', 'target', 'release', 'Production-Tool.exe'),
    path.join('src-tauri', 'target', 'release', 'Production Tool.exe'),
    path.join('src-tauri', 'target', 'release', 'outil-update.exe'),
    path.join('.', `Production-Tool_v${version}_Portable.exe`),
    path.join('.', 'Production-Tool.exe'),
    path.join('.', 'Production Tool.exe'),
    path.join('.', `Hardware-Diagnostic-Tool_v${version}_Portable.exe`),
  ];

  for (const candidate of potentialLocations) {
    if (fs.existsSync(candidate)) {
      const portablePath = path.join(distPortableDir, portableExeName);
      const standardPortablePath = path.join(distPortableDir, `${appName}.exe`);
      if (safeCopy(candidate, portablePath)) {
        console.log(`  [+] Found and copied portable executable from ${candidate} -> ${portablePath}`);
        safeCopy(candidate, standardPortablePath);
        portableCopied = true;
        break;
      }
    }
  }
}

console.log(`\n=======================================================`);
if (portableCopied || installerCopied) {
  console.log(`✅ SUCCESS: ${appName} v${version} deliverables organized in dist!`);
  if (portableCopied) console.log(`   📂 Portable  : dist/1_portable/${portableExeName}`);
  if (installerCopied) console.log(`   📂 Installer : dist/2_installer/`);
} else {
  console.log(`[post-build] Note: Compilation artifacts will be placed in dist/ when running Tauri build.`);
}
console.log(`=======================================================\n`);

