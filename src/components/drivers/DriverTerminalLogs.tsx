import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateLogMessage } from '../../lib/logTranslator';

export interface DriverLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'cmd';
}

interface Props {
  logs: DriverLogEntry[];
  showLogs: boolean;
  onToggleShowLogs: () => void;
  onClearLogs?: () => void;
  onCopyLogs: () => void;
  copied: boolean;
}

export const DriverTerminalLogs: React.FC<Props> = ({
  logs,
  showLogs,
  onToggleShowLogs,
  onClearLogs,
  onCopyLogs,
  copied,
}) => {
  const { language } = useLanguage();
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, showLogs]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchTerm.trim() && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
      {/* Header bar */}
      <div
        onClick={onToggleShowLogs}
        className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors select-none"
      >
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-xs font-bold text-zinc-300">
            {language === 'en' ? 'PnPUtil / DISM Execution Log' : "Journal d'exécution PnPUtil / DISM"}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({logs.length} {language === 'en' ? 'entries' : 'entrées'})
          </span>
        </div>

        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {logs.length > 0 && (
            <>
              {onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] rounded border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                  title={language === 'en' ? 'Clear logs' : 'Effacer les logs'}
                >
                  <Trash2 size={11} />
                  <span>{language === 'en' ? 'Clear' : 'Effacer'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onCopyLogs}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded border border-zinc-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                title={language === 'en' ? 'Copy logs to clipboard' : 'Copier les logs dans le presse-papier'}
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? (language === 'en' ? 'Copied!' : 'Copié !') : (language === 'en' ? 'Copy' : 'Copier')}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleShowLogs}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer p-0.5"
            title={showLogs ? (language === 'en' ? 'Collapse' : 'Réduire') : (language === 'en' ? 'Expand' : 'Déplier')}
          >
            {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Filter toolbar inside drawer when expanded */}
      {showLogs && logs.length > 0 && (
        <div className="px-3 py-1.5 bg-zinc-950/95 border-b border-zinc-850 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-zinc-500 font-mono">{language === 'en' ? 'Filter:' : 'Filtre:'}</span>
            {(['all', 'cmd', 'info', 'success', 'warning', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(lvl)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  filterLevel === lvl
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'en' ? 'Filter text...' : 'Filtrer texte...'}
              className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-200 placeholder:text-zinc-600 w-32 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Content list */}
      {showLogs && (
        <div
          ref={logContainerRef}
          className="p-3 bg-zinc-950 font-mono text-[11px] h-36 overflow-y-auto space-y-1 custom-scrollbar"
        >
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">
              {language === 'en' ? 'Waiting for an action...' : "En attente d'une action..."}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-zinc-600 italic">
              {language === 'en' ? 'No entries match the filter.' : 'Aucune entrée ne correspond au filtre.'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
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
        </div>
      )}
    </div>
  );
};
