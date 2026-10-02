import fs from 'fs';
import path from 'path';
import { getChangelogVersion } from './sync-version.js';

const version = getChangelogVersion();
const targetExeName = `Outil-Update-OPEQ_v${version}.exe`;
const portableExeName = `Outil-Update-OPEQ_v${version}_Portable.exe`;
const releaseDir = path.join('src-tauri', 'target', 'release');

console.log(`\n=======================================================`);
console.log(`[post-build] 📦 Finalisation des binaires (Portable & Installeur) v${version}...`);
console.log(`=======================================================`);

if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  let found = false;

  // Search for the generated .exe (e.g., outil-update.exe or outil_update.exe)
  for (const file of files) {
    if (file.endsWith('.exe') && !file.includes('setup') && !file.includes('unins') && !file.startsWith('.')) {
      const srcPath = path.join(releaseDir, file);
      const destPath = path.join(releaseDir, targetExeName);
      const rootDestPath = path.join('.', targetExeName);
      const rootPortablePath = path.join('.', portableExeName);

      try {
        fs.copyFileSync(srcPath, destPath);
        fs.copyFileSync(srcPath, rootDestPath);
        fs.copyFileSync(srcPath, rootPortablePath);
        console.log(`  [+] Exécutable versionné créé dans : ${destPath}`);
        console.log(`  [+] Exécutable portable créé à la racine : .\\${portableExeName}`);
        found = true;
      } catch (e) {
        console.warn(`  [-] Erreur lors de la copie :`, e.message);
      }
    }
  }

  // Also check inside bundle / nsis / msi if generated (Installer)
  const bundleDir = path.join(releaseDir, 'bundle');
  if (fs.existsSync(bundleDir)) {
    console.log(`  [i] Packages d'installation détectés dans ${bundleDir}`);
    const bundleTypes = ['nsis', 'msi'];
    for (const bType of bundleTypes) {
      const bPath = path.join(bundleDir, bType);
      if (fs.existsSync(bPath)) {
        const pkgFiles = fs.readdirSync(bPath);
        for (const pkgFile of pkgFiles) {
          if (pkgFile.endsWith('.exe') || pkgFile.endsWith('.msi')) {
            const ext = path.extname(pkgFile);
            const installerDestName = `Outil-Update-OPEQ_v${version}_Installer${ext}`;
            const pkgSrc = path.join(bPath, pkgFile);
            const pkgDest = path.join('.', installerDestName);
            try {
              fs.copyFileSync(pkgSrc, pkgDest);
              console.log(`  [+] Installeur officiel copié à la racine : .\\${installerDestName}`);
            } catch (err) {
              console.warn(`  [-] Impossible de copier l'installeur :`, err.message);
            }
          }
        }
      }
    }
  }

  if (found) {
    console.log(`\n✅ SUCCÈS : Vos applications (Portable & Installeur) sont prêtes pour la distribution v${version} !\n`);
  }
} else {
  console.log(`[post-build] Note : Le dossier ${releaseDir} sera analysé dès la fin du build Rust.`);
}
