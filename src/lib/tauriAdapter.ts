import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AppConfig, defaultConfig, WindowsUpdateDriver, NasDriverModel, InfDriverDetail, BiosDetailedInfo, SecurityStatus, PnpMissingDevice, BatteryStatus } from '../types';

// Detect if we are running inside Tauri
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_METADATA__ ||
    (window as any).isTauri ||
    (window as any).__TAURI_INVOKE__
  );
};

// In-memory & local cache to prevent blocking UI queries
let cachedSysInfo: Record<string, string> | null = null;

let cachedModelDetails: { make: string; model: string; formFactor: string; serialNumber: string } | null = null;
let cachedBiosInfo: BiosDetailedInfo | null = null;
let cachedSecurityStatus: SecurityStatus | null = (() => {
  try {
    const saved = localStorage.getItem('app-security-cache') || localStorage.getItem('opeq-security-cache');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

// Unified Hardware API matching the Tauri Rust backend contract with full Web Preview simulation
export const hardwareAPI = {
  clearCache(): void {
    cachedSysInfo = null;
    cachedModelDetails = null;
    cachedBiosInfo = null;
    cachedSecurityStatus = null;
    try {
      localStorage.removeItem('app-security-cache');
      localStorage.removeItem('opeq-security-cache');
    } catch {}
  },

  async loadConfig(): Promise<AppConfig> {
    let rawConfig: AppConfig | null = null;

    if (isTauri()) {
      try {
        rawConfig = await invoke<AppConfig | null>('load_config');
      } catch (err) {
        console.warn('Tauri load_config failed, falling back to cache/default', err);
      }
    } else if (window.electronAPI?.loadConfig) {
      rawConfig = await window.electronAPI.loadConfig();
    }

    if (!rawConfig) {
      const saved = localStorage.getItem('app-tauri-config') || localStorage.getItem('opeq-tauri-config');
      if (saved) {
        try {
          rawConfig = JSON.parse(saved);
        } catch (e) {
          console.error('Failed parsing localStorage config', e);
        }
      }
    }

    const mergedConfig: AppConfig = {
      ...defaultConfig,
      ...(rawConfig || {}),
      externalApps: rawConfig?.externalApps && Array.isArray(rawConfig.externalApps)
        ? rawConfig.externalApps.filter((a) => a && (a.name?.trim() || a.path?.trim()))
        : (defaultConfig.externalApps || []),
      hiddenTests: {
        ...defaultConfig.hiddenTests,
        ...(rawConfig?.hiddenTests || {}),
      },
      hiddenSpecs: {
        ...defaultConfig.hiddenSpecs,
        ...(rawConfig?.hiddenSpecs || {}),
      },
    };

    return mergedConfig;
  },

  async saveConfig(config: AppConfig): Promise<void> {
    const cleanConfig: AppConfig = {
      ...config,
      externalApps: (config.externalApps || []).filter((a) => a && (a.name?.trim() || a.path?.trim())),
    };

    // Always cache in localStorage for instant retrieval
    try {
      localStorage.setItem('app-tauri-config', JSON.stringify(cleanConfig));
    } catch {}

    if (isTauri()) {
      try {
        await invoke('save_config', { config: cleanConfig });
      } catch (err) {
        console.error('Tauri save_config error:', err);
      }
    } else if (window.electronAPI?.saveConfig) {
      await window.electronAPI.saveConfig(cleanConfig);
    }
  },

  async executeAction(name: string, path: string): Promise<{ success: boolean; output?: string; error?: string }> {
    if (isTauri()) {
      try {
        return await invoke<{ success: boolean; output?: string; error?: string }>('execute_action', {
          name,
          actionPath: path,
        });
      } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de l’exécution Tauri' };
      }
    } else if (window.electronAPI?.executeAction) {
      return await window.electronAPI.executeAction(name, path);
    } else {
      // Simulation for Web Preview
      await new Promise((r) => setTimeout(r, 400));
      return {
        success: true,
        output: `[Tauri Simulator] Commande '${name}' (${path}) exécutée avec succès en backend Rust.`,
      };
    }
  },

  async getSysInfo(forceRefresh = false): Promise<Record<string, string>> {
    if (!forceRefresh && cachedSysInfo) {
      return cachedSysInfo;
    }

    if (isTauri()) {
      try {
        const info = await invoke<Record<string, string>>('get_sys_info');
        if (info && Object.keys(info).length > 0) {
          cachedSysInfo = info;
          return info;
        }
      } catch (err) {
        console.error('Tauri get_sys_info error:', err);
      }
    } else if (window.electronAPI?.getSysInfo) {
      const info = await window.electronAPI.getSysInfo();
      cachedSysInfo = info;
      return info;
    }

    // Modern Simulated System Specs for Web Preview
    const simInfo = {
      'Modèle :': 'HP EliteBook 840 G8',
      'Numéro de série :': '5CG1420X99-RUST',
      'Version de Bios :': 'N75 Ver. 01.12.00 (Tauri 2.0 Rust Core)',
      'CPU :': 'Intel(R) Core(TM) i7-1185G7 @ 3.00GHz (8 vCPUs)',
      'Memoire :': '16 GO DDR4-3200',
      'Disque :': '512 GB NVMe SSD High Speed',
      'Numéro de série disque(s) :': 'S5TYNX0N8123456 (NVMe)',
      'État SMART :': 'OK',
      'Carte Vidéo :': 'Intel(R) Iris(R) Xe Graphics',
      'UUID :': '4A299C81-89B2-4A2E-9C33-72E9A1A22C99',
      'Asset Tag :': 'QC-2026-009',
      'Ownership Tag :': 'Workshop Workstation',
    };
    cachedSysInfo = simInfo;
    return simInfo;
  },

  async checkSecurityStatus(forceRefresh = false): Promise<SecurityStatus> {
    if (!forceRefresh && cachedSecurityStatus && cachedSecurityStatus.isUefi !== undefined && cachedSecurityStatus.isUefi !== null && cachedSecurityStatus.tpm !== null) {
      return cachedSecurityStatus;
    }

    if (isTauri()) {
      try {
        const res = await invoke<any>('check_security_status');
        
        // Flexible key resolution (handles camelCase and snake_case from Tauri serde)
        const tpm = Boolean(
          res?.tpm ?? 
          res?.tpmReady ?? 
          res?.tpm_ready ?? 
          res?.tpmOk ?? 
          res?.tpm_ok
        );
        
        const secureBoot = Boolean(
          res?.secureBoot ?? 
          res?.secure_boot ?? 
          res?.secureBootReady ?? 
          res?.secure_boot_ready ?? 
          res?.sb
        );

        let isUefi = true;
        if (res?.isUefi !== undefined && res?.isUefi !== null) {
          isUefi = Boolean(res.isUefi);
        } else if (res?.is_uefi !== undefined && res?.is_uefi !== null) {
          isUefi = Boolean(res.is_uefi);
        } else if (res?.bootMode) {
          isUefi = String(res.bootMode).toUpperCase().includes('UEFI');
        } else if (res?.partitionStyle) {
          isUefi = String(res.partitionStyle).toUpperCase().includes('GPT');
        }

        const bootMode = res?.bootMode || res?.boot_mode || (isUefi ? 'UEFI' : 'Legacy');
        const partitionStyle = res?.partitionStyle || res?.partition_style || (isUefi ? 'GPT' : 'MBR');
        const setupMode = Boolean(res?.setupMode ?? res?.setup_mode ?? false);

        const status: SecurityStatus = { 
          tpm, 
          secureBoot, 
          isUefi,
          bootMode,
          partitionStyle,
          setupMode,
          error: res?.error || undefined 
        };

        cachedSecurityStatus = status;
        // Do not persist security status to localStorage across sessions (avoids stale SecureBoot/TPM state after reboots)
        try {
          localStorage.removeItem('app-security-cache');
          localStorage.removeItem('opeq-security-cache');
        } catch {}
        return status;
      } catch (err: any) {
        console.error('Tauri check_security_status error:', err);
        const fallbackStatus: SecurityStatus = { 
          tpm: false, 
          secureBoot: false, 
          isUefi: true, 
          bootMode: 'UEFI', 
          partitionStyle: 'GPT',
          error: err?.message || 'Erreur d’exécution du diagnostic de sécurité' 
        };
        return fallbackStatus;
      }
    } else if (window.electronAPI?.checkSecurityStatus) {
      try {
        const res: any = await window.electronAPI.checkSecurityStatus();
        const tpm = Boolean(res?.tpm ?? res?.tpmReady ?? res?.tpm_ready);
        const secureBoot = Boolean(res?.secureBoot ?? res?.secure_boot ?? res?.secureBootReady);
        let isUefi = true;
        if (res?.isUefi !== undefined && res?.isUefi !== null) {
          isUefi = Boolean(res.isUefi);
        } else if (res?.is_uefi !== undefined && res?.is_uefi !== null) {
          isUefi = Boolean(res.is_uefi);
        } else if (res?.bootMode) {
          isUefi = String(res.bootMode).toUpperCase().includes('UEFI');
        }
        const bootMode = res?.bootMode || res?.boot_mode || (isUefi ? 'UEFI' : 'Legacy');
        const partitionStyle = res?.partitionStyle || res?.partition_style || (isUefi ? 'GPT' : 'MBR');

        const status: SecurityStatus = {
          tpm,
          secureBoot,
          isUefi,
          bootMode,
          partitionStyle,
          error: res?.error || undefined,
        };
        cachedSecurityStatus = status;
        try {
          localStorage.removeItem('app-security-cache');
          localStorage.removeItem('opeq-security-cache');
        } catch {}
        return status;
      } catch (e: any) {
        console.error('Electron checkSecurityStatus error:', e);
      }
    }
    // Simulation (instant)
    const status: SecurityStatus = {
      tpm: true,
      secureBoot: false,
      isUefi: true,
      bootMode: 'UEFI',
      partitionStyle: 'GPT',
    };
    cachedSecurityStatus = status;
    try {
      localStorage.removeItem('app-security-cache');
      localStorage.removeItem('opeq-security-cache');
    } catch {}
    return status;
  },

  async setSystemBrightness(brightness: number): Promise<void> {
    try {
      const minBrightness = 0.45;
      const maxBrightness = 1.0;
      const normalizedFactor = minBrightness + ((brightness / 100) * (maxBrightness - minBrightness));
      document.documentElement.style.setProperty('--screen-brightness-filter', `${normalizedFactor}`);
    } catch {}

    if (isTauri()) {
      try {
        await invoke('set_system_brightness', { brightness });
      } catch (err) {
        console.error('Tauri set_system_brightness error:', err);
      }
    } else if (window.electronAPI?.setSystemBrightness) {
      window.electronAPI.setSystemBrightness(brightness);
    }
  },

  async selectFile(): Promise<string | null> {
    if (isTauri()) {
      try {
        const selected = await open({
          directory: false,
          multiple: false,
          filters: [
            { name: 'Exécutables et scripts', extensions: ['exe', 'bat', 'ps1', 'cmd', 'vbs', 'msc', 'cpl'] },
            { name: 'Tous les fichiers', extensions: ['*'] },
          ],
        });
        if (selected) {
          return typeof selected === 'string' ? selected : selected[0];
        }
        return null;
      } catch (err) {
        console.error('Tauri dialog file error:', err);
        return null;
      }
    } else if (window.electronAPI?.selectFile) {
      return await window.electronAPI.selectFile();
    } else {
      const promptRes = prompt('Saisissez le chemin du fichier (Simulation Web) :');
      return promptRes || null;
    }
  },

  async selectFolder(): Promise<string | null> {
    if (isTauri()) {
      try {
        const selected = await open({
          directory: true,
          multiple: false,
        });
        if (selected) {
          return typeof selected === 'string' ? selected : selected[0];
        }
        return null;
      } catch (err) {
        console.error('Tauri dialog folder error:', err);
        return null;
      }
    } else if ((window as any).electronAPI?.selectFolder) {
      return await (window as any).electronAPI.selectFolder();
    } else {
      const promptRes = prompt('Saisissez le dossier réseau ou local des pilotes (Simulation Web) :', '\\\\serveur-nas\\Tech\\Drivers');
      return promptRes || null;
    }
  },

  async checkBiosUpdate(): Promise<{ available: boolean; title: string; currentVersion?: string; manufacturer?: string; model?: string; error?: string }> {
    if (isTauri()) {
      try {
        return await invoke<{ available: boolean; title: string; currentVersion?: string; manufacturer?: string; model?: string; error?: string }>('check_bios_update');
      } catch (err: any) {
        return { available: false, title: '', error: err.message };
      }
    } else if (window.electronAPI?.checkBiosUpdate) {
      return await window.electronAPI.checkBiosUpdate();
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 700));
    return {
      available: false,
      title: '',
      currentVersion: 'N75 Ver. 01.12.00',
      manufacturer: 'HP',
      model: 'HP EliteBook 840 G8',
    };
  },

  async installBiosUpdate(force: boolean = false): Promise<{ success: boolean; report: string; error?: string }> {
    if (isTauri()) {
      try {
        return await invoke<{ success: boolean; report: string; error?: string }>('install_bios_update', { force });
      } catch (err: any) {
        return { success: false, report: '', error: err.message };
      }
    } else if (window.electronAPI?.installBiosUpdate) {
      return await window.electronAPI.installBiosUpdate(force);
    }

    // Simulation (Aperçu Web uniquement)
    await new Promise((r) => setTimeout(r, 1500));
    return {
      success: true,
      report: `[Aperçu Web - Environnement Navigateur]
--------------------------------------------------
ℹ️ Cette machine est en cours de simulation dans le navigateur.
Sur l'ordinateur réel sous Windows :
1. L'application exécute bios.ps1 avec l'API Windows Update (COM).
2. Recherche et télécharge les packages Firmware / UEFI constructeur.
3. Applique le flashage et signale si un redémarrage est requis.`,
    };
  },

  async selectBiosFile(): Promise<string | null> {
    if (isTauri()) {
      try {
        const selected = await open({
          directory: false,
          multiple: false,
          title: 'Sélectionner un fichier de mise à jour BIOS / Firmware',
          filters: [
            { name: 'Fichiers BIOS & Exécutables (*.exe, *.cap, *.bin, *.rom, *.inf, *.bat)', extensions: ['exe', 'cap', 'bin', 'rom', 'bio', 'fd', 'inf', 'bat', 'cmd', 'ps1'] },
            { name: 'Tous les fichiers (*.*)', extensions: ['*'] },
          ],
        });
        if (selected) {
          return typeof selected === 'string' ? selected : selected[0];
        }
        return null;
      } catch (err) {
        console.error('Tauri selectBiosFile error:', err);
        return null;
      }
    } else {
      const promptRes = prompt('Saisissez le chemin du fichier BIOS (Simulation Web) :', 'C:\\Drivers\\BIOS\\HP_EliteBook_840_G8_BIOS_Update.exe');
      return promptRes || null;
    }
  },

  async installManualBiosFile(filePath: string, autoReboot: boolean = false): Promise<{ success: boolean; report: string; error?: string }> {
    if (isTauri()) {
      try {
        return await invoke<{ success: boolean; report: string; error?: string }>('install_manual_bios_file', { filePath, autoReboot });
      } catch (err: any) {
        return { success: false, report: '', error: typeof err === 'string' ? err : err.message || 'Erreur lors du flashage manuel' };
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 1500));
    return {
      success: true,
      report: `[Aperçu Web - Environnement Navigateur]
--------------------------------------------------
ℹ️ Fichier BIOS sélectionné : ${filePath}
1. Analyse de l'exécutable/capsule UEFI validée avec succès.
2. Privilèges administrateur préparés.
3. Exécution du flashage UEFI simulée avec succès.
${autoReboot ? '4. Redémarrage automatique programmé.' : '4. Aucun redémarrage automatique programmé.'}`,
    };
  },

  async checkMissingDrivers(): Promise<number> {
    if (isTauri()) {
      try {
        return await invoke<number>('check_missing_drivers');
      } catch (err) {
        return 0;
      }
    } else if (window.electronAPI?.checkMissingDrivers) {
      return await window.electronAPI.checkMissingDrivers();
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 600));
    return 3; // 3 drivers needing attention in simulation matching the user's laptop
  },

  async getMissingPnpDevices(forceRefresh = false): Promise<PnpMissingDevice[]> {
    if (isTauri()) {
      try {
        const res = await invoke<PnpMissingDevice[]>('get_missing_pnp_devices');
        if (res && Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Tauri get_missing_pnp_devices error:', err);
      }
    }

    // Simulation for web & preview (matches Dell / Intel audio missing devices)
    await new Promise((r) => setTimeout(r, 700));
    return [
      {
        deviceId: 'PCI\\VEN_8086&DEV_02C8&SUBSYS_098E1028',
        name: 'Intel High Definition Audio',
        description: 'Contrôleur audio haute définition Intel',
        status: 'Error',
        errorCode: 28,
        errorDescription: 'Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)',
        class: 'Contrôleur Audio / Média',
        hardwareIds: ['PCI\\VEN_8086&DEV_02C8', 'PCI\\VEN_8086&DEV_02C8&SUBSYS_098E1028'],
        manufacturer: 'Intel Corporation',
      },
      {
        deviceId: 'PCI\\VEN_8086&DEV_02F0&SUBSYS_098E1028',
        name: 'Intel High Definition Audio',
        description: 'Interface audio numérique Intel Smart Sound Technology',
        status: 'Error',
        errorCode: 28,
        errorDescription: 'Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)',
        class: 'Contrôleur Audio / Média',
        hardwareIds: ['PCI\\VEN_8086&DEV_02F0', 'PCI\\VEN_8086&DEV_02F0&SUBSYS_098E1028'],
        manufacturer: 'Intel Corporation',
      },
      {
        deviceId: 'PCI\\VEN_8086&DEV_02C4&SUBSYS_098E1028',
        name: 'Intel High Definition DSP',
        description: 'Processeur de signal numérique audio Intel (Smart Sound Technology DSP)',
        status: 'Error',
        errorCode: 28,
        errorDescription: 'Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)',
        class: 'Contrôleur Audio / Média',
        hardwareIds: ['PCI\\VEN_8086&DEV_02C4', 'PCI\\VEN_8086&DEV_02C4&SUBSYS_098E1028'],
        manufacturer: 'Intel Corporation',
      },
    ];
  },

  async scanAndFixPnpDevices(): Promise<{ success: boolean; report: string; error?: string }> {
    if (isTauri()) {
      try {
        const report = await invoke<string>('scan_and_fix_pnp_devices');
        return { success: true, report };
      } catch (err: any) {
        return { success: false, report: '', error: err.message || 'Erreur lors du scan PnP' };
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 1200));
    return {
      success: true,
      report: `=== ANALYSE & RÉSOLUTION DU MATÉRIEL (PLUG AND PLAY) ===
[1/3] Déclenchement de la détection matérielle (pnputil /scan-devices)...
  -> Analyse du bus matériel terminée.
[2/3] Vérification du service Windows Update et du catalogue Microsoft...
  -> Service Windows Update et ServiceManager configurés.
[3/3] État du Gestionnaire de périphériques :
  -> 3 périphérique(s) détectés dans 'Autres périphériques' :
     * Intel High Definition Audio (Code 28 - Contrôleur Audio / Média)
     * Intel High Definition Audio (Code 28 - Contrôleur Audio / Média)
     * Intel High Definition DSP (Code 28 - Contrôleur Audio / Média)
  -> Suggestion : Télécharger le pilote Intel SST Audio / Realtek pour la machine ou injecter depuis le pack NAS.`,
    };
  },

  async connectNetwork(path: string, user: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (isTauri()) {
      try {
        const msg = await invoke<string>('connect_network', { path, user, pass });
        return { success: true, message: msg };
      } catch (err: any) {
        return { success: false, message: err.message || 'Erreur lors de la connexion réseau' };
      }
    }
    // Simulation
    await new Promise((r) => setTimeout(r, 800));
    if (user && pass) {
      return { success: true, message: 'Simulé: Connecté au réseau.' };
    }
    return { success: false, message: 'Identifiants invalides (Simulation)' };
  },

  async setFullScreen(flag: boolean): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('set_fullscreen', { flag });
      } catch (err) {
        console.error('Tauri set_fullscreen error:', err);
      }
    } else if (window.electronAPI?.setFullScreen) {
      window.electronAPI.setFullScreen(flag);
    }
  },

  // ==========================================
  // DETAILED HARDWARE & MODEL DETECTION
  // ==========================================
  async getHardwareModelDetails(forceRefresh = false): Promise<{ make: string; model: string; formFactor: string; serialNumber: string }> {
    if (!forceRefresh && cachedModelDetails) {
      return cachedModelDetails;
    }

    if (isTauri()) {
      try {
        const res = await invoke<{ make: string; model: string; formFactor: string; serialNumber: string }>('get_hardware_model_details');
        if (res && res.make) {
          cachedModelDetails = res;
          return res;
        }
      } catch (err) {
        console.warn('Tauri get_hardware_model_details fallback:', err);
      }
    }

    const details = {
      make: 'HP',
      model: 'HP EliteBook 840 G8',
      formFactor: 'Laptop',
      serialNumber: '5CG1420X99-RUST',
    };
    cachedModelDetails = details;
    return details;
  },

  // ==========================================
  // WINDOWS UPDATE DRIVERS DETAILED API
  // ==========================================
  async searchWindowsUpdateDrivers(onlyFirmware: boolean = false, includeInstalled: boolean = true): Promise<WindowsUpdateDriver[]> {
    if (isTauri()) {
      try {
        const res = await invoke<WindowsUpdateDriver[]>('search_wu_drivers', { onlyFirmware, includeInstalled });
        if (res && Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Tauri search_wu_drivers fallback:', err);
      }
    }

    // Simulation for web & preview
    await new Promise((r) => setTimeout(r, 600));
    if (onlyFirmware) {
      const list: WindowsUpdateDriver[] = [
        {
          id: 'WU-FW-01',
          title: 'HP Inc. - System - 1.14.0.0 (Firmware BIOS & UEFI Update)',
          description: 'Mise à jour recommandée du microprogramme UEFI/BIOS et microcode processeur.',
          category: 'Firmware / BIOS',
          isFirmware: true,
          isInstalled: false,
          version: '01.14.00',
          releaseDate: '2024-02-15',
          provider: 'HP Inc.',
          status: 'pending',
          progress: 0,
        },
        {
          id: 'WU-FW-02',
          title: 'Intel Corporation - System - 15.0.35.1951 (Intel ME Firmware)',
          description: 'Mise à jour du microprogramme Intel Management Engine et correctifs de sécurité.',
          category: 'Firmware / BIOS',
          isFirmware: true,
          isInstalled: false,
          version: '15.0.35.1951',
          releaseDate: '2023-11-20',
          provider: 'Intel Corporation',
          status: 'pending',
          progress: 0,
        },
      ];

      if (includeInstalled) {
        list.push({
          id: 'WU-FW-00',
          title: 'HP Inc. - System - 1.12.00 (Version BIOS Actuellement Installée)',
          description: 'Version SMBIOS active N75 Ver. 01.12.00. Cocher pour forcer la réinstallation.',
          category: 'Firmware / BIOS',
          isFirmware: true,
          isInstalled: true,
          version: '01.12.00',
          releaseDate: '2023-04-18',
          provider: 'HP Inc.',
          status: 'pending',
          progress: 0,
        });
      }

      return list;
    }

    const list: WindowsUpdateDriver[] = [
      {
        id: 'WU-001',
        title: 'Intel Corporation - Display - 31.0.101.4575',
        description: 'Mise à jour des pilotes graphiques Intel Iris Xe et prise en charge multi-écrans.',
        category: 'Affichage',
        isFirmware: false,
        isInstalled: false,
        version: '31.0.101.4575',
        releaseDate: '2023-09-12',
        provider: 'Intel Corporation',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'WU-002',
        title: 'Realtek Semiconductor Corp. - Net - 10.68.815.2023',
        description: 'Contrôleur Gigabit Ethernet Realtek PCIe avec optimisation de bande passante.',
        category: 'Réseau',
        isFirmware: false,
        isInstalled: false,
        version: '10.68.815.2023',
        releaseDate: '2023-08-15',
        provider: 'Realtek',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'WU-003',
        title: 'Realtek Semiconductor Corp. - Audio - 6.0.9231.1',
        description: 'Pilote audio haute définition Realtek HD Audio (Installé - Réinstallation possible pour réparation).',
        category: 'Audio',
        isFirmware: false,
        isInstalled: true,
        version: '6.0.9231.1',
        releaseDate: '2023-05-10',
        provider: 'Realtek',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'WU-004',
        title: 'HP Inc. - System - 1.14.0.0 (Firmware BIOS & UEFI Update)',
        description: 'Mise à jour critique du microprogramme UEFI/BIOS et gestion de sécurité TPM 2.0.',
        category: 'Firmware / BIOS',
        isFirmware: true,
        isInstalled: false,
        version: '01.14.00',
        releaseDate: '2024-02-15',
        provider: 'HP Inc.',
        status: 'pending',
        progress: 0,
      },
    ];

    if (!includeInstalled) {
      return list.filter(d => !d.isInstalled);
    }

    return list;
  },

  async installWindowsUpdateDrivers(driverIds: string[], autoReboot: boolean = false): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('install_wu_drivers', { driverIds, autoReboot });
      } catch (err: any) {
        throw new Error(typeof err === 'string' ? err : err.message || 'Erreur installation Windows Update');
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 2000));
    return `Installation Windows Update réussie de ${driverIds.length} pilote(s).`;
  },

  // ==========================================
  // NAS / USB DRIVER FOLDER SCAN & INSTALL
  // ==========================================
  async scanNasDriverFolders(nasPath: string, make: string, actualModel: string): Promise<NasDriverModel[]> {
    if (isTauri()) {
      try {
        const res = await invoke<NasDriverModel[]>('scan_nas_drivers', { nasPath, make, actualModel });
        if (res && Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Tauri scan_nas_drivers fallback:', err);
      }
    }

    // Simulation (optimisée, retour instantané via Fast-Parsing)
    await new Promise((r) => setTimeout(r, 150));
    return [
      {
        brand: make || 'HP',
        category: 'Laptop',
        model: 'HP EliteBook 840 G8',
        displayName: 'Laptop\\HP EliteBook 840 G8 (12 .inf)',
        fullPath: `${nasPath || '\\\\serveur-nas\\Tech\\Drivers'}\\HP\\Laptop\\HP EliteBook 840 G8`,
        isMatch: true,
        infCount: 12,
        driverCategories: [
          { name: 'Display (Graphique)', count: 2 },
          { name: 'Net (Réseau/Wi-Fi)', count: 3 },
          { name: 'Media (Audio)', count: 1 },
          { name: 'System (Chipset)', count: 4 },
          { name: 'Bluetooth', count: 2 },
        ]
      },
      {
        brand: make || 'HP',
        category: 'Laptop',
        model: 'HP EliteBook 840 G7',
        displayName: 'Laptop\\HP EliteBook 840 G7 (8 .inf)',
        fullPath: `${nasPath || '\\\\serveur-nas\\Tech\\Drivers'}\\HP\\Laptop\\HP EliteBook 840 G7`,
        isMatch: false,
        infCount: 8,
        driverCategories: [
          { name: 'Display (Graphique)', count: 1 },
          { name: 'Net (Réseau/Wi-Fi)', count: 2 },
          { name: 'System (Chipset)', count: 5 }
        ]
      },
      {
        brand: 'Dell',
        category: 'Laptop',
        model: 'Latitude 5490',
        displayName: 'Laptop\\Dell Latitude 5490 (10 .inf)',
        fullPath: `${nasPath || '\\\\serveur-nas\\Tech\\Drivers'}\\Dell\\Latitude 5490`,
        isMatch: false,
        infCount: 10,
        driverCategories: [
          { name: 'Display (Graphique)', count: 1 },
          { name: 'Media (Audio)', count: 1 },
          { name: 'System (Chipset)', count: 8 }
        ]
      },
      {
        brand: 'Lenovo',
        category: 'ThinkPad',
        model: 'ThinkPad T480s',
        displayName: 'ThinkPad\\ThinkPad T480s (15 .inf)',
        fullPath: `${nasPath || '\\\\serveur-nas\\Tech\\Drivers'}\\Lenovo\\ThinkPad T480s`,
        isMatch: false,
        infCount: 15,
        driverCategories: [
          { name: 'Display (Graphique)', count: 2 },
          { name: 'Net (Réseau)', count: 4 },
          { name: 'Media (Audio)', count: 2 },
          { name: 'System (Chipset)', count: 7 }
        ]
      },
    ];
  },

  async getInfDriversInFolder(folderPath: string): Promise<InfDriverDetail[]> {
    if (isTauri()) {
      try {
        const res = await invoke<InfDriverDetail[]>('get_inf_drivers_in_folder', { folderPath });
        if (res && Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Tauri get_inf_drivers_in_folder fallback:', err);
      }
    }

    // Simulation for Web / Preview
    await new Promise((r) => setTimeout(r, 200));
    return [
      {
        id: 'INF-1',
        name: 'Intel(R) Wi-Fi 6 AX201 160MHz Adapter',
        infName: 'netwtw10.inf',
        infPath: `${folderPath}\\WLAN\\netwtw10.inf`,
        category: 'Réseau & Wi-Fi',
        provider: 'Intel Corporation',
        version: '22.140.0.3',
        date: '2023-04-12',
        selected: true,
      },
      {
        id: 'INF-2',
        name: 'Intel(R) Ethernet Connection (13) I219-LM',
        infName: 'e1d68x64.inf',
        infPath: `${folderPath}\\LAN\\e1d68x64.inf`,
        category: 'Réseau & Wi-Fi',
        provider: 'Intel Corporation',
        version: '12.19.1.37',
        date: '2023-02-18',
        selected: true,
      },
      {
        id: 'INF-3',
        name: 'Intel(R) Iris(R) Xe Graphics Controller',
        infName: 'iigd_dch.inf',
        infPath: `${folderPath}\\Graphics\\iigd_dch.inf`,
        category: 'Affichage / Graphique',
        provider: 'Intel Corporation',
        version: '31.0.101.4575',
        date: '2023-05-10',
        selected: true,
      },
      {
        id: 'INF-4',
        name: 'Realtek High Definition Audio (SST)',
        infName: 'hdxrt.inf',
        infPath: `${folderPath}\\Audio\\hdxrt.inf`,
        category: 'Audio & Son',
        provider: 'Realtek Semiconductor',
        version: '6.0.9235.1',
        date: '2022-11-20',
        selected: true,
      },
      {
        id: 'INF-5',
        name: 'Intel(R) Wireless Bluetooth(R) Adapter',
        infName: 'ibtusb.inf',
        infPath: `${folderPath}\\Bluetooth\\ibtusb.inf`,
        category: 'Bluetooth',
        provider: 'Intel Corporation',
        version: '22.130.0.2',
        date: '2023-03-01',
        selected: true,
      },
      {
        id: 'INF-6',
        name: 'Intel(R) Management Engine Interface (MEI)',
        infName: 'heci.inf',
        infPath: `${folderPath}\\MEI\\heci.inf`,
        category: 'Chipset & Système',
        provider: 'Intel Corporation',
        version: '2130.1.15.0',
        date: '2022-09-14',
        selected: true,
      },
      {
        id: 'INF-7',
        name: 'Intel(R) Serial IO I2C Host Controller',
        infName: 'iaLPSS2_I2C.inf',
        infPath: `${folderPath}\\SerialIO\\iaLPSS2_I2C.inf`,
        category: 'Chipset & Système',
        provider: 'Intel Corporation',
        version: '30.100.2104.1',
        date: '2022-08-05',
        selected: true,
      },
      {
        id: 'INF-8',
        name: 'Synaptics Fingerprint Reader / Biométrie',
        infName: 'synaWbdp.inf',
        infPath: `${folderPath}\\Biometric\\synaWbdp.inf`,
        category: 'Biométrie & Capteurs',
        provider: 'Synaptics Incorporated',
        version: '6.0.12.1104',
        date: '2022-10-18',
        selected: true,
      },
      {
        id: 'INF-9',
        name: 'HP Wide Vision HD Integrated Camera',
        infName: 'hpucam.inf',
        infPath: `${folderPath}\\Camera\\hpucam.inf`,
        category: 'Caméra & Vidéo',
        provider: 'HP Inc.',
        version: '10.0.19041.5',
        date: '2022-07-22',
        selected: true,
      },
      {
        id: 'INF-10',
        name: 'Intel(R) Rapid Storage Technology NVMe Controller',
        infName: 'iaStorVD.inf',
        infPath: `${folderPath}\\Storage\\iaStorVD.inf`,
        category: 'Stockage & Disque',
        provider: 'Intel Corporation',
        version: '18.6.1.1016',
        date: '2022-06-15',
        selected: true,
      },
    ];
  },

  async installSpecificInfDrivers(infPaths: string[], autoReboot: boolean = false): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('install_specific_inf_drivers', { infPaths, autoReboot });
      } catch (err: any) {
        throw new Error(typeof err === 'string' ? err : err.message || 'Erreur installation pilotes ciblés');
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 1600));
    return `PnPUtil: ${infPaths.length} pilote(s) sélectionné(s) ont été analysés et injectés avec succès dans le système.`;
  },

  async installNasDriversPnputil(folderPath: string): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('install_nas_drivers_pnputil', { folderPath });
      } catch (err: any) {
        throw new Error(typeof err === 'string' ? err : err.message || 'Erreur injection PnPUtil');
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 1500));
    return `PnPUtil: Packages de pilotes .inf trouvés dans '${folderPath}' et injectés avec succès.`;
  },

  async checkFolderExists(folderPath: string): Promise<boolean> {
    if (isTauri()) {
      try {
        return await invoke<boolean>('check_folder_exists', { folderPath });
      } catch (err) {
        console.warn('Tauri check_folder_exists error:', err);
        return false;
      }
    }

    // Simulation for Web / Preview
    await new Promise((r) => setTimeout(r, 200));
    // Simulate that the default HP 840 G8 model folder already exists on the NAS to allow testing the prompt
    const p = (folderPath || '').toLowerCase();
    if (p.includes('840 g8') && !p.includes('_v') && !p.includes('_2') && !p.includes('_new') && !p.includes('_test')) {
      return true;
    }
    return false;
  },

  async rebuildNasIndex(nasPath: string): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('rebuild_nas_index', { nasPath });
      } catch (err: any) {
        throw new Error(typeof err === 'string' ? err : err.message || 'Erreur génération index.json');
      }
    }

    // Simulation for web / preview
    await new Promise((r) => setTimeout(r, 600));
    return `Index centralisé 'index.json' généré avec succès sur le NAS (${nasPath || '\\\\serveur-nas\\Tech\\Drivers'}) avec 4 modèles indexés.`;
  },

  async exportDismDrivers(destinationPath: string, overwrite: boolean = false): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('export_dism_drivers', { destinationPath, overwrite });
      } catch (err: any) {
        throw new Error(typeof err === 'string' ? err : err.message || 'Erreur export DISM');
      }
    }

    // Simulation
    await new Promise((r) => setTimeout(r, 1500));
    return `DISM: Exportation réussie de tous les pilotes tiers vers '${destinationPath}' (Remplacement: ${overwrite ? 'Oui' : 'Non'}).`;
  },

  async openPath(path: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const cleanPath = (path || '').trim();
    if (!cleanPath) {
      return { success: false, error: 'Chemin vide' };
    }

    if (isTauri()) {
      try {
        return await invoke<{ success: boolean; output?: string; error?: string }>('execute_action', {
          name: 'Ouvrir dossier',
          actionPath: `explorer.exe "${cleanPath}"`,
        });
      } catch (err: any) {
        console.error('Tauri openPath error:', err);
        return { success: false, error: err?.message || String(err) };
      }
    } else if (window.electronAPI?.executeAction) {
      return await window.electronAPI.executeAction('Ouvrir dossier', `explorer.exe "${cleanPath}"`);
    }

    // Web simulation
    return {
      success: true,
      output: `[Web Simulator] Dossier ouvert : ${cleanPath}`,
    };
  },

  // ==========================================
  // DETAILED BIOS INFORMATION API
  // ==========================================
  async getDetailedBiosInfo(forceRefresh = false): Promise<BiosDetailedInfo> {
    if (!forceRefresh && cachedBiosInfo) {
      return cachedBiosInfo;
    }

    if (isTauri()) {
      try {
        const res = await invoke<BiosDetailedInfo>('get_detailed_bios_info');
        if (res && res.smbiosVersion && res.smbiosVersion !== 'Inconnu') {
          cachedBiosInfo = res;
          return res;
        }
      } catch (err) {
        console.warn('Tauri get_detailed_bios_info fallback:', err);
      }
    }

    try {
      const sys = await this.getSysInfo();
      const modelStr = sys['Modèle :'] || '';
      const make = modelStr.split(' ')[0] || 'Generic';
      const info: BiosDetailedInfo = {
        manufacturer: make,
        model: modelStr || 'Computer Workstation',
        smbiosVersion: sys['Version de Bios :'] || 'UEFI v2.4',
        version: 'UEFI System Firmware',
        serialNumber: sys['Numéro de série :'] || 'SN-SYSTEM-2026',
        releaseDate: '2023-04-18',
        updateAvailable: false,
      };
      cachedBiosInfo = info;
      return info;
    } catch {
      const info: BiosDetailedInfo = {
        manufacturer: 'HP',
        model: 'HP EliteBook 840 G8',
        smbiosVersion: 'N75 Ver. 01.12.00',
        version: 'HPQOEM - 1',
        serialNumber: '5CG1420X99-RUST',
        releaseDate: '2023-04-18',
        updateAvailable: false,
      };
      cachedBiosInfo = info;
      return info;
    }
  },

  // ==========================================
  // ADMINISTRATOR PRIVILEGES API
  // ==========================================
  async checkIsAdmin(): Promise<boolean> {
    if (isTauri()) {
      try {
        return await invoke<boolean>('check_is_admin');
      } catch (err) {
        console.warn('Tauri check_is_admin error:', err);
        return true;
      }
    }
    // In web simulator or browser environment, consider as elevated
    return true;
  },

  async restartAsAdmin(): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('restart_as_admin');
      } catch (err) {
        console.error('Tauri restart_as_admin error:', err);
        throw err;
      }
    } else {
      alert('En mode Web/Simulateur : l’application est déjà exécutée avec tous les privilèges disponibles.');
    }
  },

  // ==========================================
  // BATTERY STATUS & HEALTH API
  // ==========================================
  async getBatteryStatus(): Promise<BatteryStatus> {
    if (isTauri()) {
      try {
        const res = await invoke<BatteryStatus>('get_battery_status');
        if (res) return res;
      } catch (err) {
        console.warn('Tauri get_battery_status fallback:', err);
      }
    }

    // Try HTML5 Battery API if running in browser
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const b: any = await (navigator as any).getBattery();
        const pct = Math.round(b.level * 100);
        const isCharging = Boolean(b.charging);
        
        let estRun: number | null = null;
        let estCharge: number | null = null;
        let estFormatted: string | null = null;

        if (isCharging) {
          if (b.chargingTime && isFinite(b.chargingTime) && b.chargingTime > 0) {
            estCharge = Math.round(b.chargingTime / 60);
          } else if (pct < 100) {
            estCharge = Math.max(2, Math.round((100 - pct) * 1.25));
          }
          if (estCharge !== null) {
            const h = Math.floor(estCharge / 60);
            const m = estCharge % 60;
            estFormatted = h > 0 ? `~${h} h ${m} min (pleine charge)` : `~${m} min (pleine charge)`;
          }
        } else {
          if (b.dischargingTime && isFinite(b.dischargingTime) && b.dischargingTime > 0) {
            estRun = Math.round(b.dischargingTime / 60);
          } else {
            // Approx 6h full life
            estRun = Math.max(5, Math.round((pct / 100) * 360));
          }
          if (estRun !== null) {
            const h = Math.floor(estRun / 60);
            const m = estRun % 60;
            estFormatted = h > 0 ? `~${h} h ${m} min restantes` : `~${m} min restantes`;
          }
        }

        let currentLang = 'en';
        try {
          const s = sessionStorage.getItem('app_session_lang') || sessionStorage.getItem('opeq_session_lang');
          if (s === 'en' || s === 'fr') currentLang = s;
        } catch {}
        const isEn = currentLang === 'en';

        return {
          present: true,
          percentage: pct,
          health: 94,
          isCharging,
          acConnected: isCharging || pct === 100,
          statusLabel: isCharging 
            ? (isEn ? `Charging (${pct}%)` : `En charge (${pct}%)`) 
            : (isEn ? `On Battery (${pct}%)` : `Sur batterie (${pct}%)`),
          designCapacity: 53000,
          fullChargeCapacity: 49820,
          cycleCount: 142,
          wearLevel: 6,
          voltage: 11.55,
          chemistry: 'Li-ion',
          manufacturer: 'HP / Dynapack',
          serialNumber: 'BAT-9842X',
          estimatedRunTimeMinutes: estRun,
          estimatedChargeTimeMinutes: estCharge,
          estimatedDurationFormatted: estFormatted,
          chargeRateWatts: isCharging ? 28.5 : null,
          dischargeRateWatts: !isCharging ? 12.2 : null,
        };
      } catch {}
    }

    // High fidelity simulator for preview with realistic subtle controller variations
    const nowSec = Math.floor(Date.now() / 1000);
    const jitter = Math.sin(nowSec * 0.8) * 0.8;
    const simWatts = Math.round((28.4 + jitter) * 10) / 10;
    const simChargeMins = 25 + (nowSec % 3 === 0 ? 1 : 0);

    let currentLang = 'en';
    try {
      const s = sessionStorage.getItem('app_session_lang') || sessionStorage.getItem('opeq_session_lang');
      if (s === 'en' || s === 'fr') currentLang = s;
    } catch {}
    const isEn = currentLang === 'en';

    return {
      present: true,
      percentage: 88,
      health: 94,
      isCharging: true,
      acConnected: true,
      statusLabel: isEn ? 'On AC Power (88% - Charging)' : 'Sur secteur (88% - En charge)',
      designCapacity: 53000,
      fullChargeCapacity: 49820,
      cycleCount: 142,
      wearLevel: 6,
      voltage: 11.55,
      chemistry: 'Li-ion',
      manufacturer: 'HP / Dynapack',
      serialNumber: 'BAT-9842X',
      estimatedRunTimeMinutes: 310,
      estimatedChargeTimeMinutes: simChargeMins,
      estimatedDurationFormatted: isEn 
        ? `~${simChargeMins} min (until full charge)` 
        : `~${simChargeMins} min (jusqu'à pleine charge)`,
      chargeRateWatts: simWatts,
      dischargeRateWatts: null,
    };
  },
};

export interface BatteryDurationInfo {
  formatted: string;
  short: string;
  badge: string;
  minutes: number | null;
  type: 'charging' | 'discharging' | 'full' | 'calculating' | 'ac';
}

export function formatBatteryDuration(
  battery: BatteryStatus | null | undefined,
  lang: 'fr' | 'en' = 'en'
): BatteryDurationInfo {
  const isEn = lang === 'en';

  if (!battery || battery.present === false) {
    return {
      formatted: isEn ? 'Continuous AC power supply (Desktop)' : 'Alimentation continue sur secteur (Fixe)',
      short: isEn ? 'AC Power' : 'Secteur',
      badge: isEn ? 'AC Power' : 'Secteur',
      minutes: null,
      type: 'ac',
    };
  }

  const pct = battery.percentage ?? 100;
  const isCharging = battery.isCharging;
  const acConnected = battery.acConnected;

  if (acConnected && !isCharging) {
    if (pct >= 99) {
      return {
        formatted: isEn ? 'Battery full (100% - On AC Power)' : 'Batterie pleine (100% - Sur secteur)',
        short: isEn ? 'Full' : 'Pleine',
        badge: isEn ? '100% Full' : '100% Pleine',
        minutes: 0,
        type: 'full',
      };
    }
    return {
      formatted: isEn ? 'On AC Power (Plugged in)' : 'Sur secteur (Alimentation branchée)',
      short: isEn ? 'AC Power' : 'Secteur',
      badge: isEn ? 'Plugged' : 'Branché',
      minutes: null,
      type: 'ac',
    };
  }

  if (isCharging) {
    let mins = battery.estimatedChargeTimeMinutes;
    if ((mins === undefined || mins === null || mins <= 0) && pct < 100) {
      mins = Math.max(2, Math.round((100 - pct) * 1.25));
    }

    if (mins && mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = h > 0 && m > 0 ? `~${h} h ${m} min` : h > 0 ? `~${h} h` : `~${m} min`;
      const shortStr = h > 0 && m > 0 ? `~${h}h${m}m` : h > 0 ? `~${h}h` : `~${m}m`;
      return {
        formatted: isEn ? `${timeStr} (until full charge)` : `${timeStr} (jusqu'à pleine charge)`,
        short: isEn ? `Full in ${shortStr}` : `Pleine ${shortStr}`,
        badge: isEn ? `Full ${shortStr}` : `Pleine ${shortStr}`,
        minutes: mins,
        type: 'charging',
      };
    }

    return {
      formatted: isEn ? 'Charging...' : 'En charge...',
      short: isEn ? 'Charging' : 'En charge',
      badge: isEn ? 'Charging...' : 'Charge...',
      minutes: null,
      type: 'calculating',
    };
  }

  // Sur batterie (discharging)
  let mins = battery.estimatedRunTimeMinutes;
  if (mins === undefined || mins === null || mins <= 0) {
    const cap = battery.fullChargeCapacity || battery.designCapacity || 50000;
    const remWh = (cap * (pct / 100)) / 1000;
    mins = Math.max(5, Math.round((remWh / 12) * 60));
  }

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const timeStr = h > 0 && m > 0 ? `~${h} h ${m} min` : h > 0 ? `~${h} h` : `~${m} min`;
  const shortStr = h > 0 && m > 0 ? `~${h}h${m}m` : h > 0 ? `~${h}h` : `~${m}m`;

  return {
    formatted: isEn ? `${timeStr} remaining on battery` : `${timeStr} restante(s) sur batterie`,
    short: shortStr,
    badge: shortStr,
    minutes: mins,
    type: 'discharging',
  };
}

