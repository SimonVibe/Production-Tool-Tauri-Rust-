import { useState, useEffect, useMemo } from 'react';
import { 
  X, Battery, BatteryCharging, BatteryWarning, Zap, RefreshCw, 
  Activity, ShieldCheck, HeartPulse,
  Clock, Timer
} from 'lucide-react';
import { BatteryStatus, AppConfig } from '../types';
import { hardwareAPI, formatBatteryDuration } from '../lib/tauriAdapter';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config?: AppConfig;
  onExecuteExternal?: (name: string, path: string) => void;
  battery?: BatteryStatus | null;
  onRefreshBattery?: () => Promise<any>;
  isUpdating?: boolean;
  sampleCount?: number;
}

export default function BatteryHealthModal({ 
  isOpen, 
  onClose, 
  battery: propBattery,
  onRefreshBattery,
  isUpdating: propIsUpdating,
  sampleCount: propSampleCount
}: Props) {
  const { language, t } = useLanguage();
  const [internalBattery, setInternalBattery] = useState<BatteryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const battery = propBattery ?? internalBattery;
  const isUpdating = propIsUpdating || false;
  const sampleCount = propSampleCount ?? battery?.sampleCount ?? (battery?.isAveraged ? 5 : 1);

  const fetchBatteryData = async () => {
    setIsLoading(true);
    try {
      if (onRefreshBattery) {
        await onRefreshBattery();
      } else {
        const data = await hardwareAPI.getBatteryStatus();
        setInternalBattery(data);
      }
    } catch (err) {
      console.warn('Erreur récupération statut batterie:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!propBattery) {
        fetchBatteryData();
      }
    }
  }, [isOpen, propBattery]);

  const durationInfo = useMemo(() => formatBatteryDuration(battery, language), [battery, language]);

  if (!isOpen) return null;

  const health = battery?.health ?? (battery?.designCapacity && battery?.fullChargeCapacity ? Math.round((battery.fullChargeCapacity / battery.designCapacity) * 100) : null);
  const wear = battery?.wearLevel ?? (health !== null ? Math.max(0, 100 - health) : null);

  const getHealthBadge = (h: number | null) => {
    if (h === null) return { label: t('battery_modal.health_unmeasured'), color: 'text-zinc-400 bg-zinc-800/60 border-zinc-700' };
    if (h >= 85) return { label: t('battery_modal.health_excellent'), color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50' };
    if (h >= 70) return { label: t('battery_modal.health_good'), color: 'text-blue-300 bg-blue-950/80 border-blue-500/50' };
    if (h >= 50) return { label: t('battery_modal.health_medium'), color: 'text-amber-300 bg-amber-950/80 border-amber-500/50' };
    return { label: t('battery_modal.health_poor'), color: 'text-rose-300 bg-rose-950/80 border-rose-500/50' };
  };

  const healthBadge = getHealthBadge(health);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden text-zinc-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <HeartPulse size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{t('battery_modal.title')}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${healthBadge.color}`}>
                  {healthBadge.label}
                </span>
                <span className="flex items-center space-x-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border border-emerald-500/30 bg-emerald-950/50 text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isUpdating ? 'animate-ping' : ''}`}></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span>{language === 'en' ? '5s Average' : 'Moyenne 5s'}</span>
                  <span className="text-zinc-500">({sampleCount} {language === 'en' ? 'samples' : 'éch.'})</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">{t('battery_modal.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchBatteryData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title={language === 'en' ? 'Force new sample and refresh immediately' : 'Forcer un nouvel échantillon et actualiser immédiatement'}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
              <span>{t('common.refresh')}</span>
            </button>

            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Main Visual Status Banner: 3 Cards (Charge, Autonomie/Recharge, Santé) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* 1. Charge Status Card */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span>{t('battery_modal.charge_level')}</span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-1 py-0.2 rounded">
                    {language === 'en' ? '5s avg.' : '5s moy.'}
                  </span>
                </span>
                {battery?.isCharging && (
                  <span className="flex items-center text-amber-400 font-bold text-[11px]">
                    <Zap size={13} className="mr-1 fill-amber-400 animate-pulse" /> {language === 'en' ? 'Charging' : 'En charge'}
                  </span>
                )}
                {!battery?.isCharging && battery?.acConnected && (
                  <span className="text-emerald-400 font-bold text-[11px]">{language === 'en' ? 'AC Power (100%)' : 'Secteur (100%)'}</span>
                )}
              </div>

              <div className="my-2.5 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {battery?.percentage !== null && battery?.percentage !== undefined ? `${battery.percentage}%` : 'N/A'}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono truncate">
                  {(() => {
                    if (language === 'en') {
                      if (battery?.isCharging) {
                        return `Charging (${battery.percentage ?? 100}% - 5s Avg.)`;
                      }
                      if (battery?.acConnected) {
                        return `On AC Power (${battery.percentage ?? 100}% - 5s Avg.)`;
                      }
                      return `On Battery (${battery?.percentage ?? 100}% - 5s Avg.)`;
                    }
                    return battery?.statusLabel || (battery?.acConnected ? 'Sur secteur' : 'Sur batterie');
                  })()}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-1">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    battery?.isCharging
                      ? 'bg-amber-400'
                      : (battery?.percentage ?? 100) <= 20
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, battery?.percentage ?? 0))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/60">
                <span>{language === 'en' ? 'Moving average: 5s' : 'Moyenne mobile : 5s'}</span>
                {battery?.rawPercentage !== undefined && battery?.rawPercentage !== null && (
                  <span className="text-zinc-400">{language === 'en' ? 'Instant' : 'Instantané'} : {battery.rawPercentage}%</span>
                )}
              </div>
            </div>

            {/* 2. Battery Duration Estimation Card */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} className={durationInfo.type === 'charging' ? 'text-amber-400' : 'text-cyan-400'} />
                  <span>{battery?.isCharging ? t('battery_modal.estimated_chargetime') : t('battery_modal.estimated_runtime')}</span>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 px-1 py-0.2 rounded">
                    {language === 'en' ? '5s avg.' : '5s moy.'}
                  </span>
                </span>
                {battery?.chargeRateWatts && (
                  <span className="text-amber-400 font-mono text-[10.5px]">+{battery.chargeRateWatts} W</span>
                )}
                {battery?.dischargeRateWatts && (
                  <span className="text-cyan-400 font-mono text-[10.5px]">-{battery.dischargeRateWatts} W</span>
                )}
              </div>

              <div className="my-2.5 flex items-baseline space-x-2">
                <span className={`text-2xl font-extrabold font-mono ${
                  durationInfo.type === 'charging' ? 'text-amber-300' : durationInfo.type === 'discharging' ? 'text-cyan-300' : 'text-zinc-200'
                }`}>
                  {language === 'en' && (durationInfo.short === 'En charge' || durationInfo.short === 'Charge')
                    ? 'Charging'
                    : durationInfo.short}
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 truncate mb-1">
                {language === 'en' && durationInfo.formatted.startsWith('En charge')
                  ? durationInfo.formatted.replace('En charge...', 'Charging...').replace('En charge', 'Charging')
                  : durationInfo.formatted}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/60">
                <span>{language === 'en' ? 'Continuous smoothing: 5s' : 'Lissage continu : 5s'}</span>
                <span className="text-cyan-400/90">{language === 'en' ? 'Cycle: 5s' : 'Cycle : 5s'}</span>
              </div>
            </div>

            {/* 3. Health Status Card */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider">{language === 'en' ? 'Health / Capacity' : 'Santé / Capacité'}</span>
                <span className="text-zinc-500 text-[11px]">{language === 'en' ? 'Wear' : 'Usure'} : {wear !== null ? `${wear}%` : 'N/A'}</span>
              </div>

              <div className="my-2.5 flex items-baseline space-x-2">
                <span className={`text-3xl font-extrabold font-mono ${
                  health !== null && health >= 80 ? 'text-emerald-400' : health !== null && health >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {health !== null ? `${health}%` : 'N/A'}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium truncate">
                  {healthBadge.label}
                </span>
              </div>

              {/* Health Bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    health !== null && health >= 80
                      ? 'bg-emerald-400'
                      : health !== null && health >= 60
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, health ?? 0))}%` }}
                />
              </div>
            </div>

          </div>

          {/* Detailed Specifications Table */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              {language === 'en' ? 'Detailed Battery Controller Metrics' : 'Métriques Détaillées du Contrôleur de Batterie'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.estimated_runtime')} :</span>
                <span className="font-bold text-cyan-400">
                  {battery?.estimatedRunTimeMinutes
                    ? `${Math.floor(battery.estimatedRunTimeMinutes / 60)} h ${battery.estimatedRunTimeMinutes % 60} min (${battery.estimatedRunTimeMinutes} min)`
                    : durationInfo.type === 'discharging'
                    ? durationInfo.formatted
                    : (language === 'en' ? 'On AC Power' : 'Sur secteur (Alimentation AC)')}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.estimated_chargetime')} :</span>
                <span className="font-bold text-amber-400">
                  {battery?.isCharging
                    ? (battery?.estimatedChargeTimeMinutes ? `~${battery.estimatedChargeTimeMinutes} min` : durationInfo.formatted)
                    : (language === 'en' ? 'N/A (Discharging or Full)' : 'Non applicable (Non branché / Chargé)')}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.design_capacity')} :</span>
                <span className="font-bold text-zinc-100">{battery?.designCapacity ? `${battery.designCapacity.toLocaleString()} mWh` : t('common.na')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.full_capacity')} :</span>
                <span className="font-bold text-emerald-400">{battery?.fullChargeCapacity ? `${battery.fullChargeCapacity.toLocaleString()} mWh` : t('common.na')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.cycle_count')} :</span>
                <span className="font-bold text-zinc-100">{battery?.cycleCount ? `${battery.cycleCount} ${language === 'en' ? 'cycles' : 'cycles'}` : t('common.na')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{language === 'en' ? 'Wear Level' : 'Niveau d\'usure'} :</span>
                <span className={`font-bold ${wear && wear > 20 ? 'text-amber-400' : 'text-zinc-100'}`}>
                  {wear !== null ? `${wear}%` : t('common.na')}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.voltage')} :</span>
                <span className="font-bold text-zinc-100">{battery?.voltage ? `${battery.voltage} V` : t('common.na')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.power_rate')} :</span>
                <span className="font-bold text-zinc-100">
                  {battery?.chargeRateWatts
                    ? `+${battery.chargeRateWatts} W (${language === 'en' ? 'Charging' : 'Charge'})`
                    : battery?.dischargeRateWatts
                    ? `-${battery.dischargeRateWatts} W (${language === 'en' ? 'Discharging' : 'Décharge'})`
                    : 'Standard'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.chemistry')} :</span>
                <span className="font-bold text-zinc-100">{battery?.chemistry || 'Lithium-Ion (Li-ion)'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.manufacturer')} :</span>
                <span className="font-bold text-zinc-100">{battery?.manufacturer || 'OEM Standard'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{t('battery_modal.battery_sn')} :</span>
                <span className="font-bold text-zinc-100">{battery?.serialNumber || (language === 'en' ? 'Unknown / ACPI' : 'Inconnu / ACPI')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-400">{language === 'en' ? 'Smoothing mode' : 'Mode de lissage'} :</span>
                <span className="font-bold text-emerald-400">{language === 'en' ? 'Moving average (5s)' : 'Moyenne glissante (5 secondes)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-zinc-950 px-6 py-3 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
