import React from 'react';
import { ShieldAlert, Zap, AlertTriangle, Shield } from 'lucide-react';
import { BatteryStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  isAdmin: boolean;
  batteryStatus: BatteryStatus | null;
  onRestartAsAdmin?: () => void;
  compact?: boolean;
}

export const PreFlightSafetyBanner: React.FC<Props> = ({
  isAdmin,
  batteryStatus,
  onRestartAsAdmin,
  compact = false,
}) => {
  const { language, t } = useLanguage();
  const isOnBattery = Boolean(batteryStatus?.present && !batteryStatus?.acConnected);
  const batteryPct = batteryStatus?.percentage ?? 0;

  if (isAdmin && !isOnBattery) {
    return null;
  }

  const remainingTimeStr = batteryStatus?.estimatedRunTimeMinutes 
    ? ` • ~${Math.floor(batteryStatus.estimatedRunTimeMinutes / 60)}h${batteryStatus.estimatedRunTimeMinutes % 60}m ${language === 'en' ? 'rem.' : 'rest.'}`
    : '';

  return (
    <div className={`space-y-2.5 ${compact ? 'text-xs' : ''}`}>
      {/* 1. Alerte Privilèges Administrateur Manquants */}
      {!isAdmin && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-rose-200">{t('preflight.admin_required')}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">
                  {t('preflight.limited_rights')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                {t('preflight.admin_desc')}
              </p>
            </div>
          </div>

          {onRestartAsAdmin && (
            <button
              type="button"
              onClick={onRestartAsAdmin}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
              title={t('preflight.relaunch_tooltip')}
            >
              <Shield size={14} />
              <span>{t('preflight.relaunch_admin')}</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Alerte Alimentation sur Batterie Seule */}
      {isOnBattery && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-200">
                  {t('preflight.on_battery')} ({batteryPct}%{remainingTimeStr})
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 flex items-center gap-1">
                  <Zap size={10} /> {t('preflight.charger_unplugged')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                {t('preflight.battery_warning_desc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
