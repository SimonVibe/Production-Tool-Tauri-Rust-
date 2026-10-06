import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Copy, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  X,
  Search,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { translateLogMessage } from '../lib/logTranslator';

export type LogLevel = 'success' | 'error' | 'warning' | 'info';

export interface ParsedLog {
  raw: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
}

export function parseLogEntry(rawLog: string, lang: 'fr' | 'en' = 'en'): ParsedLog {
  let log = rawLog.trim();
  let timestamp = '';

  // Extract timestamp if present e.g. [14:05:22] or [2:05:22 PM]
  const timeMatch = log.match(/^\[(.*?)\]\s*/);
  if (timeMatch) {
    timestamp = timeMatch[1];
    log = log.substring(timeMatch[0].length);
  }

  const upper = log.toUpperCase();
  const isEn = lang === 'en';
  let level: LogLevel = 'info';
  let tag = 'INFO';
  let message = log;

  if (
    upper.includes('ERREUR') || 
    upper.includes('EXCEPTION') || 
    upper.includes('ERROR') || 
    upper.includes('ÉCHOUÉ') ||
    upper.includes('FAILED') ||
    upper.includes('[ERREUR]') ||
    upper.includes('❌')
  ) {
    level = 'error';
    tag = isEn ? 'ERROR' : 'ERREUR';
    message = log.replace(/^(ERREUR\s*:\s*|EXCEPTION\s*:\s*|ERROR\s*:\s*|\[ERREUR\]\s*)/i, '');
  } else if (
    upper.includes('SUCCÈS') || 
    upper.includes('SUCCESS') || 
    upper.includes('RÉUSSI') ||
    upper.includes('ÉTABLIE') ||
    upper.includes('SAUVEGARDÉ') ||
    upper.includes('ACTUALISÉ') ||
    upper.includes('[SUCCES]') ||
    upper.includes('✓') ||
    upper.includes('✨')
  ) {
    level = 'success';
    tag = isEn ? 'SUCCESS' : 'SUCCÈS';
    message = log.replace(/^(SUCCÈS\s*:\s*|SUCCESS\s*:\s*|\[SUCCES\]\s*)/i, '');
  } else if (
    upper.includes('WARN') || 
    upper.includes('ATTENTION') || 
    upper.includes('INFORMATION RÉSEAU') ||
    upper.includes('AVERTISSEMENT') ||
    upper.includes('⚠️')
  ) {
    level = 'warning';
    tag = isEn ? 'WARNING' : 'ATTENTION';
    message = log.replace(/^(AVERTISSEMENT\s*:\s*|ATTENTION\s*:\s*|WARN\s*:\s*)/i, '');
  } else if (
    upper.startsWith('[CMD]') ||
    upper.includes('DISM.EXE') ||
    upper.includes('PNPUTIL') ||
    upper.includes('SHUTDOWN')
  ) {
    level = 'info';
    tag = 'CMD';
    message = log.replace(/^\[CMD\]\s*/i, '');
  } else if (
    upper.includes('LANCEMENT') || 
    upper.includes('LAUNCHING') ||
    upper.includes('INITIALISÉ') || 
    upper.includes('INITIALIZED') || 
    upper.includes('ACTUALISATION')
  ) {
    level = 'info';
    tag = 'ACTION';
  } else if (upper.startsWith('[INFO]')) {
    level = 'info';
    tag = 'INFO';
    message = log.replace(/^\[INFO\]\s*/i, '');
  }

  if (isEn) {
    message = translateLogMessage(message, 'en');
  }

  return {
    raw: rawLog,
    timestamp,
    level,
    tag,
    message,
  };
}

interface DebugLogViewerProps {
  logs: string[];
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  showModal?: boolean;
  onOpenModal?: () => void;
  onCloseModal?: () => void;
  onClearLogs?: () => void;
}

export default function DebugLogViewer({ 
  logs, 
  isExpanded: propIsExpanded, 
  onToggleExpand, 
  showModal, 
  onOpenModal,
  onCloseModal,
  onClearLogs
}: DebugLogViewerProps) {
  const { t, language } = useLanguage();
  // Read initial collapsed state from localStorage
  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_logs_expanded') || localStorage.getItem('opeq_logs_expanded');
    return saved === 'true';
  });

  const isExpanded = propIsExpanded !== undefined ? propIsExpanded : internalExpanded;

  const handleToggle = () => {
    const nextState = !isExpanded;
    if (onToggleExpand) {
      onToggleExpand(nextState);
    } else {
      setInternalExpanded(nextState);
      localStorage.setItem('app_logs_expanded', String(nextState));
    }
  };

  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const [modalFilter, setModalFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const [modalSearch, setModalSearch] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [internalShowFullScreenModal, setInternalShowFullScreenModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  
  // The popup modal is active if either external prop or internal state is true
  const isModalOpen = (showModal ?? false) || internalShowFullScreenModal;

  const handleCloseModal = () => {
    if (onCloseModal) onCloseModal();
    setInternalShowFullScreenModal(false);
  };

  const handleOpenModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onOpenModal) onOpenModal();
    setInternalShowFullScreenModal(true);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const parsedLogs = useMemo(() => {
    return logs.map(log => parseLogEntry(log, language));
  }, [logs, language]);

  const counts = useMemo(() => {
    let success = 0;
    let error = 0;
    let warning = 0;
    let info = 0;
    for (const l of parsedLogs) {
      if (l.level === 'success') success++;
      else if (l.level === 'error') error++;
      else if (l.level === 'warning') warning++;
      else info++;
    }
    return { success, error, warning, info, all: parsedLogs.length };
  }, [parsedLogs]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return parsedLogs;
    if (filter === 'success') return parsedLogs.filter(l => l.level === 'success');
    if (filter === 'error') return parsedLogs.filter(l => l.level === 'error' || l.level === 'warning');
    if (filter === 'info') return parsedLogs.filter(l => l.level === 'info');
    return parsedLogs;
  }, [parsedLogs, filter]);

  const modalFilteredLogs = useMemo(() => {
    let result = parsedLogs;
    if (modalFilter === 'success') {
      result = result.filter(l => l.level === 'success');
    } else if (modalFilter === 'error') {
      result = result.filter(l => l.level === 'error' || l.level === 'warning');
    } else if (modalFilter === 'info') {
      result = result.filter(l => l.level === 'info');
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      result = result.filter(l => 
        l.message.toLowerCase().includes(q) || 
        l.tag.toLowerCase().includes(q) || 
        l.timestamp.toLowerCase().includes(q)
      );
    }
    return result;
  }, [parsedLogs, modalFilter, modalSearch]);

  const lastLog = useMemo(() => {
    if (parsedLogs.length === 0) return null;
    return parsedLogs[parsedLogs.length - 1];
  }, [parsedLogs]);

  // Auto-scroll in panel when new logs arrive
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, isExpanded]);

  // Auto-scroll in modal when opened or updated
  useEffect(() => {
    if (isModalOpen && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = modalScrollRef.current.scrollHeight;
    }
  }, [isModalOpen, logs.length]);

  const handleCopyLogs = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (logs.length === 0) return;
    const text = language === 'en'
      ? parsedLogs.map(l => (l.timestamp ? `[${l.timestamp}] [${l.tag}] ${l.message}` : `[${l.tag}] ${l.message}`)).join('\n')
      : logs.join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  /* ========================================================================= */
  /* MODAL POPUP (TOUJOURS RENDUE DANS LE DOM QUEL QUE SOIT L'ÉTAT DU BANDEAU)  */
  /* ========================================================================= */
  const renderFullScreenModal = () => {
    if (!isModalOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-100"
        onClick={handleCloseModal}
      >
        <div 
          className="bg-zinc-950 border border-zinc-700/80 w-full max-w-4xl h-[85vh] max-h-[750px] rounded-2xl flex flex-col p-4 sm:p-5 shadow-2xl space-y-3 font-mono"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2.5 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-zinc-900 text-emerald-400 rounded-xl border border-zinc-800 shadow-inner">
                <Terminal size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {t('logs.modal_title')}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold">
                    {counts.all} {language === 'en' ? `event${counts.all > 1 ? 's' : ''}` : `événement${counts.all > 1 ? 's' : ''}`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {t('logs.modal_subtitle')}
                </p>
              </div>
            </div>

            {/* Actions: Copy & Close */}
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              {logs.length > 0 && (
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer"
                  title={t('logs.copy_tooltip')}
                >
                  {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{isCopied ? t('common.copied') : t('logs.copy_all')}</span>
                </button>
              )}

              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 text-xs rounded-lg border border-zinc-800 hover:border-rose-800 transition-colors cursor-pointer"
                  title={language === 'en' ? "Clear session logs" : "Effacer les logs de la session"}
                >
                  <Trash2 size={13} />
                  <span>{t('common.clear')}</span>
                </button>
              )}

              <button
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
                title={language === 'en' ? "Close logs window (Esc)" : "Fermer la fenêtre des logs (Échap)"}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Filter Toolbar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 py-1">
            {/* Filter Buttons */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <button
                onClick={() => setModalFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  modalFilter === 'all'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {t('common.all')} ({counts.all})
              </button>

              {counts.success > 0 && (
                <button
                  onClick={() => setModalFilter('success')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalFilter === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                      : 'text-emerald-500/80 hover:text-emerald-400 hover:bg-emerald-950/20'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {t('common.success')} ({counts.success})
                </button>
              )}

              {(counts.error > 0 || counts.warning > 0) && (
                <button
                  onClick={() => setModalFilter('error')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalFilter === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-xs'
                      : 'text-rose-500/80 hover:text-rose-400 hover:bg-rose-950/20'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {t('logs.errors_and_warnings')} ({counts.error + counts.warning})
                </button>
              )}

              {counts.info > 0 && (
                <button
                  onClick={() => setModalFilter('info')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalFilter === 'info'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-xs'
                      : 'text-sky-500/80 hover:text-sky-400 hover:bg-sky-950/20'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  {t('logs.info_actions')} ({counts.info})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex items-center min-w-[200px] flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder={t('logs.search_placeholder')}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
              />
              {modalSearch && (
                <button
                  onClick={() => setModalSearch('')}
                  className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Modal Log Entries List */}
          <div 
            ref={modalScrollRef} 
            className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs"
          >
            {modalFilteredLogs.length === 0 ? (
              <div className="text-zinc-500 italic py-6 text-center text-xs">
                {logs.length === 0
                  ? t('logs.no_events')
                  : t('logs.empty_filter')}
              </div>
            ) : (
              modalFilteredLogs.map((item, idx) => {
                const isError = item.level === 'error';
                const isWarning = item.level === 'warning';
                const isSuccess = item.level === 'success';

                return (
                  <div 
                    key={idx} 
                    className={`flex items-start space-x-2.5 py-1.5 px-2.5 rounded-lg transition-colors leading-relaxed ${
                      isError
                        ? 'bg-rose-950/30 text-rose-200 border-l-2 border-rose-500'
                        : isWarning
                        ? 'bg-amber-950/30 text-amber-200 border-l-2 border-amber-500'
                        : isSuccess
                        ? 'bg-emerald-950/25 text-emerald-200 border-l-2 border-emerald-500'
                        : 'bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900/90'
                    }`}
                  >
                    {item.timestamp && (
                      <span className="text-zinc-500 text-xs shrink-0 select-none font-mono">
                        [{item.timestamp}]
                      </span>
                    )}

                    <div className="shrink-0 pt-0.5">
                      {isError && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertCircle size={10} />
                          {item.tag}
                        </span>
                      )}
                      {isWarning && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <AlertTriangle size={10} />
                          {item.tag}
                        </span>
                      )}
                      {isSuccess && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 size={10} />
                          {item.tag}
                        </span>
                      )}
                      {!isError && !isWarning && !isSuccess && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          <Info size={10} />
                          {item.tag}
                        </span>
                      )}
                    </div>

                    <span className="flex-1 break-words font-mono text-zinc-100 select-text">
                      {item.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-900 shrink-0">
            <span>
              {language === 'en'
                ? `Showing ${modalFilteredLogs.length} of ${logs.length} ${logs.length > 1 ? 'entries' : 'entry'}`
                : `Affichage de ${modalFilteredLogs.length} sur ${logs.length} entrée${logs.length > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={handleCloseModal}
              className="px-4 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
            >
              {language === 'en' ? 'Close (Esc)' : 'Fermer (Échap)'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ========================================================================= */
  /* MODE COMPACT / BANDEAU D'ÉTAT (Gagne ~150px de hauteur sur l'écran)       */
  /* ========================================================================= */
  if (!isExpanded) {
    return (
      <>
        <div 
          onClick={handleToggle}
          className="bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm font-mono text-[11px] transition-all cursor-pointer select-none group backdrop-blur-xs"
          title={language === 'en' ? 'Click to expand event log (Shortcut [L])' : 'Cliquer pour déplier le journal des événements (Raccourci [L])'}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
            <div className="flex items-center space-x-1.5 shrink-0">
              <div className="p-1 rounded-md bg-zinc-900 text-emerald-400 group-hover:text-emerald-300 border border-zinc-800">
                <Terminal size={12} />
              </div>
              <span className="font-bold text-zinc-300 text-xs flex items-center gap-1">
                <span>{language === 'en' ? 'Logs' : 'Journal'}</span>
                <span className="text-[10px] text-zinc-500 font-normal font-mono">({counts.all})</span>
              </span>
            </div>

            {/* Badges d'état condensés */}
            {counts.error > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                {counts.error} err
              </span>
            )}

            {/* Dernier message en temps réel */}
            {lastLog ? (
              <div className="flex items-center space-x-1.5 min-w-0 flex-1 truncate text-zinc-400 text-[10.5px]">
                <span className="text-zinc-600 text-[9.5px] shrink-0">
                  {lastLog.timestamp ? `[${lastLog.timestamp}]` : '•'}
                </span>
                <span className={`shrink-0 text-[9px] font-bold px-1 rounded uppercase ${
                  lastLog.level === 'error' 
                    ? 'bg-rose-500/20 text-rose-300' 
                    : lastLog.level === 'warning'
                    ? 'bg-amber-500/20 text-amber-300'
                    : lastLog.level === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-sky-500/10 text-sky-300'
                }`}>
                  {lastLog.tag}
                </span>
                <span className="truncate text-zinc-300 group-hover:text-white transition-colors">
                  {lastLog.message}
                </span>
              </div>
            ) : (
              <span className="text-zinc-600 text-[10.5px] italic">
                {t('logs.waiting')}
              </span>
            )}
          </div>

          {/* Boutons d'actions à droite */}
          <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Bouton Ouvrir Fenêtre Logs */}
            <button
              onClick={handleOpenModal}
              className="flex items-center space-x-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/70 hover:border-emerald-500/50 rounded-lg transition-all cursor-pointer shadow-2xs group/btn"
              title={t('logs.open_fullscreen')}
            >
              <Terminal size={12} className="text-emerald-400 group-hover/btn:scale-110 transition-transform" />
              <span className="text-[10.5px] font-semibold">{t('logs.compact_title')}</span>
              <Maximize2 size={10} className="text-zinc-500 group-hover/btn:text-emerald-400 ml-0.5" />
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleCopyLogs}
                className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 p-1.5 rounded-lg border border-transparent hover:border-zinc-700 transition-colors cursor-pointer"
                title={t('logs.copy_tooltip')}
              >
                {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            )}

            <button
              onClick={handleToggle}
              className="flex items-center space-x-1 pl-2 pr-1.5 py-1 border-l border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
              title={t('logs.drawer_toggle')}
            >
              <kbd className="hidden sm:inline-block text-[9px] font-mono bg-zinc-900 px-1 py-0.2 rounded text-zinc-500 border border-zinc-800">L</kbd>
              <span className="text-[10.5px] font-medium hidden sm:inline">{t('logs.drawer_expand')}</span>
              <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Modal Pop-up always mounted and visible when isModalOpen is true */}
        {renderFullScreenModal()}
      </>
    );
  }

  /* ========================================================================= */
  /* MODE DÉVELOPPÉ (Hauteur ergonomique ~130px avec filtres et défilement)     */
  /* ========================================================================= */
  return (
    <>
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col h-[130px] sm:h-[145px] shadow-lg font-mono text-[11px] transition-all">
        {/* Console Header with Category Filters, Copy, Fullscreen and Minimize */}
        <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-1.5 border-b border-zinc-900 mb-1.5 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="flex items-center gap-1.5 font-bold text-zinc-200">
              <Terminal size={12} className="text-emerald-400" />
              {t('logs.title')}
            </span>

            {/* Quick Filter Buttons with Counts */}
            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('common.all')} ({counts.all})
              </button>

              {counts.success > 0 && (
                <button
                  onClick={() => setFilter('success')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    filter === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-emerald-500/70 hover:text-emerald-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {t('common.success')} ({counts.success})
                </button>
              )}

              {(counts.error > 0 || counts.warning > 0) && (
                <button
                  onClick={() => setFilter('error')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    filter === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-rose-500/70 hover:text-rose-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {t('logs.errors')} ({counts.error + counts.warning})
                </button>
              )}

              {counts.info > 0 && (
                <button
                  onClick={() => setFilter('info')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    filter === 'info'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-sky-500/70 hover:text-sky-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  {t('logs.info')} ({counts.info})
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {logs.length > 0 && (
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 text-[9.5px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 px-2 py-0.5 rounded transition-colors cursor-pointer border border-zinc-800"
                title={t('logs.copy_tooltip')}
              >
                {isCopied ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold">{t('common.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>{t('common.copy')}</span>
                  </>
                )}
              </button>
            )}

            {/* Plein écran Modal Trigger */}
            <button
              onClick={handleOpenModal}
              className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-900 rounded transition-colors cursor-pointer"
              title={t('logs.open_fullscreen')}
            >
              <Maximize2 size={12} />
            </button>

            {/* Bouton Réduire */}
            <button
              onClick={handleToggle}
              className="flex items-center space-x-1 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 transition-colors cursor-pointer"
              title={language === 'en' ? 'Collapse event log (Shortcut [L])' : 'Réduire le journal (Raccourci [L])'}
            >
              <kbd className="text-[8.5px] font-mono text-zinc-500">L</kbd>
              <span>{t('logs.drawer_collapse')}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>

        {/* Log Entries List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 custom-scrollbar text-[10.5px] pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 italic py-1">
              {logs.length === 0
                ? t('logs.waiting')
                : t('logs.empty_filter')}
            </div>
          ) : (
            filteredLogs.map((item, idx) => {
              const isError = item.level === 'error';
              const isWarning = item.level === 'warning';
              const isSuccess = item.level === 'success';

              return (
                <div
                  key={idx}
                  className={`flex items-start space-x-2 px-2 py-0.5 rounded transition-colors ${
                    isError
                      ? 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500'
                      : isWarning
                      ? 'bg-amber-950/30 text-amber-300 border-l-2 border-amber-500'
                      : isSuccess
                      ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                      : 'bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Timestamp */}
                  {item.timestamp && (
                    <span className="text-zinc-500 text-[10px] shrink-0 select-none font-mono">
                      [{item.timestamp}]
                    </span>
                  )}

                  {/* Level Badge / Icon */}
                  <div className="shrink-0 flex items-center pt-0.5">
                    {isError && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertCircle size={9} />
                        {item.tag}
                      </span>
                    )}
                    {isWarning && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle size={9} />
                        {item.tag}
                      </span>
                    )}
                    {isSuccess && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 size={9} />
                        {item.tag}
                      </span>
                    )}
                    {!isError && !isWarning && !isSuccess && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Info size={9} />
                        {item.tag}
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <span className="flex-1 break-words font-mono leading-tight">
                    {item.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Pop-up always mounted and visible when isModalOpen is true */}
      {renderFullScreenModal()}
    </>
  );
}
