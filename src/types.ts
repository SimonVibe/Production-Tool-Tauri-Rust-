export interface ExternalApp {
  id: string;
  name: string;
  path: string;
}

export interface BatteryStatus {
  present: boolean;
  percentage: number | null;
  health: number | null;
  isCharging: boolean;
  acConnected: boolean;
  statusLabel: string;
  designCapacity?: number;
  fullChargeCapacity?: number;
  cycleCount?: number;
  wearLevel?: number;
  voltage?: number;
  chemistry?: string;
  manufacturer?: string;
  serialNumber?: string;
  estimatedRunTimeMinutes?: number | null;
  estimatedChargeTimeMinutes?: number | null;
  estimatedDurationFormatted?: string | null;
  dischargeRateWatts?: number | null;
  chargeRateWatts?: number | null;
  isAveraged?: boolean;
  sampleCount?: number;
  averageWindowSeconds?: number;
  lastUpdated?: number;
  rawPercentage?: number | null;
  rawEstimatedMinutes?: number | null;
}

export interface AppConfig {
  testEcranPath: string;
  testSonPath: string;
  testClavierPath: string;
  burnInTestPath: string;
  testCameraPath: string;
  driverSdioPath: string;
  nasDriversPath: string;
  autoReboot: boolean;
  defaultLanguage?: 'en' | 'fr';
  hiddenTests?: {
    screen?: boolean;
    audio?: boolean;
    keyboard?: boolean;
    camera?: boolean;
    burnin?: boolean;
    battery?: boolean;
    wifi?: boolean;
    bluetooth?: boolean;
  };
  hiddenSpecs?: {
    model?: boolean;
    serialNumber?: boolean;
    uuid?: boolean;
    assetTag?: boolean;
    ownershipTag?: boolean;
    cpu?: boolean;
    memory?: boolean;
    disk?: boolean;
    diskSn?: boolean;
    gpu?: boolean;
    bios?: boolean;
    securityBanner?: boolean;
  };
  externalApps?: ExternalApp[];
  networkAuth?: {
    path: string;
    user: string;
    pass: string;
  };
  adminPasswordHash?: string;
}

export interface PnpMissingDevice {
  deviceId: string;
  name: string;
  description?: string;
  status: string;
  errorCode: number;
  errorDescription: string;
  class?: string;
  hardwareIds: string[];
  manufacturer?: string;
}

export interface WindowsUpdateDriver {
  id: string;
  title: string;
  description?: string;
  category?: string;
  isFirmware?: boolean;
  isInstalled?: boolean;
  version?: string;
  releaseDate?: string;
  provider?: string;
  status: 'pending' | 'downloading' | 'downloaded' | 'installing' | 'installed' | 'failed';
  progress: number;
  resultCode?: string;
}

export interface InfDriverDetail {
  id: string;
  name: string;
  infName: string;
  infPath: string;
  category: string;
  provider?: string;
  version?: string;
  date?: string;
  selected?: boolean;
}

export interface DriverCategoryCount {
  name: string;
  count: number;
}

export interface NasDriverModel {
  brand: string;
  category: string; // 'Laptop' | 'Desktop' | 'Tablet'
  model: string;
  displayName: string;
  fullPath: string;
  isMatch: boolean;
  infCount?: number;
  driverCategories?: DriverCategoryCount[];
}

export interface BiosDetailedInfo {
  manufacturer: string;
  model?: string;
  smbiosVersion: string;
  version: string;
  serialNumber: string;
  releaseDate: string;
  updateAvailable?: boolean;
  updateTitle?: string;
  updateVersion?: string;
  updateReleaseDate?: string;
  updateDescription?: string;
}

export interface DriverLogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'cmd';
  message: string;
}

export interface SecurityStatus {
  tpm: boolean | null;
  secureBoot: boolean | null;
  isUefi?: boolean | null;
  bootMode?: string;
  partitionStyle?: string;
  setupMode?: boolean | null;
  error?: string;
}

export const defaultConfig: AppConfig = {
  testEcranPath: 'screen_test.exe',
  testSonPath: 'mmsys.cpl',
  testClavierPath: 'AquaKeyTest.exe',
  burnInTestPath: 'BurnInTest\\bit.exe',
  testCameraPath: 'test_camera.exe',
  driverSdioPath: 'SDIO\\SDI_x64_R.exe',
  nasDriversPath: '\\\\serveur-nas\\Tech\\Drivers',
  autoReboot: false,
  defaultLanguage: 'en',
  hiddenTests: {
    screen: false,
    audio: false,
    keyboard: false,
    camera: false,
    burnin: false,
    battery: false,
    wifi: false,
    bluetooth: false,
  },
  hiddenSpecs: {
    model: false,
    serialNumber: false,
    uuid: false,
    assetTag: false,
    ownershipTag: false,
    cpu: false,
    memory: false,
    disk: false,
    diskSn: false,
    gpu: false,
    bios: false,
    securityBanner: false,
  },
};

declare global {
  interface Window {
    electronAPI?: {
      loadConfig: () => Promise<AppConfig | null>;
      saveConfig: (config: AppConfig) => Promise<void>;
      executeAction: (name: string, path: string) => Promise<{ success: boolean, output?: string, error?: string }>;
      getSysInfo: () => Promise<Record<string, string>>;
      checkSecurityStatus: () => Promise<SecurityStatus>;
      setSystemBrightness: (brightness: number) => void;
      selectFile: () => Promise<string | null>;
      checkBiosUpdate: () => Promise<{ available: boolean, title: string, error?: string }>;
      installBiosUpdate: (force?: boolean) => Promise<{ success: boolean, report: string, error?: string }>;
      checkMissingDrivers: () => Promise<number>;
      setFullScreen?: (flag: boolean) => void;
    }
  }
}

