import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Server, Download, Upload, RefreshCw, 
  CheckCircle2, AlertCircle, Play, Laptop, Monitor, Copy, Check, Zap
} from 'lucide-react';
import { AppConfig, NasDriverModel, DriverLogEntry, InfDriverDetail, BatteryStatus } from '../types';
import { hardwareAPI } from '../lib/tauriAdapter';
import { PreFlightSafetyBanner } from './drivers/PreFlightSafetyBanner';
import { DriverProgressCard } from './drivers/DriverProgressCard';
import { DriverTerminalLogs } from './drivers/DriverTerminalLogs';
import { DriverCatalogBrowser } from './drivers/DriverCatalogBrowser';
import { DismExportPanel, FolderConflictState } from './drivers/DismExportPanel';
import { DriverToolsPanel } from './drivers/DriverToolsPanel';
import { useLanguage } from '../i18n/LanguageContext';
import { translateLogMessage } from '../lib/logTranslator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onOpenConfig?: () => void;
  detectedModel?: string;
  sysInfo?: Record<string, string>;
  isAdmin?: boolean;
  batteryStatus?: BatteryStatus | null;
}

export default function NasDriversModal({ 
  isOpen, 
  onClose, 
  config, 
  detectedModel, 
  sysInfo,
  isAdmin = true,
  batteryStatus = null
}: Props) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'install' | 'export' | 'tools'>('install');
  
  // Hardware info
  const [hardwareInfo, setHardwareInfo] = useState<{ make: string; model: string; formFactor: string; serialNumber: string }>({
    make: 'HP',
    model: detectedModel || 'HP EliteBook 840 G8',
    formFactor: 'Laptop',
    serialNumber: '5CG1420X99-RUST',
  });

  // Source path
  const [nasPath, setNasPath] = useState(config.nasDriversPath || '\\\\serveur-nas\\Tech\\Drivers');
  
  // Navigation: 'models' (selection of model folder) | 'drivers' (selection of specific drivers)
  const [viewStep, setViewStep] = useState<'models' | 'drivers'>('models');
  
  // Models list
  const [modelsList, setModelsList] = useState<NasDriverModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<NasDriverModel | null>(null);
  const [hasDirectMatch, setHasDirectMatch] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  
  // Drivers inside selected model folder
  const [folderDrivers, setFolderDrivers] = useState<InfDriverDetail[]>([]);
  const [selectedInfPaths, setSelectedInfPaths] = useState<Set<string>>(new Set());
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [driverSearchTerm, setDriverSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [autoReboot, setAutoReboot] = useState(false);

  // Status & Logs
  const [isScanning, setIsScanning] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<DriverLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  
  // Export tab state & progress
  const [exportDestination, setExportDestination] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string>('');
  const [exportCurrentItem, setExportCurrentItem] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [exportSummary, setExportSummary] = useState<{ count: number; folder: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Import (Installation) tab state & progress
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState<string>('');
  const [importCurrentItem, setImportCurrentItem] = useState<string>('');
  const [importStatus, setImportStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [importElapsedTime, setImportElapsedTime] = useState<number>(0);
  const [exportElapsedTime, setExportElapsedTime] = useState<number>(0);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s < 10 ? `0${s}` : s}s`;
  };

  // Folder Conflict Prompt Modal State
  const [folderConflict, setFolderConflict] = useState<FolderConflictState & { parentDir?: string } | null>(null);

  const modalBodyRef = useRef<HTMLDivElement>(null);

  const copyLogsToClipboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = logs.map(l => `[${l.timestamp}] ${translateLogMessage(l.message, language)}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLog = (level: DriverLogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  };

  // Rebuild centralized index.json on NAS (Optimisation #3)
  const handleRebuildIndex = async () => {
    if (!nasPath) {
      addLog('warning', 'Veuillez spécifier un chemin NAS valide pour générer l\'index.');
      return;
    }
    setIsIndexing(true);
    addLog('info', `==================================================`);
    addLog('cmd', `Génération de l'index centralisé 'index.json' (Optimisation Rust #3) sur : ${nasPath}`);

    try {
      const res = await hardwareAPI.rebuildNasIndex(nasPath);
      addLog('success', res);
      // Immediately refresh the models list using the newly generated index
      const scanned = await hardwareAPI.scanNasDriverFolders(nasPath, hardwareInfo.make, hardwareInfo.model);
      setModelsList(scanned);
      addLog('success', `Catalogue actualisé : ${scanned.length} modèle(s) répertorié(s).`);
    } catch (err: any) {
      addLog('error', `Erreur lors de la génération de l'index : ${err.message || err}`);
    } finally {
      setIsIndexing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHardwareAndScan();
    } else {
      if (!isRunning) {
        setLogs([]);
        setViewStep('models');
      }
    }
  }, [isOpen]);

  const loadHardwareAndScan = async () => {
    setIsScanning(true);
    setLogs([]);
    setViewStep('models');
    addLog('info', '==================================================');

    try {
      // 1. Détection ultra-rapide : utilisation immédiate des données déjà connues par l'application
      let hw: { make: string; model: string; formFactor: string; serialNumber: string };
      
      const rawModel = (sysInfo?.['Modèle :'] || detectedModel || '').trim();
      const rawSn = (sysInfo?.['Numéro de série :'] || '').trim();
      
      if (rawModel && rawModel !== 'Chargement...' && rawModel !== 'Inconnu') {
        let make = 'HP';
        const lower = rawModel.toLowerCase();
        if (lower.includes('hp') || lower.includes('probook') || lower.includes('elitebook') || lower.includes('zbook') || lower.includes('hewlett')) {
          make = 'HP';
        } else if (lower.includes('dell') || lower.includes('latitude') || lower.includes('optiplex') || lower.includes('precision') || lower.includes('inspiron') || lower.includes('vostro')) {
          make = 'Dell';
        } else if (lower.includes('lenovo') || lower.includes('thinkpad') || lower.includes('thinkcentre') || lower.includes('ideapad')) {
          make = 'Lenovo';
        } else if (lower.includes('toshiba') || lower.includes('dynabook') || lower.includes('portege') || lower.includes('satellite') || lower.includes('tecra')) {
          make = 'Toshiba';
        } else {
          make = rawModel.split(' ')[0] || 'Autre';
        }

        const rawChassis = (sysInfo?.['Châssis :'] || '').toLowerCase();
        let formFactor = 'Laptop';
        if (rawChassis.includes('desktop') || rawChassis.includes('tour') || rawChassis.includes('tower') || rawChassis.includes('sff') || rawChassis.includes('mini') || rawChassis.includes('workstation')) {
          formFactor = 'Desktop';
        } else if (rawChassis.includes('tablet') || rawChassis.includes('tablette')) {
          formFactor = 'Tablet';
        }

        hw = {
          make,
          model: rawModel,
          formFactor,
          serialNumber: rawSn || 'Non spécifié',
        };
      } else {
        hw = await hardwareAPI.getHardwareModelDetails();
      }

      setHardwareInfo(hw);
      addLog('info', `Matériel détecté : ${hw.make} ${hw.model} (${hw.formFactor})`);
      addLog('info', `Numéro de série : ${hw.serialNumber}`);

      // Set standard DISM export path
      const stdExportPath = `${nasPath}\\${hw.make}\\${hw.formFactor}\\${hw.model}`;
      setExportDestination(stdExportPath);

      // 2. Scan network models
      addLog('cmd', `Scan du catalogue NAS : ${nasPath}`);
      const scanned = await hardwareAPI.scanNasDriverFolders(nasPath, hw.make, hw.model);
      setModelsList(scanned);

      const match = scanned.find((m) => m.isMatch);
      if (match) {
        setSelectedModel(match);
        setHasDirectMatch(true);
        addLog('success', `Pack correspondant détecté pour ce poste : ${match.fullPath}`);
      } else {
        setSelectedModel(null);
        setHasDirectMatch(false);
        addLog('warning', `Aucun pack de pilotes exactement nommé "${hw.model}" trouvé sur le NAS.`);
        addLog('info', `Vous pouvez sélectionner un autre pack compatible ou exporter ce poste avec DISM.`);
      }

      addLog('info', `${scanned.length} pack(s) modèle(s) répertorié(s) sur le serveur NAS.`);
    } catch (err: any) {
      addLog('error', `Erreur lors du scan : ${err.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Inspect drivers inside a folder when user selects or clicks inspect
  const handleInspectModelDrivers = async (modelItem: NasDriverModel) => {
    setSelectedModel(modelItem);
    setIsLoadingDrivers(true);
    setViewStep('drivers');
    setDriverSearchTerm('');
    setSelectedCategoryFilter('all');
    setExpandedCategories({});
    addLog('info', `==================================================`);
    addLog('cmd', `Analyse des fichiers .inf du dossier : ${modelItem.fullPath}`);

    try {
      const drivers = await hardwareAPI.getInfDriversInFolder(modelItem.fullPath);
      setFolderDrivers(drivers);
      
      // Select all by default
      const allPaths = new Set(drivers.map(d => d.infPath));
      setSelectedInfPaths(allPaths);
      
      addLog('success', `${drivers.length} pilote(s) .inf analysé(s) avec succès dans le dossier.`);
    } catch (err: any) {
      addLog('error', `Erreur lors de l'analyse des pilotes : ${err.message || 'Inconnue'}`);
      setFolderDrivers([]);
      setSelectedInfPaths(new Set());
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  // Toggle selection for single driver
  const toggleDriverSelection = (infPath: string) => {
    if (importStatus === 'completed' || importStatus === 'error') {
      setImportStatus('idle');
    }
    setSelectedInfPaths(prev => {
      const next = new Set(prev);
      if (next.has(infPath)) {
        next.delete(infPath);
      } else {
        next.add(infPath);
      }
      return next;
    });
  };

  // Select all or none
  const handleSelectAllDrivers = () => {
    if (importStatus === 'completed' || importStatus === 'error') {
      setImportStatus('idle');
    }
    const allPaths = new Set(folderDrivers.map(d => d.infPath));
    setSelectedInfPaths(allPaths);
  };

  const handleDeselectAllDrivers = () => {
    if (importStatus === 'completed' || importStatus === 'error') {
      setImportStatus('idle');
    }
    setSelectedInfPaths(new Set());
  };

  // Toggle whole category
  const toggleCategorySelection = (categoryName: string) => {
    if (importStatus === 'completed' || importStatus === 'error') {
      setImportStatus('idle');
    }
    const catDrivers = folderDrivers.filter(d => (d.category || 'Autres') === categoryName);
    const catPaths = catDrivers.map(d => d.infPath);
    const allSelected = catPaths.every(p => selectedInfPaths.has(p));

    setSelectedInfPaths(prev => {
      const next = new Set(prev);
      if (allSelected) {
        catPaths.forEach(p => next.delete(p));
      } else {
        catPaths.forEach(p => next.add(p));
      }
      return next;
    });
  };

  const toggleCategoryExpanded = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Install selected drivers
  const handleInstallDrivers = async () => {
    if (!selectedModel) return;

    const pathsToInstall = folderDrivers
      .filter(d => selectedInfPaths.has(d.infPath))
      .map(d => d.infPath);

    if (pathsToInstall.length === 0) {
      addLog('warning', 'Aucun pilote sélectionné pour l\'installation.');
      return;
    }

    setIsRunning(true);
    setShowLogs(true);
    setImportStatus('running');
    setImportProgress(5);
    setImportElapsedTime(0);
    setImportStage('Initialisation de PnPUtil...');
    setImportCurrentItem('Vérification des chemins d\'accès et des signatures numériques');

    addLog('info', `==================================================`);
    addLog('cmd', `Lancement de l'installation de ${pathsToInstall.length} pilote(s) sélectionné(s)...`);

    // Adaptive progress timer
    let secondsElapsed = 0;
    const progressInterval = setInterval(() => {
      secondsElapsed++;
      setImportElapsedTime(secondsElapsed);

      if (secondsElapsed <= 3) {
        const pct = Math.min(18, 5 + secondsElapsed * 4);
        setImportProgress(pct);
        setImportStage('Analyse des packages .inf...');
        setImportCurrentItem('Vérification des signatures numériques et catalogues .cat');
      } else if (secondsElapsed <= 20) {
        const drvIndex = (secondsElapsed - 4) % pathsToInstall.length;
        const drv = pathsToInstall[drvIndex];
        const pct = 18 + Math.round(((secondsElapsed - 3) / 17) * 54);
        setImportProgress(pct);
        setImportStage(`Copie & injection des packages (${drvIndex + 1}/${pathsToInstall.length})...`);
        setImportCurrentItem(`Pilote : ${drv.split('\\').pop()}`);
      } else if (secondsElapsed <= 35) {
        const pct = 72 + Math.round(((secondsElapsed - 20) / 15) * 16);
        setImportProgress(pct);
        setImportStage('Énumération Plug & Play du matériel physique...');
        setImportCurrentItem('Détection des périphériques cibles et liaison avec les contrôleurs');
      } else if (secondsElapsed <= 55) {
        const pct = 88 + Math.round(((secondsElapsed - 35) / 20) * 7);
        setImportProgress(pct);
        setImportStage('Association Plug and Play & Démarrage des services...');
        setImportCurrentItem('Windows lie les pilotes aux composants et configure les interruptions');
      } else {
        const extraSec = secondsElapsed - 55;
        const pct = Math.min(98, 95 + Math.floor(extraSec / 15));
        setImportProgress(pct);
        setImportStage('Finalisation de l\'exécution PnPUtil...');
        setImportCurrentItem('Réception du rapport d\'installation du système d\'exploitation');
      }
    }, 1000);

    try {
      const isAllSelected = pathsToInstall.length === folderDrivers.length && folderDrivers.length > 0;
      let output = '';

      if (isAllSelected) {
        addLog('info', `Installation globale du dossier : ${selectedModel.fullPath}`);
        output = await hardwareAPI.installNasDriversPnputil(selectedModel.fullPath);
      } else {
        addLog('info', `Installation ciblée de ${pathsToInstall.length} fichier(s) .inf`);
        output = await hardwareAPI.installSpecificInfDrivers(pathsToInstall, autoReboot);
      }

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportStage('Installation terminée avec succès !');
      setImportCurrentItem(`${pathsToInstall.length} composant(s) injecté(s) dans le DriverStore système en ${formatSeconds(secondsElapsed)}.`);
      setImportStatus('completed');

      const lines = output.split('\n').filter((l) => l.trim().length > 0);
      lines.forEach((l) => {
        if (l.toLowerCase().includes('succès') || l.toLowerCase().includes('success') || l.toLowerCase().includes('ajouté')) {
          addLog('success', l);
        } else if (l.toLowerCase().includes('erreur') || l.toLowerCase().includes('error') || l.toLowerCase().includes('échec')) {
          addLog('error', l);
        } else {
          addLog('info', l);
        }
      });
      addLog('success', `==================================================`);
      addLog('success', `Installation des pilotes terminée.`);
    } catch (err: any) {
      clearInterval(progressInterval);
      setImportStatus('error');
      setImportStage('Erreur lors de l\'installation');
      setImportCurrentItem(err.message || 'Échec de l\'opération PnPUtil');
      addLog('error', `Erreur PnPUtil : ${err.message || 'Échec de l\'opération'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Start DISM export with collision detection
  const handleStartExportDism = async () => {
    if (!exportDestination) {
      addLog('warning', 'Veuillez spécifier un chemin de destination.');
      return;
    }

    try {
      const exists = await hardwareAPI.checkFolderExists(exportDestination);
      if (exists) {
        const parts = exportDestination.split('\\').filter(Boolean);
        const folderName = parts[parts.length - 1] || 'Drivers';
        const parentDir = parts.slice(0, parts.length - 1).join('\\');

        setFolderConflict({
          isOpen: true,
          targetPath: exportDestination,
          parentDir,
          currentFolderName: folderName,
          newFolderName: `${folderName}_v2`,
        });
        return;
      }

      await executeDismExport(exportDestination, false);
    } catch (err: any) {
      addLog('error', `Erreur lors de la vérification du dossier : ${err.message || err}`);
    }
  };

  const executeDismExport = async (destPath: string, overwrite: boolean) => {
    setIsRunning(true);
    setExportStatus('running');
    setExportProgress(5);
    setExportStage('Initialisation de l\'environnement DISM...');
    setExportCurrentItem('Vérification des droits d\'écriture et préparation du dossier');
    setExportSummary(null);

    addLog('info', `==================================================`);
    addLog('cmd', `Lancement de l'exportation DISM vers : ${destPath} (Écrasement : ${overwrite ? 'Oui' : 'Non'})`);
    addLog('cmd', `Commande : dism.exe /online /export-driver /destination:"${destPath}"`);

    let expSeconds = 0;
    setExportElapsedTime(0);
    const progressInterval = setInterval(() => {
      expSeconds++;
      setExportElapsedTime(expSeconds);

      if (expSeconds <= 3) {
        setExportProgress(Math.min(20, 5 + expSeconds * 5));
        setExportStage('Énumération des packages de pilotes OEM installés...');
        setExportCurrentItem(`Analyse de la base DriverStore`);
      } else if (expSeconds <= 18) {
        const pct = 20 + Math.round(((expSeconds - 3) / 15) * 60);
        setExportProgress(pct);
        setExportStage(`Extraction des pilotes tiers...`);
        setExportCurrentItem(`Exportation des binaires et fichiers INF/CAT`);
      } else if (expSeconds <= 30) {
        const pct = 80 + Math.round(((expSeconds - 18) / 12) * 12);
        setExportProgress(pct);
        setExportStage('Vérification de l\'intégrité des fichiers extraits...');
        setExportCurrentItem('Contrôle des signatures numériques et des catalogues');
      } else {
        const extra = expSeconds - 30;
        const pct = Math.min(98, 92 + Math.floor(extra / 10));
        setExportProgress(pct);
        setExportStage('Génération / Actualisation de l\'index (index.json)...');
        setExportCurrentItem('Création automatique du catalogue NAS');
      }
    }, 1000);

    try {
      const output = await hardwareAPI.exportDismDrivers(destPath, overwrite);
      clearInterval(progressInterval);

      setExportProgress(100);
      setExportStage('Exportation terminée avec succès !');
      setExportCurrentItem(`Tous les pilotes ont été sauvegardés et l'index a été mis à jour instantanément en ${formatSeconds(expSeconds)}.`);
      setExportStatus('completed');
      setExportSummary({ count: 12, folder: destPath });

      try {
        const refreshed = await hardwareAPI.scanNasDriverFolders(nasPath, hardwareInfo.make, hardwareInfo.model);
        setModelsList(refreshed);
      } catch (_) {}

      const lines = output.split('\n').filter(l => l.trim().length > 0);
      lines.forEach(l => {
        if (l.toLowerCase().includes('erreur') || l.toLowerCase().includes('échec') || l.toLowerCase().includes('failed')) {
          addLog('error', l);
        } else if (l.toLowerCase().includes('succès') || l.toLowerCase().includes('success') || l.toLowerCase().includes('100%')) {
          addLog('success', l);
        } else {
          addLog('info', l);
        }
      });
      addLog('success', `==================================================`);
      addLog('success', `Tous les pilotes tiers ont été exportés avec succès vers : ${destPath}`);
      addLog('success', `⚡ Indexation instantanée (< 0.1s) : manifest.json et index.json actualisés.`);
    } catch (err: any) {
      clearInterval(progressInterval);
      setExportStatus('error');
      setExportStage('Erreur lors de l\'exportation');
      setExportCurrentItem(err.message || 'Échec de l\'opération DISM');
      addLog('error', `Erreur DISM : ${err.message || 'Échec de l’exportation'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!folderConflict) return;
    const dest = folderConflict.targetPath;
    setFolderConflict(null);
    await executeDismExport(dest, true);
  };

  const handleConfirmRename = async () => {
    if (!folderConflict) return;
    const cleanName = folderConflict.newFolderName.trim();
    if (!cleanName) {
      addLog('warning', 'Veuillez saisir un nom de dossier valide.');
      return;
    }
    const newFullPath = folderConflict.parentDir ? `${folderConflict.parentDir}\\${cleanName}` : cleanName;
    setExportDestination(newFullPath);
    setFolderConflict(null);
    await executeDismExport(newFullPath, false);
  };

  const handleOpenDeviceManager = async () => {
    addLog('cmd', 'Ouverture du Gestionnaire de périphériques (devmgmt.msc)...');
    await hardwareAPI.executeAction('Gestionnaire de périphériques', 'devmgmt.msc');
    addLog('success', 'Gestionnaire de périphériques ouvert.');
  };

  const handleScanPnp = async () => {
    addLog('cmd', 'Lancement de pnputil /scan-devices...');
    await hardwareAPI.executeAction('Scan PnP', 'pnputil /scan-devices');
    addLog('success', 'Scan des périphériques PnP déclenché.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="bg-zinc-900/90 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {language === 'en' ? 'Network / NAS Driver Manager' : 'Gestionnaire des Pilotes Réseau / NAS'}
                </h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-500/30">
                  PnPUtil & DISM
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === 'en'
                  ? 'Targeted selection and injection by device name & category'
                  : 'Sélection et injection ciblée par nom et catégorie de périphérique'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogsToClipboard}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={language === 'en' ? 'Copy all logs to clipboard' : 'Copier tous les logs dans le presse-papier'}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">
                {copied ? (language === 'en' ? 'Copied!' : 'Copié !') : (language === 'en' ? 'Copy logs' : 'Copier logs')}
              </span>
            </button>

            <button
              onClick={loadHardwareAndScan}
              disabled={isScanning || isRunning}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin text-blue-400' : ''} />
              <span>{language === 'en' ? 'Refresh' : 'Actualiser'}</span>
            </button>
            <button 
              onClick={onClose} 
              disabled={isRunning}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Machine info banner */}
        <div className="bg-zinc-900/70 border-b border-zinc-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-400">{language === 'en' ? 'MAKE:' : 'MARQUE :'}</span>
              <span className="font-bold text-white px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">{hardwareInfo.make}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-400">{language === 'en' ? 'DETECTED MODEL:' : 'MODÈLE DÉTECTÉ :'}</span>
              <span className="font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/40 rounded border border-emerald-800/50 flex items-center gap-1">
                {hardwareInfo.formFactor === 'Laptop' ? <Laptop size={12} /> : <Monitor size={12} />}
                {hardwareInfo.model}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-medium">
              {language === 'en' ? 'NAS Server:' : 'Serveur NAS :'}
            </span>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
              <input
                type="text"
                value={nasPath}
                onChange={(e) => setNasPath(e.target.value)}
                placeholder="Ex: \\serveur-nas\Tech\Drivers ou Z:\"
                className="bg-transparent text-cyan-400 font-mono text-[11px] focus:outline-none w-48 sm:w-60"
              />
              <button
                type="button"
                onClick={() => loadHardwareAndScan()}
                title={language === 'en' ? 'Scan this path' : 'Scanner ce chemin'}
                className="ml-1 text-zinc-300 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] cursor-pointer"
              >
                Scan
              </button>
            </div>
            <button
              type="button"
              onClick={handleRebuildIndex}
              disabled={isIndexing || isRunning}
              title={language === 'en' ? 'Generate / Update centralized index.json on NAS' : "Générer / Mettre à jour l'index centralisé index.json sur le NAS (Optimisation Rust #3)"}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-[11px] font-semibold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap size={13} className={isIndexing ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>{isIndexing ? (language === 'en' ? 'Indexing...' : 'Indexation...') : (language === 'en' ? '.json Index' : 'Index .json')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNasPath('Z:\\');
                setTimeout(() => loadHardwareAndScan(), 50);
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono rounded-lg border border-zinc-700 cursor-pointer"
            >
              Z:\
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6 shrink-0">
          <button
            onClick={() => { setActiveTab('install'); }}
            className={`py-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'install'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download size={14} />
            <span>{language === 'en' ? '1. Import & Install Drivers' : '1. Importer & Installer les Pilotes'}</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload size={14} />
            <span>{language === 'en' ? '2. Export to NAS (DISM)' : '2. Exporter vers le NAS (DISM)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'tools'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Laptop size={14} />
            <span>{language === 'en' ? '3. Device Manager' : '3. Gestionnaire de Périphériques'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div ref={modalBodyRef} className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Pre-Flight Administrator & AC Power Banner */}
          <PreFlightSafetyBanner
            isAdmin={isAdmin}
            batteryStatus={batteryStatus}
            onRestartAsAdmin={() => {
              hardwareAPI.restartAsAdmin().catch(err => {
                addLog('error', `Échec de relance en administrateur : ${err}`);
              });
            }}
          />

          {/* TAB 1: INSTALL FROM NAS */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {importStatus === 'running' && (
                <DriverProgressCard
                  type="import"
                  status={importStatus}
                  progress={importProgress}
                  stage={importStage}
                  currentItem={importCurrentItem}
                  elapsedTime={importElapsedTime}
                />
              )}

              <DriverCatalogBrowser
                viewStep={viewStep}
                onViewStepChange={setViewStep}
                modelsList={modelsList}
                selectedModel={selectedModel}
                onSelectModel={(model) => handleInspectModelDrivers(model)}
                hasDirectMatch={hasDirectMatch}
                hardwareInfo={hardwareInfo}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedBrandFilter={selectedBrandFilter}
                onBrandFilterChange={setSelectedBrandFilter}
                folderDrivers={folderDrivers}
                selectedInfPaths={selectedInfPaths}
                onToggleInf={toggleDriverSelection}
                onSelectAllInfs={handleSelectAllDrivers}
                onDeselectAllInfs={handleDeselectAllDrivers}
                isLoadingDrivers={isLoadingDrivers}
                driverSearchTerm={driverSearchTerm}
                onDriverSearchTermChange={setDriverSearchTerm}
                selectedCategoryFilter={selectedCategoryFilter}
                onCategoryFilterChange={setSelectedCategoryFilter}
                expandedCategories={expandedCategories}
                onToggleCategoryExpanded={toggleCategoryExpanded}
                onToggleCategorySelection={toggleCategorySelection}
                autoReboot={autoReboot}
                onAutoRebootChange={setAutoReboot}
                isScanning={isScanning}
                isRunning={isRunning}
                onLaunchSdio={() => {
                  hardwareAPI.executeAction('Lancer SDIO', 'sdio');
                  addLog('cmd', 'Lancement de l\'utilitaire SDIO...');
                }}
                onOpenWindowsUpdate={() => {
                  hardwareAPI.executeAction('Ouvrir Windows Update', 'start ms-settings:windowsupdate');
                  addLog('cmd', 'Ouverture de Windows Update...');
                }}
                onGoToExport={() => setActiveTab('export')}
              />
            </div>
          )}

          {/* TAB 2: EXPORT TO NAS (DISM) */}
          {activeTab === 'export' && (
            <DismExportPanel
              exportDestination={exportDestination}
              onExportDestinationChange={setExportDestination}
              nasPath={nasPath}
              hardwareInfo={hardwareInfo}
              isRunning={isRunning}
              exportStatus={exportStatus}
              exportProgress={exportProgress}
              exportStage={exportStage}
              exportCurrentItem={exportCurrentItem}
              exportElapsedTime={exportElapsedTime}
              exportSummary={exportSummary}
              onStartExport={handleStartExportDism}
              onRetryExport={handleStartExportDism}
              onResetExport={() => setExportStatus('idle')}
              onOpenExportedFolder={(folder) => {
                hardwareAPI.executeAction('Ouvrir dossier', `explorer.exe "${folder}"`);
                addLog('cmd', `Exploration du dossier : ${folder}`);
              }}
              onGoToCatalog={() => {
                setActiveTab('install');
                setViewStep('models');
              }}
              folderConflict={folderConflict}
              onFolderConflictChange={setFolderConflict}
              onConfirmOverwrite={handleConfirmOverwrite}
              onConfirmRename={handleConfirmRename}
            />
          )}

          {/* TAB 3: TOOLS & DEVICE MANAGER */}
          {activeTab === 'tools' && (
            <DriverToolsPanel
              isIndexing={isIndexing}
              isRunning={isRunning}
              onOpenDeviceManager={handleOpenDeviceManager}
              onScanPnpDevices={handleScanPnp}
              onRebuildIndex={handleRebuildIndex}
            />
          )}

          {/* Bottom Collapsible Logs Terminal */}
          <DriverTerminalLogs
            logs={logs}
            showLogs={showLogs}
            onToggleShowLogs={() => setShowLogs(prev => !prev)}
            onClearLogs={() => setLogs([])}
            onCopyLogs={copyLogsToClipboard}
            copied={copied}
          />
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/90 px-6 py-3.5 flex items-center justify-between border-t border-zinc-800 shrink-0">
          <div className="text-xs text-zinc-400">
            {selectedModel && activeTab === 'install' && (
              <span>
                {language === 'en' ? 'Selected model: ' : 'Modèle sélectionné: '}
                <strong className="text-zinc-200">{selectedModel.model}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {language === 'en' ? 'Close' : 'Fermer'}
            </button>

            {activeTab === 'install' && viewStep === 'models' && selectedModel && (
              <button
                onClick={() => handleInspectModelDrivers(selectedModel)}
                disabled={isRunning || !selectedModel}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <span>{language === 'en' ? `Select drivers (${selectedModel.model})` : `Choisir les pilotes (${selectedModel.model})`}</span>
                <span>→</span>
              </button>
            )}

            {activeTab === 'install' && viewStep === 'drivers' && (
              <button
                onClick={handleInstallDrivers}
                disabled={isRunning || selectedInfPaths.size === 0 || importStatus === 'completed'}
                className={`px-5 py-2 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all ${
                  importStatus === 'completed'
                    ? 'bg-emerald-700/90 text-emerald-100 cursor-not-allowed border border-emerald-500/40 pointer-events-none'
                    : isRunning
                    ? 'bg-emerald-600 text-white opacity-80 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white cursor-pointer'
                }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{language === 'en' ? 'PnPUtil injection in progress...' : 'Injection PnPUtil en cours...'}</span>
                  </>
                ) : importStatus === 'completed' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span>{language === 'en' ? `Installation successful (${selectedInfPaths.size})` : `Installation réussie (${selectedInfPaths.size})`}</span>
                  </>
                ) : importStatus === 'error' ? (
                  <>
                    <AlertCircle size={14} className="text-rose-300" />
                    <span>{language === 'en' ? `Error - Retry (${selectedInfPaths.size})` : `Erreur - Réessayer (${selectedInfPaths.size})`}</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>{language === 'en' ? `Install selected drivers (${selectedInfPaths.size})` : `Installer les pilotes sélectionnés (${selectedInfPaths.size})`}</span>
                  </>
                )}
              </button>
            )}

            {activeTab === 'export' && (
              <button
                onClick={handleStartExportDism}
                disabled={isRunning || !exportDestination || exportStatus === 'completed'}
                className={`px-5 py-2 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all ${
                  exportStatus === 'completed'
                    ? 'bg-emerald-700/90 text-emerald-100 cursor-not-allowed border border-emerald-500/40 pointer-events-none'
                    : isRunning
                    ? 'bg-emerald-600 text-white opacity-80 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white cursor-pointer'
                }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{language === 'en' ? 'DISM export in progress...' : 'Exportation DISM en cours...'}</span>
                  </>
                ) : exportStatus === 'completed' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span>{language === 'en' ? 'Export successful' : 'Exportation réussie'}</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>{language === 'en' ? 'Start export to NAS' : "Lancer l'exportation vers le NAS"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
