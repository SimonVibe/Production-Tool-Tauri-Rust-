import React from 'react';
import { RefreshCw, Check, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  type: 'import' | 'export';
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  stage: string;
  currentItem: string;
  elapsedTime: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export const DriverProgressCard: React.FC<Props> = ({
  type,
  status,
  progress,
  stage,
  currentItem,
  elapsedTime,
  onDismiss,
  onRetry,
}) => {
  const { language } = useLanguage();

  if (status === 'idle') return null;

  const isError = status === 'error';
  const isCompleted = status === 'completed';
  const isRunning = status === 'running';

  const isImport = type === 'import';

  const stagesImport = [
    { threshold: 15, label: language === 'en' ? '1. Analysis' : '1. Analyse' },
    { threshold: 30, label: language === 'en' ? '2. Injection' : '2. Injection' },
    { threshold: 80, label: language === 'en' ? '3. Plug & Play' : '3. Plug & Play (PnP)' },
    { threshold: 100, label: language === 'en' ? '4. Done' : '4. Terminé' },
  ];

  const stagesExport = [
    { threshold: 15, label: language === 'en' ? '1. Check Folder' : '1. Vérif Dossier' },
    { threshold: 30, label: language === 'en' ? '2. OEM Scan' : '2. Analyse OEM' },
    { threshold: 60, label: language === 'en' ? '3. DISM Export' : '3. Extraction DISM' },
    { threshold: 95, label: language === 'en' ? '4. NAS Index' : '4. Index NAS' },
  ];

  const stageList = isImport ? stagesImport : stagesExport;

  return (
    <div
      className={`p-4 border rounded-xl space-y-3.5 shadow-lg animate-in fade-in duration-200 ${
        isError
          ? 'bg-rose-950/20 border-rose-900/50'
          : isCompleted
          ? 'bg-emerald-950/20 border-emerald-900/50'
          : isImport
          ? 'bg-zinc-950 border-emerald-500/40'
          : 'bg-zinc-950 border-blue-500/40'
      }`}
    >
      {/* Top line with stage and percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          {isRunning && (
            <RefreshCw
              size={16}
              className={`animate-spin shrink-0 ${isImport ? 'text-emerald-400' : 'text-blue-400'}`}
            />
          )}
          {isCompleted && <Check size={16} className="text-emerald-400 shrink-0" />}
          {isError && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
          <div className="min-w-0">
            <span
              className={`text-xs font-bold block truncate ${
                isError ? 'text-rose-400' : 'text-white'
              }`}
            >
              {stage}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 block truncate max-w-md">
              {currentItem}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 pl-3">
          <span
            className={`text-lg font-mono font-black tabular-nums ${
              isError
                ? 'text-rose-400'
                : isCompleted
                ? 'text-emerald-400'
                : isImport
                ? 'text-emerald-400'
                : 'text-blue-400'
            }`}
          >
            {progress}%
          </span>
          {isRunning && (
            <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-end space-x-1 mt-0.5">
              <Clock
                size={10}
                className={`animate-spin shrink-0 ${isImport ? 'text-emerald-400' : 'text-blue-400'}`}
              />
              <span>{formatSeconds(elapsedTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 relative ${
              isError
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                : isCompleted
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : isImport
                ? 'bg-gradient-to-r from-emerald-600 via-green-400 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                : 'bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          >
            {isRunning && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />}
          </div>
        </div>
      </div>

      {/* Dynamic Explanation of Windows Plug & Play */}
      {isImport && progress >= 80 && isRunning && (
        <div className="flex items-start space-x-2.5 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-[11px] text-emerald-200/90 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          <Sparkles size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-300">
              {language === 'en' ? 'Active hardware Plug & Play stage: ' : 'Phase Plug & Play matérielle active : '}
            </span>
            {language === 'en'
              ? 'Windows is initializing and binding each detected device (GPU, Audio, Wi-Fi, controllers). This normal system negotiation takes 30s to 2min depending on drivers.'
              : 'Windows initialise et associe physiquement chaque périphérique détecté (carte graphique, puce audio, Wi-Fi, contrôleur). Cette négociation système normale requiert de 30 secondes à 2 minutes selon les pilotes.'}
          </div>
        </div>
      )}

      {/* Stage Progress Pills */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {stageList.map((step, idx) => {
          const reached = progress >= step.threshold;
          return (
            <div
              key={idx}
              className={`p-1.5 rounded-lg border text-center text-[10px] font-medium transition-all ${
                reached
                  ? isError
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                    : isImport
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>

      {/* Action buttons (dismiss / retry) */}
      <div className="flex justify-end items-center gap-2 pt-1">
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Retry' : 'Réessayer'}
          </button>
        )}
        {(isCompleted || isError) && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Hide status' : "Masquer l'état"}
          </button>
        )}
      </div>
    </div>
  );
};
