import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, DownloadCloud, RefreshCw, CheckCircle2, AlertTriangle, 
  RotateCcw, Terminal, Check, Play, ChevronDown, ChevronUp, Copy,
  Sparkles, Wrench, Filter, HardDrive
} from 'lucide-react';
import { AppConfig, WindowsUpdateDriver, DriverLogEntry } from '../types';
import { hardwareAPI } from '../lib/tauriAdapter';
import { useLanguage } from '../i18n/LanguageContext';
import { translateLogMessage } from '../lib/logTranslator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onRebootRequest?: () => void;
}

type FilterTab = 'all' | 'pending' | 'installed';

export default function WindowsUpdateModal({ isOpen, onClose, config, onRebootRequest }: Props) {
  const { language, t } = useLanguage();
  const [drivers, setDrivers] = useState<WindowsUpdateDriver[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [autoReboot, setAutoReboot] = useState(config.autoReboot || false);
  const [logs, setLogs] = useState<DriverLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [rebootRequired, setRebootRequired] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [searchDone, setSearchDone] = useState(false);
  const [executionFinished, setExecutionFinished] = useState(false);
  const [updateApplied, setUpdateApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const rebootTimeoutRef = useRef<any>(null);

  const copyLogsToClipboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = logs.map(l => `[${l.timestamp}] ${translateLogMessage(l.message, language)}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearRebootTimeout = () => {
    if (rebootTimeoutRef.current) {
      clearTimeout(rebootTimeoutRef.current);
      rebootTimeoutRef.current = null;
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

  useEffect(() => {
    if (isOpen) {
      clearRebootTimeout();
      handleSearch();
    } else {
      clearRebootTimeout();
      if (!isInstalling) {
        setLogs([]);
        setSearchDone(false);
      }
    }

    return () => {
      clearRebootTimeout();
    };
  }, [isOpen]);

  const pendingUpdates = useMemo(() => drivers.filter(d => !d.isInstalled), [drivers]);
  const installedDrivers = useMemo(() => drivers.filter(d => d.isInstalled), [drivers]);

  const filteredDrivers = useMemo(() => {
    if (activeTab === 'pending') return pendingUpdates;
    if (activeTab === 'installed') return installedDrivers;
    return drivers;
  }, [drivers, activeTab, pendingUpdates, installedDrivers]);

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchDone(false);
    setLogs([]);
    addLog('info', '=== RECHERCHE DES PILOTES VIA WINDOWS UPDATE ===');
    addLog('cmd', 'Initialisation de Microsoft.Update.Session (recherche globale en cours)...');

    try {
      // Search with includeInstalled = true to list all available drivers & reinstallation candidates
      const results = await hardwareAPI.searchWindowsUpdateDrivers(false, true);
      setDrivers(results);

      const uninstalled = results.filter(d => !d.isInstalled);
      const alreadyInstalled = results.filter(d => d.isInstalled);

      if (uninstalled.length > 0) {
        // Select all pending uninstalled updates by default
        setSelectedIds(uninstalled.map((d) => d.id));
        setActiveTab('all');
        addLog('success', `${results.length} pilote(s) détecté(s) (${uninstalled.length} mise(s) à jour en attente sélectionnée(s) par défaut, ${alreadyInstalled.length} déjà installé(s)).`);
      } else if (results.length > 0) {
        // All are installed: leave selected or ready for user selection for corruption repair
        setSelectedIds([]);
        setActiveTab('all');
        addLog('info', `${results.length} pilote(s) détecté(s). Tous sont actuellement installés. Vous pouvez cocher n'importe quel pilote pour forcer sa réinstallation.`);
      } else {
        setSelectedIds([]);
        addLog('success', 'Aucun pilote supplémentaire en attente sur Windows Update. Le système est à jour.');
      }

      results.forEach((d, idx) => {
        const stateTag = d.isInstalled ? '[INSTALLÉ]' : '[MISE À JOUR]';
        addLog('info', `  ${stateTag} [${idx + 1}/${results.length}] ${d.title} (${d.category || 'Périphérique'})`);
      });

      setSearchDone(true);
    } catch (err: any) {
      addLog('error', `Échec de la recherche : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (isInstalling) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setExecutionFinished(false);
    setUpdateApplied(false);
  };

  const selectAll = () => {
    if (isInstalling) return;
    if (selectedIds.length === drivers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(drivers.map((d) => d.id));
    }
    setExecutionFinished(false);
    setUpdateApplied(false);
  };

  const selectOnlyUpdates = () => {
    if (isInstalling) return;
    setSelectedIds(pendingUpdates.map(d => d.id));
    setExecutionFinished(false);
    setUpdateApplied(false);
  };

  const handleStartInstallation = async () => {
    const toInstall = drivers.filter((d) => selectedIds.includes(d.id));
    if (toInstall.length === 0) return;

    setIsInstalling(true);
    setExecutionFinished(false);
    setUpdateApplied(false);
    setOverallProgress(10);
    setRebootRequired(false);
    addLog('info', `Démarrage de l'installation Windows Update pour ${toInstall.length} pilote(s)...`);
    addLog('cmd', 'Téléchargement et installation séquentielle via Microsoft Update Agent...');

    setDrivers((prev) =>
      prev.map((d) => (selectedIds.includes(d.id) ? { ...d, status: 'downloading', progress: 30 } : d))
    );

    try {
      setOverallProgress(35);
      const res = await hardwareAPI.installWindowsUpdateDrivers(toInstall.map(d => d.id), autoReboot);
      setOverallProgress(90);

      const lines = res.split('\n').filter(l => l.trim().length > 0);
      lines.forEach(l => {
        if (l.includes('Succès') || l.includes('100%') || l.includes('Réussi') || l.includes('[OK]')) {
          addLog('success', l);
        } else if (l.includes('Échec') || l.includes('Erreur') || l.includes('[ÉCHEC]') || l.includes('ERREUR:')) {
          addLog('error', l);
        } else if (l.includes('REDÉMARRAGE') || l.includes('Redémarrage')) {
          addLog('warning', l);
          setRebootRequired(true);
        } else {
          addLog('info', l);
        }
      });

      setDrivers((prev) =>
        prev.map((d) =>
          selectedIds.includes(d.id) ? { ...d, status: 'installed', isInstalled: true, progress: 100 } : d
        )
      );
      setOverallProgress(100);

      if (autoReboot && (res.includes('REDÉMARRAGE') || res.includes('Redémarrage'))) {
        addLog('warning', 'Redémarrage automatique planifié dans 10 secondes...');
        rebootTimeoutRef.current = setTimeout(() => {
          if (onRebootRequest) onRebootRequest();
          else hardwareAPI.executeAction('Redémarrage', 'shutdown -r -t 0');
        }, 10000);
      }
      setUpdateApplied(true);
      setExecutionFinished(true);
      setSelectedIds([]);
    } catch (err: any) {
      addLog('error', `Échec critique lors de l'installation : ${err.message || 'Erreur inconnue'}`);
      setDrivers((prev) =>
        prev.map((d) =>
          selectedIds.includes(d.id) ? { ...d, status: 'failed', progress: 0 } : d
        )
      );
      setUpdateApplied(false);
      setExecutionFinished(true);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden text-zinc-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DownloadCloud size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{language === 'en' ? 'Windows Update Driver Manager' : 'Gestionnaire des Pilotes Windows Update'}</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-500/30">
                  Microsoft Update Agent
                </span>
              </div>
              <p className="text-xs text-zinc-400">{language === 'en' ? 'Scan, update installation and forced reinstallation of corrupt drivers' : 'Recherche, installation des mises à jour et réinstallation forcée des pilotes corrompus'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogsToClipboard}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={language === 'en' ? 'Copy all logs to clipboard' : 'Copier tous les logs dans le presse-papier'}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? (language === 'en' ? 'Copied!' : 'Copié !') : (language === 'en' ? 'Copy logs' : 'Copier logs')}</span>
            </button>

            <button
              onClick={handleSearch}
              disabled={isSearching || isInstalling}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title={language === 'en' ? 'Rerun driver search' : 'Relancer la recherche de pilotes'}
            >
              <RefreshCw size={14} className={isSearching ? 'animate-spin text-emerald-400' : ''} />
              <span>{t('common.refresh')}</span>
            </button>

            <button 
              onClick={onClose} 
              disabled={isInstalling}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        {isInstalling && (
          <div className="w-full bg-zinc-900 h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 shadow-sm"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Top Filter Tabs & Selection bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {language === 'en' ? 'All' : 'Tous'} ({drivers.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-emerald-950/70 text-emerald-300 font-semibold border border-emerald-700/60'
                    : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900'
                }`}
              >
                <Sparkles size={12} className="text-emerald-400" />
                <span>{language === 'en' ? 'Updates' : 'Mises à jour'} ({pendingUpdates.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('installed')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'installed'
                    ? 'bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Wrench size={12} className="text-zinc-400" />
                <span>{language === 'en' ? 'Installed / Repair' : 'Déjà installés / Réparation'} ({installedDrivers.length})</span>
              </button>
            </div>

            {/* Quick Actions & Auto-reboot */}
            <div className="flex items-center flex-wrap gap-2.5">
              {pendingUpdates.length > 0 && (
                <button
                  onClick={selectOnlyUpdates}
                  disabled={isInstalling}
                  className="text-xs px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-medium rounded-lg border border-emerald-800/60 transition-colors cursor-pointer disabled:opacity-50"
                  title={language === 'en' ? 'Select only drivers with available updates' : 'Sélectionner uniquement les pilotes en attente de mise à jour'}
                >
                  {language === 'en' ? 'Select Updates' : 'Sélectionner MàJ'}
                </button>
              )}

              <button
                onClick={selectAll}
                disabled={isInstalling || drivers.length === 0}
                className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700/70 transition-colors cursor-pointer disabled:opacity-50"
              >
                {selectedIds.length === drivers.length && drivers.length > 0 
                  ? (language === 'en' ? 'Deselect All' : 'Tout désélectionner') 
                  : `${language === 'en' ? 'Select All' : 'Tout sélectionner'} (${selectedIds.length}/${drivers.length})`}
              </button>

              <div className="flex items-center space-x-1.5 pl-1.5 border-l border-zinc-800">
                <input
                  type="checkbox"
                  id="wuModalAutoReboot"
                  checked={autoReboot}
                  onChange={(e) => setAutoReboot(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-zinc-900 border-zinc-700 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="wuModalAutoReboot" className="text-xs text-zinc-300 font-medium cursor-pointer select-none">
                  {t('wu_modal.auto_reboot')}
                </label>
              </div>
            </div>
          </div>

          {/* Installed-only Notice Banner */}
          {drivers.length > 0 && pendingUpdates.length === 0 && searchDone && (
            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5 text-zinc-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{language === 'en' ? 'All Windows Update drivers are up to date. Check drivers below to force a reinstallation (device repair).' : 'Tous les pilotes Windows Update sont à jour. Cochez les pilotes ci-dessous pour forcer une réinstallation (réparation de périphérique).'}</span>
              </div>
              <button
                onClick={selectAll}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg border border-zinc-700 shrink-0 cursor-pointer"
              >
                {language === 'en' ? 'Check all to reinstall' : 'Tout cocher pour réinstaller'}
              </button>
            </div>
          )}

          {/* Drivers List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {isSearching ? (
              <div className="py-12 text-center text-zinc-400 space-y-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <RefreshCw size={28} className="animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold">{language === 'en' ? 'Querying Microsoft Update servers in progress...' : 'Interrogation des serveurs Microsoft Update en cours...'}</p>
              </div>
            ) : filteredDrivers.length === 0 && searchDone ? (
              <div className="py-10 text-center text-zinc-400 space-y-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-zinc-200">{language === 'en' ? 'No drivers in this tab' : 'Aucun pilote dans cet onglet'}</p>
                <p className="text-xs text-zinc-500">{language === 'en' ? 'All drivers distributed by Microsoft Update for this machine are installed.' : 'Tous les pilotes distribués par Microsoft Update pour cette machine sont installés.'}</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = selectedIds.includes(driver.id);
                return (
                  <div
                    key={driver.id}
                    onClick={() => toggleSelect(driver.id)}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900/90 border-emerald-500/50 hover:border-emerald-500 ring-1 ring-emerald-500/20'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 opacity-80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-zinc-100 truncate">{driver.title}</h4>
                          {driver.category && (
                            <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded border border-zinc-700/80 shrink-0">
                              {driver.category}
                            </span>
                          )}
                          {driver.isInstalled ? (
                            <span className="px-1.5 py-0.5 bg-zinc-800/90 text-zinc-400 text-[10px] font-medium rounded border border-zinc-700/50 shrink-0">
                              {language === 'en' ? 'Installed' : 'Déjà installé'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 text-[10px] font-semibold rounded border border-emerald-700/50 shrink-0">
                              {language === 'en' ? 'Update available' : 'Mise à jour disponible'}
                            </span>
                          )}
                        </div>
                        {driver.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{driver.description}</p>
                        )}
                        {(driver.version || driver.releaseDate || driver.provider) && (
                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1">
                            {driver.provider && <span>{language === 'en' ? 'Provider' : 'Fournisseur'}: {driver.provider}</span>}
                            {driver.version && <span>Version: {driver.version}</span>}
                            {driver.releaseDate && <span>Date: {driver.releaseDate}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex items-center space-x-2">
                      {driver.status === 'pending' && (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${
                          isSelected 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                            : 'text-zinc-400 bg-zinc-900 border-zinc-800'
                        }`}>
                          {isSelected ? (driver.isInstalled ? (language === 'en' ? 'To reinstall' : 'À réinstaller') : (language === 'en' ? 'To install' : 'À installer')) : (language === 'en' ? 'Not selected' : 'Non sélectionné')}
                        </span>
                      )}
                      {driver.status === 'downloading' && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30 flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> {language === 'en' ? 'Downloading...' : 'Téléchargement...'}
                        </span>
                      )}
                      {driver.status === 'downloaded' && (
                        <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-1 rounded border border-teal-500/30">
                          {language === 'en' ? 'Ready to install' : 'Prêt à installer'}
                        </span>
                      )}
                      {driver.status === 'installing' && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> {language === 'en' ? 'Installing...' : 'Installation...'}
                        </span>
                      )}
                      {driver.status === 'installed' && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={12} /> {language === 'en' ? 'Installed' : 'Installé'}
                        </span>
                      )}
                      {driver.status === 'failed' && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle size={12} /> {language === 'en' ? 'Failed' : 'Échec'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Collapsible Live Terminal Log */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
            <div 
              onClick={() => setShowLogs(!showLogs)}
              className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Terminal size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300">{language === 'en' ? 'Execution Log' : 'Journal d\'exécution'}</span>
                <span className="text-[10px] font-mono text-zinc-500">({logs.length} {language === 'en' ? 'entries' : 'entrées'})</span>
              </div>
              <div className="flex items-center space-x-2">
                {logs.length > 0 && (
                  <button
                    onClick={copyLogsToClipboard}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Copy logs' : 'Copier les logs'}
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? (language === 'en' ? 'Copied!' : 'Copié !') : (language === 'en' ? 'Copy' : 'Copier')}</span>
                  </button>
                )}
                <button className="text-zinc-400 hover:text-zinc-200">
                  {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {showLogs && (
              <div className="p-3 bg-zinc-950 font-mono text-[11px] h-36 overflow-y-auto space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-zinc-600 italic">{language === 'en' ? 'Waiting for an operation...' : 'En attente d\'une opération...'}</div>
                ) : (
                  logs.map((log, index) => {
                    let color = 'text-zinc-300';
                    if (log.level === 'success') color = 'text-emerald-400 font-semibold';
                    if (log.level === 'warning') color = 'text-amber-400';
                    if (log.level === 'error') color = 'text-rose-400 font-semibold';
                    if (log.level === 'cmd') color = 'text-blue-400';

                    return (
                      <div key={index} className="flex space-x-2 leading-relaxed">
                        <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                        <span className={color}>{translateLogMessage(log.message, language)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-zinc-900/90 px-6 py-3.5 flex items-center justify-between border-t border-zinc-800 shrink-0">
          <div className="text-xs text-zinc-400 font-medium">
            {rebootRequired && (
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} /> {language === 'en' ? 'Reboot required to apply drivers' : 'Redémarrage requis pour appliquer les pilotes'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {rebootRequired && (
              <button
                onClick={() => {
                  if (onRebootRequest) onRebootRequest();
                  else hardwareAPI.executeAction('Redémarrage', 'shutdown -r -t 0');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>{language === 'en' ? 'Restart Computer' : 'Redémarrer le poste'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isInstalling}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('common.close')}
            </button>

            <button
              onClick={handleStartInstallation}
              disabled={isInstalling || selectedIds.length === 0 || drivers.length === 0 || executionFinished}
              className={`px-5 py-2 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all ${
                executionFinished && updateApplied
                  ? 'bg-emerald-700/90 text-emerald-100 cursor-not-allowed border border-emerald-500/40 pointer-events-none'
                  : isInstalling
                  ? 'bg-emerald-600 text-white opacity-80 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white cursor-pointer'
              }`}
            >
              {isInstalling ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{language === 'en' ? `Installation in progress (${overallProgress}%)...` : `Installation en cours (${overallProgress}%)...`}</span>
                </>
              ) : executionFinished ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-300" />
                  <span>{updateApplied ? (language === 'en' ? 'Installation successful' : 'Installation réussie') : (language === 'en' ? 'Finished (with errors)' : 'Terminé (Erreurs)')}</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>{language === 'en' ? `Install / Reinstall (${selectedIds.length})` : `Installer / Réinstaller (${selectedIds.length})`}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
