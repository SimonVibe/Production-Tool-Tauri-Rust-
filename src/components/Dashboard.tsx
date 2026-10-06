import { useState, useEffect, ReactNode, useMemo, lazy, Suspense } from 'react';
import { 
  Settings, Battery, BatteryWarning, BatteryCharging, BatteryMedium, Plug, Wifi, Bluetooth, 
  Power, RotateCcw, Cpu, Sun, ShieldCheck, ShieldAlert, 
  CheckCircle2, Terminal, Copy, Check, Play, Volume2, 
  Keyboard, Camera, Flame, Monitor, Wrench, RefreshCw, Zap, Server,
  Tag, HardDrive, HelpCircle, X, Shield, Sparkles, BookOpen, HeartPulse, Clock
} from 'lucide-react';
import { AppConfig, SecurityStatus, BatteryStatus } from '../types';
import DebugLogViewer from './DebugLogViewer';
import BrightnessControl from './BrightnessControl';
import { hardwareAPI, isTauri, formatBatteryDuration } from '../lib/tauriAdapter';
import { useBatteryMonitor } from '../hooks/useBatteryMonitor';
import { PreFlightSafetyBanner } from './drivers/PreFlightSafetyBanner';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const HelpModal = lazy(() => import('./HelpModal'));
const DriversModal = lazy(() => import('./DriversModal'));
const WindowsUpdateModal = lazy(() => import('./WindowsUpdateModal'));
const NasDriversModal = lazy(() => import('./NasDriversModal'));
const BiosUpdateModal = lazy(() => import('./BiosUpdateModal'));
const CameraMicModal = lazy(() => import('./CameraMicModal'));
const ScreenTestModal = lazy(() => import('./ScreenTestModal'));
const BatteryHealthModal = lazy(() => import('./BatteryHealthModal'));
const SecurityGuideModal = lazy(() => import('./SecurityGuideModal').then(module => ({ default: module.SecurityGuideModal })));

interface Props {
  config: AppConfig;
  onOpenConfig: () => void;
  onOpenNetwork: () => void;
  isNetworkConnected: boolean;
  onExecute: (name: string, path: string) => void;
  onRefresh?: () => Promise<void> | void;
  onRefreshSecurity?: () => Promise<any> | void;
  onClearLogs?: () => void;
  brightness: number;
  setBrightness: (val: number) => void;
  zoomLevel: number;
  setZoomLevel: (val: number | ((prev: number) => number)) => void;
  sysInfo: Record<string, string>;
  securityStatus: SecurityStatus;
  debugLogs: string[];
}

export default function Dashboard({ 
  config, onOpenConfig, onOpenNetwork, isNetworkConnected, onExecute, onRefresh, onRefreshSecurity, onClearLogs, brightness, setBrightness, 
  zoomLevel, setZoomLevel,
  sysInfo, securityStatus, debugLogs 
}: Props) {
  const { language, t } = useLanguage();
  const {
    batteryStatus,
    batteryLevel,
    batteryDurationInfo,
    sampleCount: batterySampleCount,
    isUpdating: isBatteryUpdating,
    refreshBattery
  } = useBatteryMonitor({
    updateIntervalMs: 5000,
    sampleRateMs: 1000,
    windowMs: 5000,
    lang: language,
  });
  const [confirmAction, setConfirmAction] = useState<{name: string, path: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [biosStatus, setBiosStatus] = useState<'checking' | 'available' | 'up_to_date' | 'error' | 'installing'>('checking');
  const [biosTitle, setBiosTitle] = useState<string>('');
  const [biosReport, setBiosReport] = useState<string | null>(null);
  const [missingDriversCount, setMissingDriversCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(true);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);
  const [helpTab, setHelpTab] = useState<'workflow' | 'drivers' | 'bios' | 'tests' | 'network' | 'shortcuts' | 'faq'>('workflow');

  // Modals state
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showDriversModal, setShowDriversModal] = useState<boolean>(false);
  const [showWuModal, setShowWuModal] = useState<boolean>(false);
  const [showNasModal, setShowNasModal] = useState<boolean>(false);
  const [showBiosModal, setShowBiosModal] = useState<boolean>(false);
  const [biosModalInitialMode, setBiosModalInitialMode] = useState<'choice' | 'wu' | 'manual'>('choice');
  const [showCameraMicModal, setShowCameraMicModal] = useState<boolean>(false);
  const [showScreenTestModal, setShowScreenTestModal] = useState<boolean>(false);
  const [showBatteryModal, setShowBatteryModal] = useState<boolean>(false);
  const [showSecurityGuideModal, setShowSecurityGuideModal] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);

  const [biosAutoReboot, setBiosAutoReboot] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app-bios-autoreboot') || localStorage.getItem('opeq-bios-autoreboot');
      return saved !== null ? JSON.parse(saved) : (config.autoReboot || false);
    } catch {
      return config.autoReboot || false;
    }
  });

  const handleToggleBiosAutoReboot = (checked: boolean) => {
    setBiosAutoReboot(checked);
    try {
      localStorage.setItem('app-bios-autoreboot', JSON.stringify(checked));
    } catch {}
  };

  const showToastNotification = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 2200);
  };

  useEffect(() => {
    let isMounted = true;

    // Check missing drivers and admin privileges
    setTimeout(() => {
      hardwareAPI.checkMissingDrivers().then(count => {
        if (isMounted) setMissingDriversCount(count);
      }).catch(() => {
        if (isMounted) setMissingDriversCount(0);
      });

      hardwareAPI.checkIsAdmin().then(admin => {
        if (isMounted) setIsAdmin(admin);
      }).catch(() => {
        if (isMounted) setIsAdmin(true);
      });
    }, 200);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    showToastNotification(t('specs.refreshing'), 'info');
    try {
      if (onRefresh) {
        await onRefresh();
      }
      const [drivers] = await Promise.all([
        hardwareAPI.checkMissingDrivers().catch(() => 0),
        refreshBattery().catch(() => null),
      ]);
      setMissingDriversCount(drivers);
      showToastNotification(t('specs.refreshed'), 'success');
    } catch {
      showToastNotification(t('specs.refresh_error'), 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Keyboard Shortcuts for Technicians
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes any active foreground modal
      if (e.key === 'Escape') {
        const isAnyModalOpen = showHelpModal || showDriversModal || showWuModal || showNasModal || showBiosModal || showCameraMicModal || showScreenTestModal || showBatteryModal || showSecurityGuideModal || showLogsModal || !!confirmAction;
        if (isAnyModalOpen) {
          e.preventDefault();
          setShowHelpModal(false);
          setShowDriversModal(false);
          setShowWuModal(false);
          setShowNasModal(false);
          setShowBiosModal(false);
          setShowCameraMicModal(false);
          setShowScreenTestModal(false);
          setShowBatteryModal(false);
          setShowSecurityGuideModal(false);
          setShowLogsModal(false);
          setConfirmAction(null);
          return;
        }
      }

      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      // When modals are open, do not trigger background action shortcuts
      const isAnyModalOpen = showHelpModal || showDriversModal || showWuModal || showNasModal || showBiosModal || showCameraMicModal || showScreenTestModal || showBatteryModal || showSecurityGuideModal || showLogsModal || !!confirmAction;
      if (isAnyModalOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      // F5 or R: Re-scan hardware, battery, disks & refresh telemetry
      if (e.key === 'F5' || key === 'f5' || key === 'r') {
        e.preventDefault();
        handleRefreshAll();
        showToastNotification(`🔄 ${language === 'en' ? 'Shortcut [F5/R]: Refreshing hardware & telemetry' : 'Raccourci [F5/R] : Actualisation du matériel & télémétrie'}`, 'info');
      } else if (key === 'h' || key === 'f1') {
        e.preventDefault();
        setHelpTab('workflow');
        setShowHelpModal(prev => !prev);
      } else if (key === 'e') {
        e.preventDefault();
        setShowScreenTestModal(true);
        showToastNotification('🖥️ Raccourci [E] : Test Écran', 'info');
      } else if (key === 'c') {
        e.preventDefault();
        setShowCameraMicModal(true);
        showToastNotification('📷 Raccourci [C] : Test Caméra & Micro', 'info');
      } else if (key === 'k') {
        e.preventDefault();
        onExecute('Test Clavier', config.testClavierPath);
        showToastNotification('⌨️ Raccourci [K] : Lancement AquaKeyTest', 'info');
      } else if (key === 's') {
        e.preventDefault();
        onExecute('Test de son', config.testSonPath);
        showToastNotification('🔊 Raccourci [S] : Test Audio Windows', 'info');
      } else if (key === 'b') {
        e.preventDefault();
        setShowBatteryModal(true);
        showToastNotification('🔋 Raccourci [B] : Diagnostic Santé Batterie', 'info');
      } else if (key === 't') {
        e.preventDefault();
        onExecute('BurnIn test', config.burnInTestPath);
        showToastNotification('🔥 Raccourci [T] : BurnIn Stress Test', 'info');
      } else if (key === 'f') {
        e.preventDefault();
        setShowBiosModal(true);
        showToastNotification('⚡ Raccourci [F] : Gestionnaire Firmware BIOS', 'info');
      } else if (key === 'p') {
        e.preventDefault();
        setShowDriversModal(true);
        showToastNotification('🔧 Raccourci [P] : Gestionnaire de Pilotes', 'info');
      } else if (key === 'l') {
        e.preventDefault();
        setShowLogsModal(prev => {
          const next = !prev;
          showToastNotification(next ? 'Fenêtre des logs ouverte' : 'Fenêtre des logs fermée', 'info');
          return next;
        });
      } else if (key === 'r') {
        e.preventDefault();
        handleRefreshAll();
      } else if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setHelpTab('shortcuts');
        setShowHelpModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, showHelpModal, showDriversModal, showWuModal, showNasModal, showBiosModal, showCameraMicModal, showScreenTestModal, showBatteryModal, confirmAction, isRefreshing, showLogsModal, language]);

  const copyToClipboard = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToastNotification(`✓ ${label} copié dans le presse-papiers`, 'success');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Structured System Information
  const isNotReady = (s?: string | null) => !s || s === 'N/A' || s === 'Chargement...' || s === 'Loading...' || s === t('common.loading') || s === '...';

  const getSysValue = (possibleKeys: string[]) => {
    for (const k of possibleKeys) {
      if (sysInfo[k] !== undefined && sysInfo[k] !== '') {
        const v = sysInfo[k];
        if (v === 'Chargement...' || v === 'Loading...') return t('common.loading');
        return v;
      }
      if (sysInfo[`${k} :`] !== undefined && sysInfo[`${k} :`] !== '') {
        const v = sysInfo[`${k} :`];
        if (v === 'Chargement...' || v === 'Loading...') return t('common.loading');
        return v;
      }
      if (sysInfo[`${k}:`] !== undefined && sysInfo[`${k}:`] !== '') {
        const v = sysInfo[`${k}:`];
        if (v === 'Chargement...' || v === 'Loading...') return t('common.loading');
        return v;
      }
    }
    return 'N/A';
  };

  const parsedSpecs = useMemo(() => {
    const rawDiskSn = getSysValue(['Numéro de série disque(s)', 'diskSn', 'Disque SN', 'S/N Disque']);
    
    // Client-side helper to filter out BIOS/SMBIOS placeholder strings and internal firmware metadata
    const cleanSmbiosTagClient = (val: string) => {
      if (!val) return '';
      const v = val.trim();
      const lower = v.toLowerCase();
      if (
        !v || 
        lower === 'default string' || 
        lower === 'none' || 
        lower === 'null' || 
        lower === 'n/a' || 
        lower === 'standard' || 
        lower === 'oem' || 
        lower === '<not set>' ||
        lower === '<blank>' ||
        lower === '<none>' ||
        lower === 'unassigned' ||
        lower === 'empty' ||
        /^to be filled by o\.?e\.?m\.?$/i.test(v) ||
        /^not specified$/i.test(v) ||
        /^(type2 - board|chassis|no|system|base board) asset tag$/i.test(v) ||
        /^[fF]{4,}$/.test(v) ||
        /^[0]{4,}$/.test(v) ||
        /^[-_.\s]+$/.test(v) ||
        // HP / UEFI / Intel firmware internal markers & configs
        /^edk2/i.test(v) ||
        /^mefw/i.test(v) ||
        /^me_fw/i.test(v) ||
        /^ec_?fw/i.test(v) ||
        /^buff=/i.test(v) ||
        /^[A-Za-z0-9_]+=[A-Za-z0-9_.]+$/.test(v) ||
        /^(fbyte|buildid|sabl|hp_pa_)#/i.test(v) ||
        /^(platform_|softpaq)/i.test(v) ||
        /^ms_digital_marker/i.test(v) ||
        /^(american megatrends|insyde|phoenix)/i.test(v) ||
        /^dell (utility|system|inc)/i.test(v) ||
        /^(http|https):\/\//i.test(v) ||
        /^www\./i.test(v) ||
        /^[A-Za-z0-9_]+#[A-Za-z0-9_#]+/.test(v) ||
        v.length <= 2 ||
        (v.length > 45 && !v.includes(' '))
      ) {
        return '';
      }
      return v;
    };

    // Client-side helper to ensure un-hexing/un-swapping of raw ATA strings
    const cleanDiskSerialClient = (sn: string) => {
      let s = sn.trim().replace(/\0/g, '').replace(/\.+$/, '').trim();
      if (!s || s.toLowerCase() === 'none' || s.toLowerCase() === 'null' || s.toLowerCase() === 'default string' || s.toLowerCase() === 'n/a' || s === '00000000') {
        return '';
      }

      // Un-hex ASCII strings if applicable
      if (/^[0-9A-Fa-f]{16,}$/.test(s) && s.length % 2 === 0) {
        try {
          const bytes: number[] = [];
          for (let i = 0; i < s.length; i += 2) {
            bytes.push(parseInt(s.substring(i, i + 2), 16));
          }
          if (bytes.every(b => b === 0 || (b >= 32 && b <= 126))) {
            const swapped = [...bytes];
            for (let i = 0; i < swapped.length - 1; i += 2) {
              const temp = swapped[i];
              swapped[i] = swapped[i + 1];
              swapped[i + 1] = temp;
            }
            const strSwapped = String.fromCharCode(...swapped).replace(/\0/g, '').replace(/\.+$/, '').trim();
            const strNormal = String.fromCharCode(...bytes).replace(/\0/g, '').replace(/\.+$/, '').trim();
            if (/^[A-Za-z0-9_\-. ]{4,}$/.test(strSwapped)) return strSwapped;
            if (/^[A-Za-z0-9_\-. ]{4,}$/.test(strNormal)) return strNormal;
          }
        } catch {}
      }
      return s;
    };

    const diskSnsList = !isNotReady(rawDiskSn)
      ? Array.from(new Set(rawDiskSn.split(',').map(s => cleanDiskSerialClient(s)).filter(Boolean)))
      : [];

    const rawSmart = getSysValue(['État SMART', 'smartStatus', 'Santé Disque', 'diskHealth', 'SMART', 'smart']).toUpperCase();
    const isEn = language === 'en';
    let smartHealth: { 
      level: 'healthy' | 'warning' | 'critical' | 'loading'; 
      label: string; 
      tooltip: string; 
      detail: string 
    } = {
      level: 'healthy',
      label: isEn ? 'SMART Healthy' : 'SMART Sain',
      tooltip: isEn ? 'S.M.A.R.T. Healthy: Hardware integrity verified, 0 anomalies detected.' : 'État S.M.A.R.T. Sain : Intégrité matérielle vérifiée, 0 anomalie détectée.',
      detail: isEn ? 'Healthy (OK)' : 'Sain (OK)'
    };

    if (rawSmart === 'CHARGEMENT...' || rawSmart === 'LOADING...' || rawSmart === '') {
      if (getSysValue(['Disque', 'Capacité stockage', 'disk']) === 'Chargement...' || getSysValue(['Disque', 'Capacité stockage', 'disk']) === 'Loading...') {
        smartHealth = {
          level: 'loading',
          label: 'SMART...',
          tooltip: isEn ? 'Checking S.M.A.R.T. health status...' : 'Vérification de l\'état S.M.A.R.T. en cours...',
          detail: isEn ? 'Checking...' : 'Vérification...'
        };
      }
    } else if (
      rawSmart.includes('CRITICAL') || 
      rawSmart.includes('CRITIQUE') || 
      rawSmart.includes('ERROR') || 
      rawSmart.includes('ERREUR') || 
      rawSmart.includes('BAD') || 
      rawSmart.includes('FAILURE') || 
      rawSmart.includes('DÉFAILLANT')
    ) {
      smartHealth = {
        level: 'critical',
        label: isEn ? 'SMART Critical' : 'SMART Critique',
        tooltip: isEn ? 'S.M.A.R.T. Critical: Imminent hardware failure or unrecoverable bad sectors!' : 'État S.M.A.R.T. Critique : Défaillance matérielle imminente ou secteurs défectueux irrécupérables !',
        detail: isEn ? 'Critical / Failure' : 'Critique / Défaillance'
      };
    } else if (
      rawSmart.includes('WARN') || 
      rawSmart.includes('ATTENTION') || 
      rawSmart.includes('CAUTION') || 
      rawSmart.includes('DEGRADED') || 
      rawSmart.includes('PRED FAIL') || 
      rawSmart.includes('USURE')
    ) {
      smartHealth = {
        level: 'warning',
        label: isEn ? 'SMART Warning' : 'SMART Attention',
        tooltip: isEn ? 'S.M.A.R.T. Warning: Wear indicator or reallocated sectors detected, monitoring required.' : 'État S.M.A.R.T. Attention : Prédicteur d\'usure ou secteurs réalloués détectés, surveillance requise.',
        detail: isEn ? 'Warning / Caution' : 'Attention requise'
      };
    } else {
      smartHealth = {
        level: 'healthy',
        label: isEn ? 'SMART Healthy' : 'SMART Sain',
        tooltip: isEn ? 'S.M.A.R.T. Healthy: 100% operational, no defects reported.' : 'État S.M.A.R.T. Sain : 100% opérationnel, aucun défaut SMART signalé.',
        detail: isEn ? 'Healthy (100% OK)' : 'Sain (100% OK)'
      };
    }

    const rawAsset = cleanSmbiosTagClient(getSysValue(['Asset Tag', 'assetTag']));
    const rawOem = getSysValue(['Ownership Tag', 'ownershipTag', 'oemString']);
    const cleanedOemList = !isNotReady(rawOem)
      ? Array.from(new Set(rawOem.split(/[,;\n]+/).map(s => cleanSmbiosTagClient(s)).filter(Boolean)))
      : [];

    return {
      model: getSysValue(['Modèle', 'model']),
      serialNumber: getSysValue(['Numéro de série', 'sn', 'Serial Number']),
      uuid: getSysValue(['UUID', 'uuid', 'Identifiant UUID']),
      assetTag: rawAsset || 'N/A',
      ownershipTag: cleanedOemList.length > 0 ? cleanedOemList.join(', ') : 'N/A',
      cpu: getSysValue(['CPU', 'Processeur', 'cpu']),
      memory: getSysValue(['Memoire', 'Mémoire', 'mem', 'Mémoire vive']),
      disk: getSysValue(['Disque', 'Capacité stockage', 'disk']),
      diskSns: diskSnsList,
      rawDiskSn,
      smartHealth,
      gpu: getSysValue(['Carte Vidéo', 'Carte graphique', 'gpu']),
      bios: getSysValue(['Version de Bios', 'Version du BIOS', 'bios']),
    };
  }, [sysInfo, language]);

  const allSpecsHidden = useMemo(() => {
    return Boolean(
      config.hiddenSpecs?.model &&
      config.hiddenSpecs?.serialNumber &&
      config.hiddenSpecs?.uuid &&
      config.hiddenSpecs?.assetTag &&
      config.hiddenSpecs?.ownershipTag &&
      config.hiddenSpecs?.cpu &&
      config.hiddenSpecs?.memory &&
      config.hiddenSpecs?.disk &&
      config.hiddenSpecs?.diskSn &&
      config.hiddenSpecs?.gpu &&
      config.hiddenSpecs?.bios
    );
  }, [config.hiddenSpecs]);

  const allTestsHidden = useMemo(() => {
    const defaultTestsHidden = Boolean(
      config.hiddenTests?.screen &&
      config.hiddenTests?.audio &&
      config.hiddenTests?.keyboard &&
      config.hiddenTests?.camera &&
      config.hiddenTests?.burnin
    );
    const hasExternalApps = Boolean(config.externalApps && config.externalApps.length > 0);
    return defaultTestsHidden && !hasExternalApps;
  }, [config.hiddenTests, config.externalApps]);

  return (
    <div className="w-full min-h-full bg-zinc-950 flex flex-col relative font-sans text-zinc-100 select-none">
      
      {/* HEADER COMPACT ET FLUIDE */}
      <header className="bg-zinc-900/90 border-b border-zinc-800/80 px-6 py-2 flex items-center justify-between shrink-0 backdrop-blur-md sticky top-0 z-30">
        {/* Hardware Diagnostic Suite Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Cpu size={22} className="stroke-[2.2]" />
          </div>
          <div className="hidden md:flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-zinc-100 tracking-tight">Hardware Diagnostic & Update Tool</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">v1.2.48</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">{language === 'en' ? 'Diagnostics, Drivers & Configuration Suite' : 'Suite de Diagnostic, Pilotes & Configuration'}</span>
          </div>
        </div>

        {/* Contrôle de Luminosité & Zoom (DPI) */}
        <div className="flex items-center space-x-2.5 flex-1 max-w-2xl justify-center px-2">
          <BrightnessControl 
            value={brightness} 
            onChange={setBrightness} 
          />
          
          {/* Contrôle de Zoom (DPI) */}
          <div className="hidden sm:flex items-center h-10 bg-zinc-950/90 border border-zinc-800/90 rounded-xl px-2 shadow-inner space-x-1 shrink-0">
            <button 
              id="zoom-out-btn"
              onClick={() => {
                setZoomLevel(z => {
                  const val = Math.max(0.6, Number(z) - 0.05);
                  localStorage.setItem('app-zoom-manual', val.toString());
                  return val;
                });
              }}
              className="h-7 px-2 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-xs font-bold cursor-pointer"
              title={language === 'en' ? "Shrink interface (A-)" : "Réduire l'interface (A-)"}
            >
              A-
            </button>
            <button
              id="zoom-reset-btn"
              onClick={() => {
                localStorage.removeItem('app-zoom-manual');
                localStorage.removeItem('opeq-zoom-manual');
                window.dispatchEvent(new Event('resize'));
              }}
              className="h-7 px-2 flex items-center justify-center text-xs text-zinc-400 hover:text-emerald-400 font-mono text-center select-none cursor-pointer transition-colors font-semibold" 
              title={language === 'en' ? "Zoom level. Click to auto-adjust" : "Niveau de zoom. Cliquez pour Auto-Ajuster"}
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button 
              id="zoom-in-btn"
              onClick={() => {
                setZoomLevel(z => {
                  const val = Math.min(1.5, Number(z) + 0.05);
                  localStorage.setItem('app-zoom-manual', val.toString());
                  return val;
                });
              }}
              className="h-7 px-2 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-xs font-bold cursor-pointer"
              title={language === 'en' ? "Enlarge interface (A+)" : "Agrandir l'interface (A+)"}
            >
              A+
            </button>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center space-x-2 shrink-0">
          <LanguageSwitcher />

          <button 
            id="header-config-btn"
            onClick={onOpenConfig} 
            className="h-10 flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all shadow-xs text-xs font-semibold cursor-pointer group"
            title={t('header.config_tooltip')}
          >
            <Settings size={16} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
            <span>{t('header.config')}</span>
          </button>

          {/* Guide & Manuel (?) à l'extrême droite */}
          <button
            id="header-help-btn"
            onClick={() => {
              setHelpTab('workflow');
              setShowHelpModal(true);
            }}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 hover:text-white border border-blue-500/40 hover:border-blue-400/60 transition-all text-xs font-bold cursor-pointer shadow-xs group"
            title={t('header.help_tooltip')}
          >
            <HelpCircle size={17} className="text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL EN DASHBOARD GRID */}
      <div className="flex-1 p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* COLONNE GAUCHE (7 cols) : Spécifications Matérielles & Diagnostics System */}
        <div className="lg:col-span-7 flex flex-col space-y-2.5">
          
          {/* Pre-Flight Administrator & AC Power Safety Banner */}
          <PreFlightSafetyBanner
            isAdmin={isAdmin}
            batteryStatus={batteryStatus}
            onRestartAsAdmin={() => {
              hardwareAPI.restartAsAdmin().catch(err => {
                showToastNotification(`Échec de la relance en administrateur : ${err}`, 'warning');
              });
            }}
          />

          {/* Windows 11 Security Status Banner */}
          {!config.hiddenSpecs?.securityBanner && (
            <div 
              onClick={() => setShowSecurityGuideModal(true)}
              className="bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-2.5 flex items-center justify-between backdrop-blur-sm shadow-xs cursor-pointer transition-all group"
              title={t('security.banner_tooltip')}
            >
              
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg border transition-transform group-hover:scale-105 ${
                  (securityStatus.tpm && securityStatus.secureBoot) 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : (securityStatus.tpm === null || securityStatus.secureBoot === null)
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {(securityStatus.tpm && securityStatus.secureBoot) ? (
                    <ShieldCheck size={20} />
                  ) : (
                    <ShieldAlert size={20} />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <span>{t('security.hardware_security')}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{t('security.win11')}</span>
                    <span className="text-[9px] text-zinc-500 group-hover:text-emerald-400 font-normal transition-colors ml-1">
                      {t('security.guide_diag')}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center space-x-3">
                    
                    {/* TPM Status */}
                    <span className="flex items-center space-x-1">
                      <span className="text-zinc-500">{t('security.tpm_label')}</span>
                      {securityStatus.tpm === null ? (
                        <span className="italic text-zinc-500">...</span>
                      ) : securityStatus.tpm ? (
                        <span className="text-emerald-400 font-bold">{t('common.active')}</span>
                      ) : (
                        <span className="text-rose-400 font-bold">{t('common.inactive')}</span>
                      )}
                    </span>

                    <span className="text-zinc-700">•</span>
                    
                    {/* Secure Boot Status */}
                    <span className="flex items-center space-x-1">
                      <span className="text-zinc-500">{t('security.secureboot_label')}</span>
                      {securityStatus.secureBoot === null ? (
                        <span className="italic text-zinc-500">...</span>
                      ) : securityStatus.secureBoot ? (
                        <span className="text-emerald-400 font-bold">{t('common.active')}</span>
                      ) : securityStatus.setupMode ? (
                        <span 
                          className="text-amber-400 font-bold cursor-pointer hover:underline"
                          title={t('security.setup_mode_tooltip')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSecurityGuideModal(true);
                          }}
                        >
                          {t('security.setup_mode')}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">{t('common.inactive')}</span>
                      )}
                    </span>
                    
                    <span className="text-zinc-700">•</span>
                    
                    {/* HDD Mode Status */}
                    <span className="flex items-center space-x-1">
                      <span className="text-zinc-500">{t('security.hdd_mode')}</span>
                      {securityStatus.isUefi === null || securityStatus.isUefi === undefined ? (
                        <span className="italic text-zinc-500">...</span>
                      ) : (
                        <span className={`font-bold ${securityStatus.isUefi ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {securityStatus.isUefi ? 'UEFI' : 'Legacy'}
                        </span>
                      )}
                    </span>

                  </div>
                </div>
              </div>

              {/* Global Status / Erreur */}
              <div className="flex flex-col items-end">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  (securityStatus.tpm && securityStatus.secureBoot) 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : (securityStatus.tpm === null || securityStatus.secureBoot === null) 
                    ? 'bg-zinc-800 text-zinc-400' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {(securityStatus.tpm && securityStatus.secureBoot) ? t('security.win11_compliant') : (securityStatus.tpm === null || securityStatus.secureBoot === null) ? t('security.checking') : t('security.config_required')}
                </span>
                {securityStatus.error && <span className="text-[9px] text-rose-400 mt-0.5 max-w-[150px] truncate">{securityStatus.error}</span>}
              </div>

            </div>
          )}

          {/* Tableau des informations système */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-3 flex-1 overflow-y-auto space-y-1.5 custom-scrollbar shadow-inner">
            
            {/* Titre & actualisation rapide */}
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
              <div className="flex items-center space-x-1.5">
                <Cpu size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('specs.detected_specs')}</span>
              </div>
              
              <button
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                title={t('specs.refresh_tooltip')}
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
              </button>
            </div>

            {/* Liste complète et directe des spécifications */}
            <div className="space-y-0.5">
              {!config.hiddenSpecs?.model && (
                <SpecRow 
                  label={t('specs.model')} 
                  value={parsedSpecs.model} 
                  onCopy={!isNotReady(parsedSpecs.model) ? () => copyToClipboard(t('specs.model'), parsedSpecs.model) : undefined}
                  isCopied={copiedKey === t('specs.model')}
                />
              )}
              
              {!config.hiddenSpecs?.serialNumber && (
                <SpecRow 
                  label={t('specs.serial_number')} 
                  value={parsedSpecs.serialNumber} 
                  isHighlight 
                  highlightColor="amber"
                  onCopy={!isNotReady(parsedSpecs.serialNumber) ? () => copyToClipboard(t('specs.serial_number'), parsedSpecs.serialNumber) : undefined}
                  isCopied={copiedKey === t('specs.serial_number')}
                />
              )}

              {!config.hiddenSpecs?.uuid && (
                <SpecRow 
                  label={t('specs.uuid')} 
                  value={parsedSpecs.uuid} 
                  onCopy={!isNotReady(parsedSpecs.uuid) ? () => copyToClipboard(t('specs.uuid'), parsedSpecs.uuid) : undefined}
                  isCopied={copiedKey === t('specs.uuid')}
                />
              )}

              {!config.hiddenSpecs?.assetTag && (
                <SpecRow 
                  label={t('specs.asset_tag')} 
                  value={parsedSpecs.assetTag} 
                  onCopy={!isNotReady(parsedSpecs.assetTag) ? () => copyToClipboard(t('specs.asset_tag'), parsedSpecs.assetTag) : undefined}
                  isCopied={copiedKey === t('specs.asset_tag')}
                />
              )}

              {!config.hiddenSpecs?.ownershipTag && (
                <SpecRow 
                  label={t('specs.ownership_tag')} 
                  value={parsedSpecs.ownershipTag} 
                  onCopy={!isNotReady(parsedSpecs.ownershipTag) ? () => copyToClipboard(t('specs.ownership_tag'), parsedSpecs.ownershipTag) : undefined}
                  isCopied={copiedKey === t('specs.ownership_tag')}
                />
              )}

              {!config.hiddenSpecs?.cpu && (
                <SpecRow 
                  label={t('specs.cpu')} 
                  value={parsedSpecs.cpu} 
                />
              )}

              {!config.hiddenSpecs?.memory && (
                <SpecRow 
                  label={t('specs.memory')} 
                  value={parsedSpecs.memory} 
                />
              )}

              {/* Capacité stockage & Pastille de statut SMART */}
              {!config.hiddenSpecs?.disk && (
                <div className="group flex items-center justify-between px-2 py-1 rounded-lg hover:bg-zinc-800/60 transition-colors">
                  <span className="text-xs font-medium text-zinc-400 w-1/3 truncate" title={t('specs.storage_capacity')}>
                    {t('specs.storage_capacity')}
                  </span>
                  <div className="w-2/3 flex items-center justify-end space-x-2">
                    {/* Pastille UEFI/Legacy */}
                    <div 
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold font-mono transition-all select-none shrink-0 shadow-2xs ${
                        securityStatus.isUefi === null || securityStatus.isUefi === undefined
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : securityStatus.isUefi
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                      }`}
                      title={
                        securityStatus.isUefi === null || securityStatus.isUefi === undefined
                          ? "Vérification du mode de partition..."
                          : securityStatus.isUefi 
                          ? "Système installé en mode UEFI (Moderne)" 
                          : "Système installé en mode Hérité (Legacy/MBR)"
                      }
                    >
                      <span>
                        HDD: {securityStatus.isUefi === null || securityStatus.isUefi === undefined ? '...' : securityStatus.isUefi ? 'UEFI' : 'Legacy'}
                      </span>
                    </div>

                    {/* Pastille SMART : Verte (Sain) / Orange (Attention) / Rouge (Critique) */}
                    {!isNotReady(parsedSpecs.disk) && (
                      <div 
                        className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono transition-all select-none cursor-help shrink-0 shadow-2xs ${
                          parsedSpecs.smartHealth.level === 'healthy'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : parsedSpecs.smartHealth.level === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                            : parsedSpecs.smartHealth.level === 'critical'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/50 hover:bg-rose-500/25'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                        title={parsedSpecs.smartHealth.tooltip}
                      >
                        <span 
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            parsedSpecs.smartHealth.level === 'healthy'
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                              : parsedSpecs.smartHealth.level === 'warning'
                              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse'
                              : parsedSpecs.smartHealth.level === 'critical'
                              ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-pulse'
                              : 'bg-zinc-500'
                          }`} 
                        />
                        <span className="tracking-wide">
                          {parsedSpecs.smartHealth.label}
                        </span>
                      </div>
                    )}

                    <span 
                      className="text-xs font-mono font-semibold text-zinc-100 truncate text-right"
                      title={parsedSpecs.disk}
                    >
                      {parsedSpecs.disk}
                    </span>
                  </div>
                </div>
              )}

              {/* S/N Disques avec formatage Multi-disque propre */}
              {!config.hiddenSpecs?.diskSn && (
                <div className="group flex items-center justify-between px-2 py-1 rounded-lg hover:bg-zinc-800/60 transition-colors">
                  <span className="text-xs font-medium text-zinc-400 w-1/3 truncate" title={t('specs.disk_sn')}>
                    {t('specs.disk_sn')}
                  </span>
                  <div className="w-2/3 flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                    {parsedSpecs.diskSns.length > 0 ? (
                      parsedSpecs.diskSns.map((sn, idx) => {
                        const isThisCopied = copiedKey === `disk_sn_${idx}`;
                        return (
                          <div 
                            key={idx} 
                            className="inline-flex items-center space-x-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 hover:border-emerald-500/40 transition-colors shadow-2xs"
                          >
                            <span className="text-xs font-mono font-semibold text-emerald-400 max-w-[140px] truncate" title={sn}>
                              {sn}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(sn);
                                setCopiedKey(`disk_sn_${idx}`);
                                showToastNotification(language === 'en' ? `✓ Disk S/N "${sn}" copied` : `✓ S/N Disque "${sn}" copié`, 'success');
                                setTimeout(() => setCopiedKey(null), 1500);
                              }}
                              className="text-zinc-500 hover:text-emerald-400 p-0.5 rounded cursor-pointer transition-colors"
                              title={`Copier S/N: ${sn}`}
                            >
                              {isThisCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-semibold text-zinc-100 truncate text-right">
                          {parsedSpecs.rawDiskSn}
                        </span>
                        {!isNotReady(parsedSpecs.rawDiskSn) && (
                          <button
                            onClick={() => copyToClipboard(t('specs.disk_sn'), parsedSpecs.rawDiskSn)}
                            className="text-zinc-500 hover:text-emerald-400 p-1 rounded transition-colors cursor-pointer shrink-0"
                            title={t('specs.disk_sn')}
                          >
                            {copiedKey === t('specs.disk_sn') ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!config.hiddenSpecs?.gpu && (
                <SpecRow 
                  label={t('specs.gpu')} 
                  value={parsedSpecs.gpu} 
                />
              )}

              {!config.hiddenSpecs?.bios && (
                <SpecRow 
                  label={t('specs.bios_version')} 
                  value={parsedSpecs.bios} 
                  isHighlight={biosStatus === 'up_to_date'}
                  highlightColor="emerald"
                />
              )}

              {allSpecsHidden && (
                <div className="text-xs text-zinc-500 italic text-center py-6 bg-zinc-950/50 rounded-xl border border-zinc-800/50 border-dashed space-y-1">
                  <p>{t('specs.all_hidden')}</p>
                  <p className="text-[11px] text-zinc-600">{t('specs.reactivate_config')}</p>
                </div>
              )}
            </div>

          </div>

          {/* BIOS Update & Drivers Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Firmware BIOS Button */}
            <div className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 rounded-xl flex items-center justify-between transition-all text-left group shadow-xs">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Zap size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <span>{t('actions.bios_update')}</span>
                    <span className="text-[9.5px] font-medium text-amber-400/90 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/30">{t('actions.bios_choices')}</span>
                    <kbd className="text-[9px] font-mono bg-zinc-950 px-1 py-0.2 rounded text-zinc-500 border border-zinc-800">F</kbd>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                    {!isNotReady(parsedSpecs.bios)
                      ? `BIOS : ${parsedSpecs.bios}`
                      : t('actions.bios_subtext')}
                  </div>
                  {/* Auto-reboot Checkbox */}
                  <label 
                    className="flex items-center space-x-1.5 mt-1 cursor-pointer select-none text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                    title={t('actions.bios_autoreboot_tooltip')}
                  >
                    <input
                      type="checkbox"
                      checked={biosAutoReboot}
                      onChange={(e) => handleToggleBiosAutoReboot(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                    />
                    <span className="truncate">{t('actions.bios_autoreboot_label')}</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  setBiosModalInitialMode('choice');
                  setShowBiosModal(true);
                }}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[10.5px] rounded-lg uppercase group-hover:scale-105 active:scale-95 transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer ml-1.5"
                title={t('actions.bios_update')}
              >
                <Zap size={12} className="fill-zinc-950" />
                <span>{t('actions.update')}</span>
              </button>
            </div>

            {/* Drivers Manager Button */}
            <button
              onClick={() => setShowDriversModal(true)}
              className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer group shadow-xs"
            >
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg ${
                  missingDriversCount !== null && missingDriversCount > 0 
                    ? 'bg-rose-500/20 text-rose-400' 
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <Wrench size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <span>{t('actions.drivers_manager')}</span>
                    <kbd className="text-[9px] font-mono bg-zinc-950 px-1 py-0.2 rounded text-zinc-500 border border-zinc-800">P</kbd>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {missingDriversCount !== null && missingDriversCount > 0 ? (
                      <span className="text-rose-400 font-semibold">{missingDriversCount} {t('actions.missing_drivers')}</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">{t('actions.all_drivers_installed')}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-zinc-800 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 text-zinc-400 text-[10px] font-bold rounded uppercase transition-colors">
                {t('actions.manage')}
              </span>
            </button>
          </div>

        </div>

        {/* COLONNE DROITE (5 cols) : Suite de Tests Matériels & Controles */}
        <div className="lg:col-span-5 flex flex-col space-y-2.5">
          
          {/* Action Tests Grid */}
          <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-3 space-y-2 flex-1 flex flex-col shadow-inner">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/80 flex items-center justify-between">
              <span>{t('tests.title')}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{t('tests.quick_trigger')}</span>
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col justify-around pt-0.5">
              {!config.hiddenTests?.screen && (
                <TestActionButton 
                  icon={<Monitor size={17} className="text-blue-400" />}
                  title={t('tests.screen_touch')}
                  subtitle={t('tests.screen_touch_sub')}
                  shortcutKey="E"
                  onClick={() => setShowScreenTestModal(true)}
                />
              )}
              {!config.hiddenTests?.audio && (
                <TestActionButton 
                  icon={<Volume2 size={17} className="text-emerald-400" />}
                  title={t('tests.audio')}
                  subtitle={t('tests.audio_sub')}
                  shortcutKey="S"
                  onClick={() => onExecute('Test de son', config.testSonPath)}
                />
              )}
              {!config.hiddenTests?.keyboard && (
                <TestActionButton 
                  icon={<Keyboard size={17} className="text-purple-400" />}
                  title={t('tests.keyboard')}
                  subtitle={t('tests.keyboard_sub')}
                  shortcutKey="K"
                  onClick={() => onExecute('Test Clavier', config.testClavierPath)}
                />
              )}
              {!config.hiddenTests?.camera && (
                <TestActionButton 
                  icon={<Camera size={17} className="text-amber-400" />}
                  title={t('tests.camera_mic')}
                  subtitle={t('tests.camera_mic_sub')}
                  shortcutKey="C"
                  onClick={() => setShowCameraMicModal(true)}
                />
              )}
              {!config.hiddenTests?.burnin && (
                <TestActionButton 
                  icon={<Flame size={17} className="text-rose-400" />}
                  title={t('tests.burnin')}
                  subtitle={t('tests.burnin_sub')}
                  shortcutKey="T"
                  onClick={() => onExecute('BurnIn test', config.burnInTestPath)}
                />
              )}
              {config.externalApps?.map(app => (
                <TestActionButton 
                  key={app.id}
                  icon={<Play size={17} className="text-zinc-400" />}
                  title={app.name || t('tests.external_app')}
                  subtitle={app.path}
                  onClick={() => onExecute(app.name || "App", app.path)}
                />
              ))}
              {allTestsHidden && (
                <div className="text-xs text-zinc-500 italic text-center py-6 bg-zinc-950/50 rounded-xl border border-zinc-800/50 border-dashed space-y-1 my-auto">
                  <p>{t('tests.all_hidden')}</p>
                  <p className="text-[11px] text-zinc-600">{t('specs.reactivate_config')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Hardware Controls (Battery, Wifi, Bluetooth) */}
          {(!config.hiddenTests?.battery || !config.hiddenTests?.bluetooth || !config.hiddenTests?.wifi) && (
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-2 flex items-center justify-around">
              {/* Battery Button (Pourcentage, Durée estimée, Santé, État d'alimentation) */}
              {!config.hiddenTests?.battery && (
                <button 
                  id="dashboard-battery-btn"
                  onClick={() => setShowBatteryModal(true)} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/40 rounded-lg transition-all cursor-pointer group shadow-sm text-left relative overflow-hidden"
                  title={t('battery.button_tooltip')}
                >
                  <div className="flex items-center gap-2">
                    {batteryStatus?.present === false ? (
                      <Plug size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    ) : batteryStatus?.isCharging ? (
                      <div className="relative flex items-center">
                        <BatteryCharging size={18} className="text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
                      </div>
                    ) : batteryStatus?.acConnected ? (
                      <div className="relative flex items-center">
                        <Battery size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <Zap size={9} className="absolute -top-1 -right-1 text-amber-400 fill-amber-400" />
                      </div>
                    ) : (batteryStatus?.percentage ?? batteryLevel ?? 100) <= 20 ? (
                      <BatteryWarning size={18} className="text-red-400 group-hover:scale-110 transition-transform animate-bounce" />
                    ) : (
                      <Battery size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    )}

                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="text-xs font-mono font-bold text-zinc-100">
                          {batteryStatus?.percentage !== null && batteryStatus?.percentage !== undefined
                            ? `${batteryStatus.percentage}%`
                            : batteryLevel !== null
                            ? `${batteryLevel}%`
                            : t('battery.ac_power')}
                        </span>

                        {/* Badge Moyenne 5s */}
                        {batteryStatus?.present !== false && (
                          <span 
                            className="text-[8px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.2 rounded flex items-center gap-0.5"
                            title={`Moyenne mobile calculée sur les 5 dernières secondes (${batterySampleCount} mesures)`}
                          >
                            <span className={`inline-block w-1 h-1 rounded-full bg-emerald-400 ${isBatteryUpdating ? 'animate-ping' : ''}`} />
                            <span>{t('battery.avg_5s')}</span>
                          </span>
                        )}

                        {/* Badge Durée estimée ou Statut */}
                        {batteryStatus?.present !== false && (
                          <span className={`text-[9px] font-mono font-semibold flex items-center gap-0.5 px-1 py-0.2 rounded ${
                            batteryDurationInfo.type === 'charging'
                              ? 'text-amber-300 bg-amber-950/60 border border-amber-500/30'
                              : batteryDurationInfo.type === 'discharging'
                              ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/30'
                              : batteryDurationInfo.type === 'full'
                              ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/30'
                              : 'text-zinc-400 bg-zinc-900 border border-zinc-800'
                          }`}>
                            {batteryDurationInfo.type === 'charging' ? (
                              <Zap size={8} className="fill-amber-400 animate-pulse shrink-0" />
                            ) : batteryDurationInfo.type === 'discharging' ? (
                              <Clock size={8} className="shrink-0" />
                            ) : null}
                            <span>{batteryDurationInfo.badge}</span>
                          </span>
                        )}

                        {batteryStatus?.present === false && (
                          <span className="text-[9.5px] font-medium text-zinc-400">{t('battery.desktop_pc')}</span>
                        )}
                      </div>

                      {/* Santé de la batterie */}
                      {batteryStatus?.health !== null && batteryStatus?.health !== undefined && batteryStatus?.present !== false ? (
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 leading-tight mt-0.5">
                          <span>{t('battery.health')}</span>
                          <span className={`font-semibold ${batteryStatus.health >= 80 ? 'text-emerald-400' : batteryStatus.health >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {batteryStatus.health}%
                          </span>
                          {batteryDurationInfo.type === 'discharging' && batteryDurationInfo.minutes && (
                            <span className="text-[8.5px] text-zinc-500 hidden sm:inline">
                              {t('battery.remaining')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[8.5px] font-mono text-zinc-500 leading-tight">{t('battery.diagnostic_shortcut')}</span>
                      )}
                    </div>
                  </div>

                  <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 ml-1">B</kbd>
                </button>
              )}

              {/* Bluetooth */}
              {!config.hiddenTests?.bluetooth && (
                <button 
                  onClick={() => onExecute('Bluetooth', 'ms-actioncenter:controlcenter/bluetooth')} 
                  className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg transition-all cursor-pointer text-zinc-300 hover:text-blue-400 group"
                  title={t('hardware.bluetooth_tooltip')}
                >
                  <Bluetooth size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{t('hardware.bluetooth')}</span>
                </button>
              )}

              {/* WiFi */}
              {!config.hiddenTests?.wifi && (
                <button 
                  onClick={() => onExecute('Paramètres WiFi', 'ms-availablenetworks:')} 
                  className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg transition-all cursor-pointer text-zinc-300 hover:text-emerald-400 group"
                  title={t('hardware.wifi_tooltip')}
                >
                  <Wifi size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{t('hardware.wifi')}</span>
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* POWER BUTTONS DOCK (Bas) */}
      <div className="px-5 py-2 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between gap-2.5 shrink-0">
        <button 
          onClick={() => setConfirmAction({name: language === 'en' ? 'Shut Down System' : 'Fermer la machine', path: 'shutdown /s /t 0'})} 
          className="flex-1 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer group"
        >
          <Power size={15} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs">{t('power.shutdown')}</span>
        </button>

        <button 
          onClick={() => setConfirmAction({name: language === 'en' ? 'Standard Restart' : 'Redémarrage normal', path: 'shutdown /r /t 0'})} 
          className="flex-1 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 hover:border-amber-500 text-amber-300 hover:text-white font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer group"
        >
          <RotateCcw size={15} className="group-hover:rotate-180 transition-transform" />
          <span className="text-xs">{t('power.reboot')}</span>
        </button>

        <button 
          onClick={() => setConfirmAction({name: language === 'en' ? 'Reboot into UEFI BIOS' : 'Redémarrer dans le BIOS UEFI', path: 'shutdown /r /fw /t 0'})} 
          className="flex-1 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 hover:border-blue-500 text-blue-300 hover:text-white font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer group"
        >
          <Settings size={15} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs">{t('power.reboot_bios')}</span>
        </button>
      </div>

      {/* TERMINAL / DEBUG LOGS CONSOLE */}
      <div className="px-4 pb-2 pt-0.5 shrink-0">
        <DebugLogViewer 
          logs={debugLogs} 
          showModal={showLogsModal}
          onOpenModal={() => setShowLogsModal(true)}
          onCloseModal={() => setShowLogsModal(false)}
          onClearLogs={onClearLogs}
        />
      </div>

      {/* TOAST NOTIFICATION FLOATING PILL */}
      {toast && (
        <div className="fixed bottom-16 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className={`px-4 py-2 rounded-xl border shadow-2xl flex items-center space-x-2 text-xs font-semibold backdrop-blur-md ${
            toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-600 text-amber-200'
              : toast.type === 'info'
              ? 'bg-zinc-900/95 border-blue-500/50 text-blue-200'
              : 'bg-zinc-900/95 border-emerald-500/60 text-emerald-200'
          }`}>
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* POPUPS & MODALS EXISTANTES */}
      
      <Suspense fallback={null}>
      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
              <Power size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">{t('power.confirm_action')}</h3>
            <p className="text-xs text-zinc-300">
              {t('power.confirm_prompt')} <br/>
              <strong className="text-emerald-400 text-sm font-mono mt-1 block">{confirmAction.name}</strong> ?
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button 
                onClick={() => setConfirmAction(null)} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => {
                  onExecute(confirmAction.name, confirmAction.path);
                  setConfirmAction(null);
                }} 
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BIOS Report Dialog */}
      {biosReport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              {language === 'en' ? 'BIOS / Firmware Installation Report' : 'Rapport d\'Installation BIOS / Firmware'}
            </h3>
            <div className="text-xs font-mono text-zinc-300 whitespace-pre-wrap bg-zinc-950 p-4 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto leading-relaxed">
              {biosReport}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setBiosReport(null)} 
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / Guide d'utilisation Modal */}
      {showHelpModal && (
        <HelpModal
          isOpen={showHelpModal}
          initialTab={helpTab}
          onClose={() => setShowHelpModal(false)}
          onOpenNasModal={() => setShowNasModal(true)}
          onOpenWuModal={() => setShowWuModal(true)}
          onOpenBiosModal={() => setShowBiosModal(true)}
          onOpenScreenModal={() => setShowScreenTestModal(true)}
          onOpenCamMicModal={() => setShowCameraMicModal(true)}
        />
      )}

      {/* Drivers Main Hub Modal */}
      {showDriversModal && (
        <DriversModal
          config={config}
          onExecute={onExecute}
          onClose={() => setShowDriversModal(false)}
          onOpenNasModal={() => setShowNasModal(true)}
          onOpenWuModal={() => setShowWuModal(true)}
          missingDriversCount={missingDriversCount}
        />
      )}

      {/* Windows Update Detailed Foreground Modal */}
      {showWuModal && (
        <WindowsUpdateModal
          isOpen={showWuModal}
          onClose={() => setShowWuModal(false)}
          config={config}
          onRebootRequest={() => onExecute('Redémarrage', 'shutdown -r -t 0')}
        />
      )}

      {/* NAS / USB Drivers Detailed Foreground Modal */}
      {showNasModal && (
        <NasDriversModal
          isOpen={showNasModal}
          onClose={() => setShowNasModal(false)}
          config={config}
          onOpenConfig={onOpenConfig}
          detectedModel={parsedSpecs.model}
          sysInfo={sysInfo}
          isAdmin={isAdmin}
          batteryStatus={batteryStatus}
        />
      )}

      {/* BIOS & Firmware Flash Detailed Foreground Modal */}
      {showBiosModal && (
        <BiosUpdateModal
          isOpen={showBiosModal}
          onClose={() => setShowBiosModal(false)}
          config={config}
          autoStart={true}
          autoReboot={biosAutoReboot}
          onAutoRebootChange={handleToggleBiosAutoReboot}
          onRebootRequest={() => onExecute('Redémarrage', 'shutdown -r -t 0')}
          initialMode={biosModalInitialMode}
        />
      )}

      {showCameraMicModal && (
        <CameraMicModal
          onClose={() => setShowCameraMicModal(false)}
        />
      )}

      {showScreenTestModal && (
        <ScreenTestModal
          onClose={() => setShowScreenTestModal(false)}
        />
      )}

      {showBatteryModal && (
        <BatteryHealthModal
          isOpen={showBatteryModal}
          onClose={() => setShowBatteryModal(false)}
          battery={batteryStatus}
          onRefreshBattery={refreshBattery}
          isUpdating={isBatteryUpdating}
          sampleCount={batterySampleCount}
        />
      )}

      {showSecurityGuideModal && (
        <SecurityGuideModal
          isOpen={showSecurityGuideModal}
          onClose={() => setShowSecurityGuideModal(false)}
          securityStatus={securityStatus}
          onRefresh={async () => {
            if (onRefreshSecurity) {
              await onRefreshSecurity();
            } else if (onRefresh) {
              await onRefresh();
            }
          }}
          detectedModel={`${getSysValue(['Fabricant', 'manufacturer', 'Marque', 'Constructeur'])} ${parsedSpecs.model}`}
        />
      )}
      </Suspense>

    </div>
  );
}

function SpecRow({ 
  label, 
  value, 
  isHighlight = false, 
  highlightColor = 'amber',
  onCopy, 
  isCopied 
}: { 
  label: string; 
  value: string; 
  isHighlight?: boolean;
  highlightColor?: 'amber' | 'emerald';
  onCopy?: () => void; 
  isCopied?: boolean;
}) {
  const { language, t } = useLanguage();
  const isLoading = value === 'Chargement...' || value === 'Loading...' || value === t('common.loading') || value === '...' || value === '';
  const isAvailable = !isLoading && value !== 'N/A';
  const displayValue = isLoading 
    ? t('common.loading') 
    : value === 'N/A' 
    ? t('common.not_specified') 
    : value;

  return (
    <div className="group flex items-center justify-between px-2 py-1 rounded-lg hover:bg-zinc-800/60 transition-colors">
      <span className="text-xs font-medium text-zinc-400 w-1/3 truncate" title={label}>
        {label}
      </span>
      <div className="w-2/3 flex items-center justify-end space-x-2">
        <span 
          className={`text-xs font-mono truncate text-right ${
            !isAvailable
              ? 'text-zinc-500 italic font-sans'
              : isHighlight
                ? highlightColor === 'amber'
                  ? 'font-bold text-amber-400'
                  : 'font-bold text-emerald-400'
                : 'font-semibold text-zinc-100'
          }`} 
          title={displayValue}
        >
          {displayValue}
        </span>
        {onCopy && isAvailable && (
          <button
            onClick={onCopy}
            className="text-zinc-500 hover:text-emerald-400 p-1 rounded transition-colors cursor-pointer shrink-0"
            title={`${t('specs.copy_spec')} ${label}`}
          >
            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function TestActionButton({ icon, title, subtitle, shortcutKey, onClick }: { 
  icon: ReactNode; 
  title: string; 
  subtitle: string; 
  shortcutKey?: string;
  onClick: () => void;
  key?: string | number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-zinc-900 group-hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h4 className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">{title}</h4>
            {shortcutKey && (
              <kbd className="text-[9px] font-mono font-bold bg-zinc-900 text-zinc-500 px-1 py-0.2 rounded border border-zinc-800 group-hover:border-zinc-700 group-hover:text-zinc-300 transition-colors">
                {shortcutKey}
              </kbd>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <Play size={13} className="text-zinc-600 group-hover:text-emerald-400 transition-colors transform group-hover:translate-x-0.5 shrink-0 ml-1" />
    </button>
  );
}
