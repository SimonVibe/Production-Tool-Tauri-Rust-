import React from 'react';
import {
  Upload,
  RefreshCw,
  Folder,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Laptop,
} from 'lucide-react';
import { DriverProgressCard } from './DriverProgressCard';
import { useLanguage } from '../../i18n/LanguageContext';

export interface FolderConflictState {
  isOpen: boolean;
  targetPath: string;
  currentFolderName: string;
  newFolderName: string;
}

interface Props {
  exportDestination: string;
  onExportDestinationChange: (dest: string) => void;
  nasPath: string;
  hardwareInfo: {
    make: string;
    model: string;
    formFactor: string;
    serialNumber: string;
  };
  isRunning: boolean;
  exportStatus: 'idle' | 'running' | 'completed' | 'error';
  exportProgress: number;
  exportStage: string;
  exportCurrentItem: string;
  exportElapsedTime: number;
  exportSummary: { count: number; folder: string } | null;
  onStartExport: () => void;
  onRetryExport: () => void;
  onResetExport: () => void;
  onOpenExportedFolder: (folder: string) => void;
  onGoToCatalog: () => void;
  folderConflict: FolderConflictState | null;
  onFolderConflictChange: (state: FolderConflictState | null) => void;
  onConfirmOverwrite: () => void;
  onConfirmRename: () => void;
}

export const DismExportPanel: React.FC<Props> = ({
  exportDestination,
  onExportDestinationChange,
  nasPath,
  hardwareInfo,
  isRunning,
  exportStatus,
  exportProgress,
  exportStage,
  exportCurrentItem,
  exportElapsedTime,
  exportSummary,
  onStartExport,
  onRetryExport,
  onResetExport,
  onOpenExportedFolder,
  onGoToCatalog,
  folderConflict,
  onFolderConflictChange,
  onConfirmOverwrite,
  onConfirmRename,
}) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      {/* 1. Destination Box */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
            <Upload size={16} className="text-emerald-400" />
            <span>
              {language === 'en'
                ? '2. Export local OEM drivers to NAS (DISM)'
                : '2. Exportation des pilotes OEM locaux vers le NAS (DISM)'}
            </span>
          </h4>
          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
            dism.exe /online /export-driver
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          {language === 'en' ? (
            <>
              This action extracts all third-party drivers installed on this machine and saves them into the standardized folder{' '}
              <span className="text-emerald-400 font-semibold">
                {hardwareInfo.make}\{hardwareInfo.formFactor}\{hardwareInfo.model}
              </span>
              .
            </>
          ) : (
            <>
              Cette action extrait tous les pilotes tiers installés sur ce poste et les enregistre dans le dossier standardisé{' '}
              <span className="text-emerald-400 font-semibold">
                {hardwareInfo.make}\{hardwareInfo.formFactor}\{hardwareInfo.model}
              </span>
              .
            </>
          )}
        </p>

        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-1">
            {language === 'en' ? 'Network or local destination folder:' : 'Dossier de destination réseau ou local :'}
          </label>
          <input
            type="text"
            value={exportDestination}
            onChange={(e) => onExportDestinationChange(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              onExportDestinationChange(
                `${nasPath}\\${hardwareInfo.make}\\${hardwareInfo.formFactor}\\${hardwareInfo.model}`
              );
            }}
            disabled={isRunning}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {language === 'en' ? 'Detected model name: ' : 'Nom modèle détecté : '}
            <strong className="text-emerald-400">{hardwareInfo.model}</strong>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportDestinationChange(
                `${nasPath}\\${hardwareInfo.make}\\${hardwareInfo.formFactor}\\${hardwareInfo.model}_${
                  new Date().toISOString().split('T')[0]
                }`
              );
            }}
            disabled={isRunning}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {language === 'en' ? '+ Add date' : '+ Ajouter date'} ({new Date().toISOString().split('T')[0]})
          </button>
        </div>
      </div>

      {/* 2. Progress card during active export */}
      {exportStatus === 'running' && (
        <DriverProgressCard
          type="export"
          status="running"
          progress={exportProgress}
          stage={exportStage}
          currentItem={exportCurrentItem}
          elapsedTime={exportElapsedTime}
        />
      )}

      {/* 3. Export Completed Success Report */}
      {exportStatus === 'completed' && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/40 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-emerald-300">
                  {language === 'en'
                    ? 'Export and indexing completed successfully (100%)'
                    : 'Exportation et indexation terminées avec succès (100%)'}
                </h4>
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Zap size={10} />
                  {language === 'en' ? 'Turbo Indexing < 0.1s' : 'Indexation Turbo < 0.1s'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-1">
                {language === 'en' ? (
                  <>
                    All <span className="font-mono text-emerald-400">.inf</span>,{' '}
                    <span className="font-mono text-emerald-400">.sys</span>, and{' '}
                    <span className="font-mono text-emerald-400">.cat</span> files were exported. The local{' '}
                    <span className="font-mono text-emerald-400">manifest.json</span> and centralized{' '}
                    <span className="font-mono text-emerald-400">index.json</span> have been updated immediately.
                  </>
                ) : (
                  <>
                    Tous les fichiers <span className="font-mono text-emerald-400">.inf</span>,{' '}
                    <span className="font-mono text-emerald-400">.sys</span> et{' '}
                    <span className="font-mono text-emerald-400">.cat</span> ont été exportés. Le fichier{' '}
                    <span className="font-mono text-emerald-400">manifest.json</span> local et l'
                    <span className="font-mono text-emerald-400">index.json</span> centralisé ont été actualisés immédiatement.
                  </>
                )}
              </p>
              <div className="mt-2 p-2.5 bg-zinc-950/80 border border-emerald-500/20 rounded-lg text-xs font-mono text-zinc-200 break-all select-all flex items-center justify-between gap-2">
                <span>📁 {exportSummary?.folder || exportDestination}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenExportedFolder(exportSummary?.folder || exportDestination)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-98"
              >
                <Folder size={14} />
                <span>{language === 'en' ? 'Open exported folder' : 'Ouvrir le dossier exporté'}</span>
              </button>

              <button
                type="button"
                onClick={onGoToCatalog}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-98"
              >
                <Laptop size={14} />
                <span>{language === 'en' ? 'View in catalog' : 'Voir dans le catalogue'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onResetExport}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'New export' : 'Nouvelle exportation'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Error State */}
      {exportStatus === 'error' && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-300">{exportStage}</h4>
              <p className="text-xs text-zinc-300 mt-0.5 font-mono">{exportCurrentItem}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={onRetryExport}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Retry export' : "Réessayer l'exportation"}
            </button>
            <button
              type="button"
              onClick={onResetExport}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Cancel' : 'Annuler'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Destination Conflict Dialog */}
      {folderConflict && folderConflict.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-zinc-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {language === 'en' ? 'Folder already exists on network' : 'Dossier existant sur le réseau'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {language === 'en'
                    ? 'The destination folder already exists on server / disk:'
                    : 'Le dossier de destination existe déjà sur le serveur / disque :'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-cyan-300 break-all select-all">
              {folderConflict.targetPath}
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-300 font-medium">
                {language === 'en'
                  ? 'What would you like to do to continue the DISM export?'
                  : "Que souhaitez-vous faire pour continuer l'exportation DISM ?"}
              </p>

              {/* Option 1: Choisir un nouveau nom */}
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Folder size={14} />
                    {language === 'en' ? 'Option 1: Choose another folder name' : 'Option 1 : Choisir un autre nom de dossier'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={folderConflict.newFolderName}
                      onChange={(e) =>
                        onFolderConflictChange({ ...folderConflict, newFolderName: e.target.value })
                      }
                      placeholder={language === 'en' ? 'New folder name...' : 'Nouveau nom de dossier...'}
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={onConfirmRename}
                      disabled={!folderConflict.newFolderName.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {language === 'en' ? 'Export' : 'Exporter'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500">
                      {language === 'en' ? 'Suggestions:' : 'Suggestions :'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onFolderConflictChange({
                          ...folderConflict,
                          newFolderName: `${folderConflict.currentFolderName}_v2`,
                        })
                      }
                      className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
                    >
                      + _v2
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onFolderConflictChange({
                          ...folderConflict,
                          newFolderName: `${folderConflict.currentFolderName}_v3`,
                        })
                      }
                      className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
                    >
                      + _v3
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onFolderConflictChange({
                          ...folderConflict,
                          newFolderName: `${folderConflict.currentFolderName}_${new Date().getFullYear()}`,
                        })
                      }
                      className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
                    >
                      + _{new Date().getFullYear()}
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2: Remplacer le contenu existant */}
              <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-300">
                    {language === 'en' ? 'Option 2: Replace existing folder' : 'Option 2 : Remplacer le dossier existant'}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {language === 'en'
                      ? 'Overwrites and updates older drivers with current versions.'
                      : 'Écrase et met à jour les anciens pilotes avec les versions actuelles.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onConfirmOverwrite}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {language === 'en' ? 'Replace' : 'Remplacer'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onFolderConflictChange(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Cancel export' : "Annuler l'exportation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
