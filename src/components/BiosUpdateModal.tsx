import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, AlertTriangle, CheckCircle2, RefreshCw, 
  RotateCcw, Terminal, Power, ShieldCheck, Copy, Check, 
  Battery, Laptop, Cpu, DownloadCloud, Sparkles, Filter, 
  ChevronDown, ChevronUp, FolderOpen, FileCode, Play,
  Layers, ArrowRight, FileText
} from 'lucide-react';
import { AppConfig, DriverLogEntry, WindowsUpdateDriver } from '../types';
import { hardwareAPI } from '../lib/tauriAdapter';
import { useLanguage } from '../i18n/LanguageContext';
import { translateLogMessage } from '../lib/logTranslator';

export type BiosUpdateMode = 'choice' | 'wu' | 'manual';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  autoStart?: boolean;
  autoReboot?: boolean;
  onAutoRebootChange?: (enabled: boolean) => void;
  onRebootRequest?: () => void;
  initialMode?: BiosUpdateMode;
}

export default function BiosUpdateModal({ 
  isOpen, 
  onClose, 
  config: _config, 
  autoStart: _autoStart = true, 
  autoReboot = false,
  onAutoRebootChange,
  onRebootRequest,
  initialMode = 'choice'
}: Props) {
  const { language, t } = useLanguage();
  const [currentMode, setCurrentMode] = useState<BiosUpdateMode>(initialMode);
  
  // Windows Update state
  const [firmwares, setFirmwares] = useState<WindowsUpdateDriver[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [executionFinished, setExecutionFinished] = useState(false);
  const [updateApplied, setUpdateApplied] = useState(false);
  const [localAutoReboot, setLocalAutoReboot] = useState(autoReboot);
  const [forceSameVersion, setForceSameVersion] = useState(false);
  const [_searchDone, setSearchDone] = useState(false);

  // Manual File state
  const [manualFilePath, setManualFilePath] = useState<string>('');
  const [isManualRunning, setIsManualRunning] = useState(false);
  const [manualFinished, setManualFinished] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  // Shared state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [logs, setLogs] = useState<DriverLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [copied, setCopied] = useState(false);

  // Machine info summary state
  const [detectedModel, setDetectedModel] = useState<string>('');
  const [detectedBios, setDetectedBios] = useState<string>('');
  const [detectedPower, setDetectedPower] = useState<string>('');

  const logEndRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<any>(null);
  const rebootExecutedRef = useRef(false);

  useEffect(() => {
    setLocalAutoReboot(autoReboot);
  }, [autoReboot]);

  // Load basic system info once modal opens
  useEffect(() => {
    if (isOpen) {
      hardwareAPI.getSysInfo(false)
        .then(sys => {
          if (sys) {
            setDetectedModel(sys['Modèle :'] || sys['model'] || 'Ordinateur');
            setDetectedBios(sys['Version de Bios :'] || sys['bios'] || 'N/A');
          }
        })
        .catch(() => {});

      hardwareAPI.getBatteryStatus()
        .then(batt => {
          if (batt) {
            const pwr = batt.acConnected 
              ? (language === 'en' ? 'On AC Power' : 'Sur secteur (AC Connecté)') 
              : (language === 'en' ? `On Battery (${batt.percentage || 0}%)` : `Sur batterie (${batt.percentage || 0}%)`);
            setDetectedPower(pwr);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, language]);

  const toggleAutoReboot = (val: boolean) => {
    setLocalAutoReboot(val);
    if (onAutoRebootChange) {
      onAutoRebootChange(val);
    }
    if (!val) {
      cancelCountdown();
      addLog('info', language === 'en' ? 'Automatic reboot countdown cancelled by user.' : 'Compte à rebours de redémarrage automatique annulé par l\'utilisateur.');
    }
  };

  const addLog = (level: DriverLogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  };

  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  const executeReboot = () => {
    if (rebootExecutedRef.current) return;
    rebootExecutedRef.current = true;
    cancelCountdown();

    addLog('cmd', 'Lancement de la commande de redémarrage de la machine (shutdown -r -t 0)...');
    if (onRebootRequest) {
      onRebootRequest();
    } else {
      hardwareAPI.executeAction('Redémarrage', 'shutdown -r -t 0');
    }
  };

  const startAutoRebootCountdown = () => {
    cancelCountdown();
    let timeLeft = 6;
    setCountdown(timeLeft);
    addLog('warning', `🔄 Redémarrage automatique programmé dans ${timeLeft} secondes...`);

    const intervalId = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(intervalId);
        if (countdownIntervalRef.current === intervalId) {
          countdownIntervalRef.current = null;
        }
        setCountdown(0);
        executeReboot();
      } else {
        setCountdown(timeLeft);
      }
    }, 1000);

    countdownIntervalRef.current = intervalId;
  };

  const handleCloseModal = () => {
    cancelCountdown();
    onClose();
  };

  const copyLogsToClipboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = logs.map(l => `[${l.timestamp}] ${translateLogMessage(l.message, language)}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Perform search for available BIOS & Firmware updates via Windows Update
  const searchBiosUpdates = async (force: boolean = forceSameVersion) => {
    setIsSearching(true);
    setSearchDone(false);
    setExecutionFinished(false);
    setUpdateApplied(false);
    setLogs([]);
    cancelCountdown();

    addLog('cmd', '========================================================================');
    addLog('cmd', '🔍 RECHERCHE DES FIRMWARES & BIOS DISPONIBLES (WINDOWS UPDATE / UEFI)');
    addLog('cmd', '========================================================================');

    try {
      // 1. Fetch system details
      const sys = await hardwareAPI.getSysInfo(false).catch(() => ({}));
      const currentBios = sys['Version de Bios :'] || sys['bios'] || 'N/A';
      const model = sys['Modèle :'] || sys['model'] || 'Ordinateur';
      setDetectedModel(model);
      setDetectedBios(currentBios);
      addLog('info', `Matériel : ${model} | Version BIOS active : ${currentBios}`);

      // Power check
      const batt = await hardwareAPI.getBatteryStatus().catch(() => null);
      if (batt) {
        const pwr = batt.acConnected ? 'Sur secteur (AC Connecté)' : `Sur batterie (${batt.percentage}%)`;
        setDetectedPower(pwr);
        if (!batt.acConnected) {
          addLog('warning', '⚠️ Attention : L\'ordinateur est sur batterie. Veuillez brancher le chargeur secteur avant de flasher le BIOS.');
        }
      }

      // 2. Query Windows Update specifically for firmware
      addLog('info', `Interrogation de Microsoft Update Catalog... (Mode Force/Toutes versions : ${force ? 'OUI' : 'NON'})`);
      const results = await hardwareAPI.searchWindowsUpdateDrivers(true, force);

      setFirmwares(results);
      // Auto-select pending or new updates
      const pendingIds = results.filter(f => !f.isInstalled).map(f => f.id);
      setSelectedIds(pendingIds.length > 0 ? pendingIds : results.map(f => f.id));
      setSearchDone(true);

      if (results.length === 0) {
        addLog('success', '✅ Aucun nouveau firmware BIOS trouvé sur Windows Update. Le BIOS est à jour.');
      } else {
        addLog('success', `✨ ${results.length} package(s) de firmware BIOS identifié(s) :`);
        results.forEach((f, idx) => {
          const statusTxt = f.isInstalled ? '[Actuellement Installé]' : '[Mise à jour disponible]';
          addLog('info', `  [${idx + 1}/${results.length}] ${f.title} ${statusTxt}`);
        });
      }
    } catch (err: any) {
      addLog('error', `Échec lors de la recherche des firmwares : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Switch mode helper
  const switchToMode = (mode: BiosUpdateMode) => {
    setCurrentMode(mode);
    cancelCountdown();
    if (mode === 'wu' && firmwares.length === 0 && !isSearching) {
      searchBiosUpdates(forceSameVersion);
    }
  };

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      cancelCountdown();
      rebootExecutedRef.current = false;
      setCurrentMode(initialMode);
      if (initialMode === 'wu') {
        searchBiosUpdates(forceSameVersion);
      }
    } else {
      cancelCountdown();
    }
  }, [isOpen, initialMode]);

  const toggleSelect = (id: string) => {
    if (isInstalling) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (isInstalling) return;
    if (selectedIds.length === firmwares.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(firmwares.map((f) => f.id));
    }
  };

  // Install selected firmware via Windows Update
  const handleInstallSelected = async () => {
    if (selectedIds.length === 0 || isInstalling) return;

    setIsInstalling(true);
    setExecutionFinished(false);
    setUpdateApplied(false);
    cancelCountdown();

    addLog('cmd', '========================================================================');
    addLog('cmd', `🚀 DÉMARRAGE DU FLASHAGE BIOS / FIRMWARE (${selectedIds.length} sélectionné(s))...`);
    addLog('cmd', '========================================================================');

    try {
      addLog('info', 'Préparation du composant Windows Update Installer COM...');
      const res = await hardwareAPI.installWindowsUpdateDrivers(selectedIds, localAutoReboot);
      const outputText = typeof res === 'string' ? res : ((res as any)?.output || '');

      if (outputText) {
        outputText.split('\n').forEach((line) => {
          const l = line.trim();
          if (!l) return;
          if (l.includes('ERREUR') || l.includes('Échec')) {
            addLog('error', l);
          } else if (l.includes('Succès') || l.includes('réussie') || l.includes('Flash Préparé')) {
            addLog('success', l);
          } else if (l.startsWith('Traitement') || l.startsWith('INFO:')) {
            addLog('info', l);
          } else {
            addLog('info', l);
          }
        });
      }

      const isSuccess = !outputText.includes('ERREUR') && !outputText.includes('ERROR:');

      if (isSuccess) {
        setUpdateApplied(true);
        addLog('success', '🎉 Firmware(s) BIOS UEFI installé(s) et programmé(s) avec succès.');

        setFirmwares((prev) =>
          prev.map((f) => (selectedIds.includes(f.id) ? { ...f, status: 'installed', isInstalled: true } : f))
        );

        if (localAutoReboot) {
          startAutoRebootCountdown();
        } else {
          addLog('warning', '⚠️ Un redémarrage de la machine est requis pour que le BIOS s\'applique au niveau UEFI.');
        }
      } else {
        addLog('error', '❌ Échec ou avertissement lors de l\'installation du firmware.');
      }
    } catch (err: any) {
      addLog('error', `❌ Erreur critique : ${err.message || 'Impossible d\'exécuter l\'installation du firmware'}`);
    } finally {
      setIsInstalling(false);
      setExecutionFinished(true);
    }
  };

  // File Picker for Manual Mode
  const handleBrowseManualFile = async () => {
    try {
      const selected = await hardwareAPI.selectBiosFile();
      if (selected) {
        setManualFilePath(selected);
        setManualFinished(false);
        setManualSuccess(false);
        addLog('info', `Fichier BIOS sélectionné : ${selected}`);
      }
    } catch (err: any) {
      addLog('error', `Erreur lors de la sélection du fichier : ${err.message || String(err)}`);
    }
  };

  // Launch manual BIOS file execution
  const handleExecuteManualBios = async () => {
    if (!manualFilePath.trim() || isManualRunning) return;

    setIsManualRunning(true);
    setManualFinished(false);
    setManualSuccess(false);
    cancelCountdown();

    const cleanPath = manualFilePath.trim();
    const ext = cleanPath.split('.').pop()?.toLowerCase() || '';

    addLog('cmd', '========================================================================');
    addLog('cmd', `🚀 DÉMARRAGE DE LA MISE À JOUR BIOS MANUELLE`);
    addLog('cmd', `📁 Fichier cible : ${cleanPath}`);
    addLog('cmd', '========================================================================');

    // Method description
    let methodDesc = "Exécutable d'installation BIOS constructeur";
    if (ext === 'inf') methodDesc = 'Capsule UEFI injectée via PnPUtil';
    else if (ext === 'bat' || ext === 'cmd' || ext === 'ps1') methodDesc = 'Script de flashage automatisé';
    else if (['cap', 'bin', 'rom', 'bio', 'fd'].includes(ext)) methodDesc = 'Image firmware capsule brute';

    addLog('info', `Type détecté : ${ext.toUpperCase()} (${methodDesc})`);
    addLog('info', 'Élévation de privilèges administrateur (RunAs)...');

    try {
      const res = await hardwareAPI.installManualBiosFile(cleanPath, localAutoReboot);
      
      if (res.report) {
        res.report.split('\n').forEach((line) => {
          const l = line.trim();
          if (!l) return;
          if (l.includes('Erreur') || l.includes('ERREUR') || l.includes('Échec') || l.includes('ERROR:')) {
            addLog('error', l);
          } else if (l.includes('succès') || l.includes('terminée avec succès') || l.includes('exécuté')) {
            addLog('success', l);
          } else {
            addLog('info', l);
          }
        });
      }

      if (res.success) {
        setManualSuccess(true);
        addLog('success', '🎉 Mise à jour BIOS manuelle exécutée avec succès !');

        if (localAutoReboot) {
          startAutoRebootCountdown();
        } else {
          addLog('warning', '⚠️ Un redémarrage est recommandé pour finaliser l\'application du microprogramme BIOS.');
        }
      } else {
        addLog('error', `❌ Échec du flashage manuel : ${res.error || 'Erreur d\'exécution'}`);
      }
    } catch (err: any) {
      addLog('error', `❌ Erreur critique : ${err.message || String(err)}`);
    } finally {
      setIsManualRunning(false);
      setManualFinished(true);
    }
  };

  // Helper for file type info badge
  const getFileTypeBadge = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'exe':
        return { 
          label: language === 'en' ? 'Executable (.exe)' : 'Exécutable (.exe)', 
          desc: language === 'en' ? 'Official HP / Dell / Lenovo / Insyde utility' : 'Utilitaire officiel HP / Dell / Lenovo / Insyde', 
          color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' 
        };
      case 'inf':
        return { 
          label: language === 'en' ? 'Capsule Driver (.inf)' : 'Pilote Capsule (.inf)', 
          desc: language === 'en' ? 'UEFI capsule deployed via PnPUtil' : 'Capsule UEFI déployée via PnPUtil', 
          color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40' 
        };
      case 'bat':
      case 'cmd':
      case 'ps1':
        return { 
          label: language === 'en' ? 'Flash Script' : 'Script de Flash', 
          desc: language === 'en' ? 'Command line automated flashing script' : 'Automatisation de flashage en ligne de commande', 
          color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/40' 
        };
      case 'cap':
      case 'bin':
      case 'rom':
      case 'bio':
      case 'fd':
        return { 
          label: language === 'en' ? 'Firmware Capsule' : 'Capsule Firmware', 
          desc: language === 'en' ? 'Raw UEFI binary for flash utility' : 'Binaire UEFI pour utilitaire de flashage', 
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40' 
        };
      default:
        return { 
          label: language === 'en' ? 'BIOS File' : 'Fichier BIOS', 
          desc: language === 'en' ? 'Update file' : 'Fichier de mise à jour', 
          color: 'text-zinc-400 bg-zinc-800 border-zinc-700' 
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        style={{ height: 'min(92vh, 760px)' }}
      >
        {/* Header */}
        <div className="bg-zinc-900/90 px-5 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  {language === 'en' ? 'BIOS & UEFI Firmware Update' : 'Mise à jour du BIOS & Firmware UEFI'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-full">
                  OPEQ Diagnostic
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {language === 'en' ? 'Secure motherboard firmware upgrade' : 'Mise à niveau sécurisée du microprogramme de la carte mère'}
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 space-x-1">
            <button
              onClick={() => switchToMode('choice')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentMode === 'choice'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
              title={language === 'en' ? 'Return to mode selection' : 'Retourner au choix du mode'}
            >
              <Layers size={13} />
              <span>{language === 'en' ? 'Select Mode' : 'Choix du mode'}</span>
            </button>

            <button
              onClick={() => switchToMode('wu')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentMode === 'wu'
                  ? 'bg-cyan-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
              title={language === 'en' ? 'Automatic update via Windows Update' : 'Mise à jour automatique par Windows Update'}
            >
              <DownloadCloud size={13} />
              <span>Windows Update</span>
            </button>

            <button
              onClick={() => switchToMode('manual')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentMode === 'manual'
                  ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
              title={language === 'en' ? 'Manual update by pointing to a file' : 'Mise à jour manuelle en pointant un fichier'}
            >
              <FolderOpen size={13} />
              <span>{language === 'en' ? 'Manual File' : 'Fichier Manuel'}</span>
            </button>
          </div>

          <button
            onClick={handleCloseModal}
            disabled={isInstalling || isManualRunning}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-30 shrink-0"
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Machine Info Bar */}
        <div className="bg-zinc-900/50 px-5 py-2 border-b border-zinc-850 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Laptop size={14} className="text-zinc-400 shrink-0" />
              <span className="text-zinc-500">{language === 'en' ? 'Machine:' : 'Machine :'}</span>
              <strong className="text-zinc-200">{detectedModel || (language === 'en' ? 'Detecting...' : 'Détection...')}</strong>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-300">
              <Cpu size={14} className="text-zinc-400 shrink-0" />
              <span className="text-zinc-500">{language === 'en' ? 'Current BIOS:' : 'BIOS actuel :'}</span>
              <strong className="text-amber-300 font-mono">{detectedBios || (language === 'en' ? 'Reading...' : 'En lecture...')}</strong>
            </div>
          </div>

          {detectedPower && (
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
              detectedPower.toLowerCase().includes('batterie') && !detectedPower.toLowerCase().includes('secteur')
                ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            }`}>
              <Battery size={13} className="shrink-0" />
              <span>{detectedPower}</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden min-h-0">

          {/* ========================================================================= */}
          {/* VIEW 1: CHOICE SCREEN (Windows Update VS Fichier Manuel)                  */}
          {/* ========================================================================= */}
          {currentMode === 'choice' && (
            <div className="flex-1 flex flex-col justify-center items-center p-4 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="text-center space-y-1.5 max-w-xl">
                <h3 className="text-base font-bold text-zinc-100 flex items-center justify-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  <span>{language === 'en' ? 'Choose BIOS Update Method' : 'Choisissez le mode de mise à jour du BIOS'}</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {language === 'en' ? 'Select the desired method to upgrade the BIOS and UEFI firmware of this machine.' : 'Sélectionnez la méthode souhaitée pour mettre à niveau le BIOS et microprogramme UEFI de cette machine.'}
                </p>
              </div>

              {/* 2 Big Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {/* Option 1: Windows Update */}
                <div 
                  onClick={() => switchToMode('wu')}
                  className="p-5 bg-zinc-900/70 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-500/80 rounded-2xl flex flex-col justify-between transition-all cursor-pointer group shadow-lg hover:shadow-cyan-950/30"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 group-hover:scale-105 transition-transform">
                        <DownloadCloud size={24} />
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                        {language === 'en' ? 'Official Catalog' : 'Catalogue Officiel'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                        <span>1. Windows Update</span>
                        <Sparkles size={13} className="text-cyan-400" />
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {language === 'en' 
                          ? 'Automatically search and download official manufacturer-certified UEFI firmwares from the Microsoft catalog.' 
                          : 'Recherche et télécharge automatiquement les microprogrammes UEFI officiels certifiés par le constructeur dans le catalogue Microsoft.'}
                      </p>
                    </div>

                    <ul className="space-y-1 text-[11px] text-zinc-400 pt-1">
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-cyan-400 shrink-0" />
                        <span>{language === 'en' ? 'Certified automatic search' : 'Recherche automatique certifiée'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-cyan-400 shrink-0" />
                        <span>{language === 'en' ? 'UEFI capsule & version analysis' : 'Analyse des versions & capsules UEFI'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-cyan-400 shrink-0" />
                        <span>{language === 'en' ? 'Ideal if the machine has Internet access' : 'Idéal si la machine a accès à Internet'}</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); switchToMode('wu'); }}
                    className="mt-5 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all group-hover:scale-[1.02] cursor-pointer"
                  >
                    <span>{language === 'en' ? 'Launch Windows Update' : 'Lancer Windows Update'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Option 2: Manual Update (Point a file) */}
                <div 
                  onClick={() => switchToMode('manual')}
                  className="p-5 bg-zinc-900/70 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-emerald-500/80 rounded-2xl flex flex-col justify-between transition-all cursor-pointer group shadow-lg hover:shadow-emerald-950/30"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        <FolderOpen size={24} />
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                        {language === 'en' ? 'Local / Network / USB' : 'Local / Réseau / USB'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                        <span>{language === 'en' ? '2. Manual Update' : '2. Mise à jour Manuelle'}</span>
                        <FileCode size={13} className="text-emerald-400" />
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {language === 'en'
                          ? 'Manually point to an executable file (.exe), UEFI capsule (.inf, .cap, .bin), or manufacturer script (HP, Dell, Lenovo).'
                          : 'Pointez manuellement vers un fichier exécutable (.exe), une capsule UEFI (.inf, .cap, .bin) ou un script constructeur (HP, Dell, Lenovo).'}
                      </p>
                    </div>

                    <ul className="space-y-1 text-[11px] text-zinc-400 pt-1">
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-400 shrink-0" />
                        <span>{language === 'en' ? 'Direct file explorer selection' : 'Sélection directe par explorateur de fichiers'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-400 shrink-0" />
                        <span>{language === 'en' ? 'Compatible with USB drives or network shares' : 'Compatible clés USB ou partage réseau'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-400 shrink-0" />
                        <span>{language === 'en' ? 'Runs with Administrator privileges' : 'Exécution avec privilèges Administrateur'}</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); switchToMode('manual'); }}
                    className="mt-5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all group-hover:scale-[1.02] cursor-pointer"
                  >
                    <span>{language === 'en' ? 'Select a file' : 'Pointer un fichier'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Safety notice in choice screen */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 max-w-lg text-center">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span>
                  {language === 'en' ? 'Ensure AC power is plugged in and do not power off the machine during flashing.' : 'Veillez à ce que l\'alimentation secteur soit branchée et ne pas éteindre la machine durant le flashage.'}
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: WINDOWS UPDATE AUTOMATIC VIEW                                    */}
          {/* ========================================================================= */}
          {currentMode === 'wu' && (
            <>
              {/* Controls Bar */}
              <div className="flex items-center justify-between bg-zinc-900/80 px-3.5 py-2 rounded-xl border border-zinc-800 shrink-0 text-xs">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={selectAll}
                    disabled={isInstalling || firmwares.length === 0}
                    className="text-amber-400 hover:text-amber-300 font-bold transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {selectedIds.length === firmwares.length && firmwares.length > 0 
                      ? (language === 'en' ? 'Deselect All' : 'Tout désélectionner') 
                      : (language === 'en' ? 'Select All' : 'Tout sélectionner')}
                  </button>
                  <span className="text-zinc-500">|</span>
                  <span className="text-zinc-400 font-mono">
                    {language === 'en' 
                      ? `${selectedIds.length} of ${firmwares.length} selected`
                      : `${selectedIds.length} sur ${firmwares.length} sélectionné(s)`}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => searchBiosUpdates(forceSameVersion)}
                    disabled={isInstalling || isSearching}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw size={12} className={isSearching ? 'animate-spin text-cyan-400' : ''} />
                    <span>{language === 'en' ? 'Rerun Search' : 'Relancer la recherche'}</span>
                  </button>

                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={forceSameVersion}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setForceSameVersion(val);
                        searchBiosUpdates(val);
                      }}
                      disabled={isInstalling || isSearching}
                      className="w-4 h-4 text-amber-500 bg-zinc-950 border-zinc-700 rounded focus:ring-amber-500 cursor-pointer accent-amber-500"
                    />
                    <span className="text-zinc-300 font-medium flex items-center gap-1">
                      <Filter size={12} className="text-amber-400" />
                      {language === 'en' ? 'Show / Force identical versions' : 'Afficher / Forcer versions identiques'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Firmware Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar min-h-[140px] max-h-[220px]">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-zinc-400 space-y-3 bg-zinc-950/40 rounded-xl border border-zinc-900">
                    <RefreshCw size={24} className="animate-spin text-cyan-400" />
                    <p className="text-xs font-mono">{language === 'en' ? 'Searching for BIOS firmware updates on Windows Update...' : 'Recherche des mises à jour du microprogramme BIOS sur Windows Update...'}</p>
                  </div>
                ) : firmwares.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-zinc-400 space-y-2 bg-zinc-950/40 rounded-xl border border-zinc-900 text-center">
                    <ShieldCheck size={28} className="text-emerald-400" />
                    <p className="text-sm font-bold text-zinc-200">{language === 'en' ? 'Your system BIOS is completely up to date' : 'Le BIOS de votre système est parfaitement à jour'}</p>
                    <p className="text-xs text-zinc-500 max-w-md">
                      {language === 'en'
                        ? 'No new version required on Windows Update. You can also choose the "Manual File" option if you have a specific installer.'
                        : 'Aucune nouvelle version requise sur Windows Update. Vous pouvez aussi choisir l\'option « Fichier Manuel » si vous avez un installeur spécifique.'}
                    </p>
                  </div>
                ) : (
                  firmwares.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${
                          isSelected
                            ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={isInstalling}
                          className="mt-1 w-4 h-4 text-amber-500 bg-zinc-950 border-zinc-700 rounded focus:ring-amber-500 cursor-pointer accent-amber-500 shrink-0"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-zinc-100 truncate flex items-center gap-1.5">
                              <Zap size={13} className="text-amber-400 shrink-0" />
                              {item.title}
                            </h4>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.isInstalled ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-950/60 border border-blue-600/40 text-blue-300">
                                  {language === 'en' ? 'Already Installed' : 'Déjà Installé'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 flex items-center gap-1">
                                  <Sparkles size={10} /> {language === 'en' ? 'Recommended' : 'Recommandé'}
                                </span>
                              )}

                              {item.status === 'installed' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                                  {language === 'en' ? 'Flash Prepared' : 'Flash Préparé'}
                                </span>
                              )}
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-1">{item.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500 font-mono pt-0.5">
                            {item.version && <span>Version: <strong className="text-zinc-300">{item.version}</strong></span>}
                            {item.releaseDate && <span>Date: <strong className="text-zinc-300">{item.releaseDate}</strong></span>}
                            {item.provider && <span>{language === 'en' ? 'Publisher:' : 'Éditeur:'} <strong className="text-zinc-300">{item.provider}</strong></span>}
                            <span>{language === 'en' ? 'Category:' : 'Catégorie:'} <strong className="text-amber-400/80">{item.category || 'Firmware UEFI'}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: MANUAL FILE SPECIFICATION VIEW                                    */}
          {/* ========================================================================= */}
          {currentMode === 'manual' && (
            <div className="space-y-3 shrink-0">
              {/* File Pointer Panel */}
              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
                    <FolderOpen size={16} className="text-emerald-400" />
                    <span>{language === 'en' ? 'Select BIOS file to flash' : 'Sélectionner le fichier du BIOS à flasher'}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    .exe, .inf, .bat, .cmd, .ps1, .cap, .bin
                  </span>
                </div>

                {/* Input & Browse Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={manualFilePath}
                      onChange={(e) => {
                        setManualFilePath(e.target.value);
                        setManualFinished(false);
                      }}
                      placeholder={language === 'en' ? 'Full path to BIOS file (e.g. C:\\Drivers\\sp143212.exe or \\\\nas-server\\BIOS\\bios.exe)...' : 'Chemin complet du fichier BIOS (ex: C:\\Drivers\\sp143212.exe ou \\\\serveur-nas\\BIOS\\bios.exe)...'}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-emerald-500 pr-9"
                    />
                    {manualFilePath && (
                      <button
                        onClick={() => setManualFilePath('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded-md"
                        title={language === 'en' ? 'Clear path' : 'Effacer le chemin'}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleBrowseManualFile}
                    disabled={isManualRunning}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-zinc-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <FolderOpen size={15} />
                    <span>{language === 'en' ? 'Browse...' : 'Parcourir...'}</span>
                  </button>
                </div>

                {/* Selected File Details Box */}
                {manualFilePath.trim() ? (
                  <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-200 truncate font-mono">
                          {manualFilePath.split(/[/\\]/).pop()}
                        </div>
                        <div className="text-[10.5px] text-zinc-400 truncate">
                          {getFileTypeBadge(manualFilePath).desc}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getFileTypeBadge(manualFilePath).color}`}>
                        {getFileTypeBadge(manualFilePath).label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
                    {language === 'en' ? (
                      <>Click <strong>« Browse... »</strong> to choose a manufacturer executable (e.g. HP System BIOS Update, Dell Update Package) or a firmware driver package.</>
                    ) : (
                      <>Cliquez sur <strong>« Parcourir... »</strong> pour choisir un exécutable constructeur (ex: HP System BIOS Update, Dell Update Package) ou un package de pilote firmware.</>
                    )}
                  </div>
                )}
              </div>

              {/* Safety banner for manual update */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-amber-300/90">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong>{language === 'en' ? 'Important safety instructions:' : 'Consignes de sécurité importantes :'}</strong>
                  <p className="text-[11px] text-zinc-400">
                    {language === 'en' ? (
                      <>
                        • The computer must be plugged into AC power. Never disconnect power during flashing.<br/>
                        • After launch, allow the manufacturer program to finish. The system will restart to flash the UEFI.
                      </>
                    ) : (
                      <>
                        • L'ordinateur doit être branché sur son chargeur secteur AC. Ne débranchez jamais l'alimentation pendant le flashage.<br/>
                        • Après le lancement, laissez le programme du fabricant se terminer. Le système redémarrera pour programmer l'UEFI.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SHARED CONSOLE LOG PANEL (Visible in WU and Manual modes)                 */}
          {/* ========================================================================= */}
          {currentMode !== 'choice' && (
            <div className="flex-1 flex flex-col min-h-0 bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
              <div 
                onClick={() => setShowLogs(!showLogs)}
                className="bg-zinc-900/90 px-3.5 py-1.5 flex items-center justify-between border-b border-zinc-800 text-xs font-mono cursor-pointer hover:bg-zinc-800/80 transition-colors"
              >
                <div className="flex items-center space-x-2 text-zinc-400">
                  <Terminal size={14} className="text-amber-400" />
                  <span className="font-semibold text-zinc-200">{language === 'en' ? 'Execution Log & UEFI Flashing' : 'Journal d\'exécution & flashage UEFI'}</span>
                  <span className="text-zinc-500">({logs.length} {language === 'en' ? 'entries' : 'entrées'})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyLogsToClipboard}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? (language === 'en' ? 'Copied' : 'Copié') : (language === 'en' ? 'Copy' : 'Copier')}</span>
                  </button>
                  {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {showLogs && (
                <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1 custom-scrollbar select-text">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                      {currentMode === 'wu' 
                        ? (language === 'en' ? 'Ready. Select a firmware and click "Install Selection".' : 'Prêt. Sélectionnez un firmware et cliquez sur « Installer la sélection ».')
                        : (language === 'en' ? 'Ready. Select a BIOS update file then click "Execute Manual Flash".' : 'Prêt. Sélectionnez un fichier de mise à jour BIOS puis cliquez sur « Exécuter le flashage manuel ».')}
                    </div>
                  ) : (
                    logs.map((log, index) => {
                      let color = 'text-zinc-300';
                      if (log.level === 'success') color = 'text-emerald-400 font-semibold';
                      if (log.level === 'warning') color = 'text-amber-400 font-medium';
                      if (log.level === 'error') color = 'text-rose-400 font-bold';
                      if (log.level === 'cmd') color = 'text-cyan-400 font-semibold';

                      return (
                        <div key={index} className="flex space-x-2 leading-relaxed break-all">
                          <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                          <span className={color}>{translateLogMessage(log.message, language)}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Auto Reboot Countdown Banner */}
          {countdown !== null && countdown > 0 && (
            <div className="p-2.5 bg-amber-950/80 border border-amber-500/50 rounded-xl flex items-center justify-between animate-in fade-in shrink-0">
              <div className="flex items-center space-x-2 text-xs text-amber-200">
                <RotateCcw size={16} className="animate-spin text-amber-400" />
                <span>
                  <strong>{language === 'en' ? 'UEFI flash prepared successfully!' : 'Flash UEFI préparé avec succès !'}</strong> {language === 'en' ? `Auto-restart in ${countdown}s to flash BIOS...` : `Redémarrage automatique dans ${countdown}s pour flasher le BIOS...`}
                </span>
              </div>
              <button
                onClick={cancelCountdown}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Cancel countdown' : 'Annuler le compte à rebours'}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-zinc-900/95 px-5 py-3 flex items-center justify-between border-t border-zinc-800 shrink-0">
          {/* Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="biosAutoRebootOption"
                checked={localAutoReboot}
                onChange={(e) => toggleAutoReboot(e.target.checked)}
                disabled={isInstalling || isManualRunning}
                className="w-4 h-4 text-amber-500 bg-zinc-950 border-zinc-700 rounded focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <span className="text-xs text-zinc-300 font-medium">
                {language === 'en' ? 'Automatically restart after flashing' : 'Redémarrer automatiquement après le flashage'}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Immediate Reboot Button if update ready */}
            {(updateApplied || manualSuccess) && (
              <button
                onClick={executeReboot}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer"
                title={language === 'en' ? 'Restart computer now' : 'Redémarrer immédiatement l\'ordinateur'}
              >
                <Power size={14} />
                <span>{language === 'en' ? 'Restart Now' : 'Redémarrer maintenant'}</span>
              </button>
            )}

            {/* WU Install Button */}
            {currentMode === 'wu' && (
              <button
                onClick={handleInstallSelected}
                disabled={isInstalling || selectedIds.length === 0 || executionFinished}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all ${
                  executionFinished && updateApplied
                    ? 'bg-emerald-700/90 text-emerald-100 cursor-not-allowed border border-emerald-500/40 pointer-events-none'
                    : isInstalling
                    ? 'bg-cyan-600 text-white opacity-80 cursor-wait'
                    : 'bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-zinc-950 cursor-pointer disabled:opacity-40 disabled:pointer-events-none'
                }`}
              >
                {isInstalling ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{language === 'en' ? 'Flashing in progress...' : 'Flashage en cours...'}</span>
                  </>
                ) : executionFinished ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span>{updateApplied ? (language === 'en' ? 'Flash prepared' : 'Flashage préparé') : (language === 'en' ? 'Finished (with errors)' : 'Terminé (Erreurs)')}</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud size={14} />
                    <span>{language === 'en' ? `Install Selection (${selectedIds.length})` : `Installer la sélection (${selectedIds.length})`}</span>
                  </>
                )}
              </button>
            )}

            {/* Manual Flash Button */}
            {currentMode === 'manual' && (
              <button
                onClick={handleExecuteManualBios}
                disabled={isManualRunning || !manualFilePath.trim()}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all ${
                  manualFinished && manualSuccess
                    ? 'bg-emerald-700/90 text-emerald-100 border border-emerald-500/40 cursor-pointer'
                    : isManualRunning
                    ? 'bg-emerald-600 text-white opacity-80 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-zinc-950 cursor-pointer disabled:opacity-40 disabled:pointer-events-none'
                }`}
              >
                {isManualRunning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{language === 'en' ? 'Executing flash...' : 'Exécution du flash...'}</span>
                  </>
                ) : manualFinished && manualSuccess ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span>{language === 'en' ? 'Flashing finished (Success)' : 'Flashage terminé (Succès)'}</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-zinc-950" />
                    <span>{language === 'en' ? 'Execute Manual Flash' : 'Exécuter le flashage manuel'}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCloseModal}
              disabled={isInstalling || isManualRunning}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {t('common.close')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
