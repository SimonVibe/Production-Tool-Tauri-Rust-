import React from 'react';
import { HardDrive, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  isIndexing: boolean;
  isRunning: boolean;
  onOpenDeviceManager: () => void;
  onScanPnpDevices: () => void;
  onRebuildIndex: () => void;
}

export const DriverToolsPanel: React.FC<Props> = ({
  isIndexing,
  isRunning,
  onOpenDeviceManager,
  onScanPnpDevices,
  onRebuildIndex,
}) => {
  const { language } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Device Manager */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2.5">
          <HardDrive size={20} className="text-emerald-400" />
          <h4 className="text-xs font-bold text-zinc-100">
            {language === 'en' ? '3. Device Manager' : '3. Gestionnaire de périphériques'}
          </h4>
        </div>
        <p className="text-xs text-zinc-400">
          {language === 'en'
            ? 'Opens the official Windows console (`devmgmt.msc`) to inspect missing drivers or yellow exclamation marks.'
            : "Ouvre la console Windows officielle (`devmgmt.msc`) pour inspecter les pilotes manquants ou avec point d'exclamation jaune."}
        </p>
        <button
          type="button"
          onClick={onOpenDeviceManager}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <ExternalLink size={14} />
          <span>{language === 'en' ? 'Open devmgmt.msc' : 'Ouvrir devmgmt.msc'}</span>
        </button>
      </div>

      {/* 2. Rescan PnP */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2.5">
          <RefreshCw size={20} className="text-blue-400" />
          <h4 className="text-xs font-bold text-zinc-100">
            {language === 'en' ? 'Scan PnP Devices' : 'Scanner les périphériques PnP'}
          </h4>
        </div>
        <p className="text-xs text-zinc-400">
          {language === 'en'
            ? 'Forces the Windows subsystem to re-evaluate all hardware controllers (`pnputil /scan-devices`).'
            : 'Force le système Windows à réévaluer tous les contrôleurs matériels (`pnputil /scan-devices`).'}
        </p>
        <button
          type="button"
          onClick={onScanPnpDevices}
          disabled={isRunning}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} />
          <span>{language === 'en' ? 'Scan PnP' : 'Scanner PnP'}</span>
        </button>
      </div>

      {/* 3. Centralized index.json */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2.5">
          <Zap size={20} className="text-amber-400" />
          <h4 className="text-xs font-bold text-zinc-100">
            {language === 'en' ? 'Centralized Index (index.json)' : 'Index Centralisé (index.json)'}
          </h4>
        </div>
        <p className="text-xs text-zinc-400">
          {language === 'en' ? (
            <>Generates an <span className="font-mono text-amber-300">index.json</span> at the NAS root for instant detection (&lt;10ms) across all technician stations.</>
          ) : (
            <>Génère un fichier <span className="font-mono text-amber-300">index.json</span> à la racine du NAS pour rendre la détection instantanée (&lt;10ms) sur tous les postes techniciens.</>
          )}
        </p>
        <button
          type="button"
          onClick={onRebuildIndex}
          disabled={isIndexing || isRunning}
          className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold rounded-xl border border-amber-500/40 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Zap size={14} className={isIndexing ? 'animate-spin' : ''} />
          <span>{isIndexing ? (language === 'en' ? 'Generating...' : 'Génération en cours...') : (language === 'en' ? 'Rebuild index.json' : 'Reconstruire index.json')}</span>
        </button>
      </div>
    </div>
  );
};
