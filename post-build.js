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

if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  let portableFound = false;

  // 1. Search for the generated standalone executable in release directory
  for (const file of files) {
    if (file.endsWith('.exe') && !file.includes('setup') && !file.includes('unins') && !file.startsWith('.')) {
      const srcPath = path.join(releaseDir, file);
      const destReleasePath = path.join(releaseDir, targetExeName);
      const portablePath = path.join(distPortableDir, portableExeName);
      const standardPortablePath = path.join(distPortableDir, `${appName}.exe`);

      try {
        fs.copyFileSync(srcPath, destReleasePath);
        fs.copyFileSync(srcPath, portablePath);
        fs.copyFileSync(srcPath, standardPortablePath);
        console.log(`  [+] Portable Application copied to: ${portablePath}`);
        console.log(`  [+] Portable Application (standard name): ${standardPortablePath}`);
        portableFound = true;
      } catch (e) {
        console.warn(`  [-] Error copying portable application:`, e.message);
      }
    }
  }

  // 2. Search for Windows Installers (.exe NSIS and .msi WiX) in bundle directory
  const bundleDir = path.join(releaseDir, 'bundle');
  let installerFound = false;
  if (fs.existsSync(bundleDir)) {
    console.log(`  [i] Searching for installers in: ${bundleDir}`);
    const bundleTypes = ['nsis', 'msi'];
    for (const bType of bundleTypes) {
      const bPath = path.join(bundleDir, bType);
      if (fs.existsSync(bPath)) {
        const pkgFiles = fs.readdirSync(bPath);
        for (const pkgFile of pkgFiles) {
          if (pkgFile.endsWith('.exe') || pkgFile.endsWith('.msi')) {
            const ext = path.extname(pkgFile);
            const installerDestName = `${appName}_v${version}_Installer${ext}`;
            const standardInstallerName = `${appName}_Installer${ext}`;
            const pkgSrc = path.join(bPath, pkgFile);
            const pkgDest = path.join(distInstallerDir, installerDestName);
            const standardPkgDest = path.join(distInstallerDir, standardInstallerName);

            try {
              fs.copyFileSync(pkgSrc, pkgDest);
              fs.copyFileSync(pkgSrc, standardPkgDest);
              console.log(`  [+] Installer (${ext}) copied to: ${pkgDest}`);
              installerFound = true;
            } catch (err) {
              console.warn(`  [-] Failed to copy installer:`, err.message);
            }
          }
        }
      }
    }
  }

  console.log(`\n=======================================================`);
  if (portableFound || installerFound) {
    console.log(`✅ SUCCESS: ${appName} v${version} binaries ready for distribution!`);
    console.log(`   📂 Portable : dist/1_portable/${portableExeName}`);
    console.log(`   📂 Installer: dist/2_installer/`);
  } else {
    console.log(`[post-build] Note: Run 'npm run tauri:build' or 'run.bat' to compile native binaries.`);
  }
  console.log(`=======================================================\n`);
} else {
  console.log(`[post-build] Note: Directory ${releaseDir} will be created during Rust compilation.`);
}
