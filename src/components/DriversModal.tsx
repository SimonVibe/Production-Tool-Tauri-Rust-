import { X, Wifi, DownloadCloud, Cpu, CheckCircle2, AlertTriangle, ArrowRight, HardDrive } from 'lucide-react';
import { AppConfig } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  config: AppConfig;
  onExecute: (name: string, path: string) => void;
  onClose: () => void;
  onOpenNasModal: () => void;
  onOpenWuModal: () => void;
  missingDriversCount?: number | null;
}

export default function DriversModal({ config, onExecute, onClose, onOpenNasModal, onOpenWuModal, missingDriversCount }: Props) {
  const { t, language } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <Cpu size={22} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">{t('drivers_hub.title')}</h3>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose} 
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {missingDriversCount !== null && missingDriversCount !== undefined && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              missingDriversCount > 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center space-x-2">
                {missingDriversCount > 0 ? <AlertTriangle size={18} className="text-rose-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
                <span>{t('drivers_hub.dev_manager')}</span>
              </div>
              <span className="font-bold text-sm">
                {missingDriversCount > 0 
                  ? `${missingDriversCount} ${t('actions.missing_drivers')}` 
                  : t('actions.all_drivers_installed')}
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-400 font-medium">
            {t('drivers_hub.choose_method')}
          </p>

          <div className="space-y-3">
            {/* Option 1: Pilotes Réseau / NAS */}
            <button
              onClick={() => {
                onClose();
                onOpenNasModal();
              }}
              className="w-full bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-4 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white rounded-xl transition-colors shrink-0 border border-blue-500/20">
                  <Wifi size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-100 text-sm group-hover:text-blue-400 transition-colors">
                    {t('drivers_hub.opt1_title')}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    {t('drivers_hub.opt1_desc')}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-mono bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                    {t('drivers_hub.detailed_badge')}
                  </span>
                </div>
              </div>
              <ArrowRight size={18} className="text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* Option 2: Windows Update */}
            <button
              onClick={() => {
                onClose();
                onOpenWuModal();
              }}
              className="w-full bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-4 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white rounded-xl transition-colors shrink-0 border border-emerald-500/20">
                  <DownloadCloud size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-100 text-sm group-hover:text-emerald-400 transition-colors">
                    {t('drivers_hub.opt2_title')}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    {t('drivers_hub.opt2_desc')}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    {t('drivers_hub.detailed_badge')}
                  </span>
                </div>
              </div>
              <ArrowRight size={18} className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* Option 3: Snappy Driver Installer (SDIO) */}
            <button
              onClick={() => {
                onExecute('Snappy Driver Installer (SDIO)', config.driverSdioPath || 'SDIO\\SDI_x64_R.exe');
                onClose();
              }}
              className="w-full bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-3.5 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 rounded-xl transition-colors shrink-0 border border-amber-500/20">
                  <Cpu size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-200 text-xs group-hover:text-amber-300 transition-colors">
                    {t('drivers_hub.opt3_title')}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    {config.driverSdioPath || 'SDIO\\SDI_x64_R.exe'}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            {/* Option 4: Gestionnaire de périphériques direct */}
            <button
              onClick={() => {
                onExecute(language === 'en' ? 'Device Manager' : 'Gestionnaire de périphériques', 'devmgmt.msc');
                onClose();
              }}
              className="w-full bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-purple-500/50 rounded-xl p-3.5 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white rounded-xl transition-colors shrink-0 border border-purple-500/20">
                  <HardDrive size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-200 text-xs group-hover:text-purple-300 transition-colors">
                    {t('drivers_hub.opt4_title')}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {t('drivers_hub.opt4_desc')}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 px-6 py-3.5 flex justify-end border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}

