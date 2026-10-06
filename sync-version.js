import fs from 'fs';
import path from 'path';

export function getChangelogVersion() {
  try {
    const changelogPath = fs.existsSync('changelog.md') ? 'changelog.md' : 'CHANGELOG.md';
    const changelog = fs.readFileSync(changelogPath, 'utf-8');
    const match = changelog.match(/Version (\d+\.\d+\.\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.warn('[sync-version] Impossible de lire changelog.md:', e.message);
  }
  return '1.2.6';
}

const version = getChangelogVersion();
console.log(`[sync-version] 🔄 Synchronisation avec la version ${version} depuis changelog.md...`);

// 1. Update package.json
try {
  const pkgPath = 'package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  [+] package.json mis à jour (version: ${version})`);
} catch (e) {
  console.error(`  [-] Erreur package.json:`, e.message);
}

// 2. Update tauri.conf.json
try {
  const tauriConfPath = 'src-tauri/tauri.conf.json';
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  tauriConf.version = version;
  tauriConf.productName = 'Hardware Diagnostic Tool';
  if (tauriConf.app && tauriConf.app.windows && tauriConf.app.windows[0]) {
    tauriConf.app.windows[0].title = `Hardware Diagnostic & Update Tool v${version}`;
  }
  delete tauriConf.mainBinaryName;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`  [+] tauri.conf.json mis à jour (titre: Hardware Diagnostic & Update Tool v${version})`);
} catch (e) {
  console.error(`  [-] Erreur tauri.conf.json:`, e.message);
}

// 3. Update Cargo.toml (Rust crate version)
try {
  const cargoPath = 'src-tauri/Cargo.toml';
  let cargo = fs.readFileSync(cargoPath, 'utf-8');
  cargo = cargo.replace(/^version\s*=\s*".*?"/m, `version = "${version}"`);
  // Remove any manual [[bin]] section so Cargo keeps default crate naming without dot errors
  cargo = cargo.replace(/\n\[\[bin\]\][\s\S]*$/m, '').trimEnd() + '\n';
  fs.writeFileSync(cargoPath, cargo);
  console.log(`  [+] Cargo.toml mis à jour (version = "${version}")`);
} catch (e) {
  console.error(`  [-] Erreur Cargo.toml:`, e.message);
}

console.log(`[sync-version] ✅ Synchronisation terminée.`);
