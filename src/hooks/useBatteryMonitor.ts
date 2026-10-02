import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BatteryStatus } from '../types';
import { hardwareAPI, formatBatteryDuration, BatteryDurationInfo } from '../lib/tauriAdapter';

export interface BatterySample {
  timestamp: number;
  status: BatteryStatus;
}

export interface BatteryMonitorOptions {
  /**
   * Update interval for publishing the moving average to the UI (default 5000ms / 5 seconds)
   */
  updateIntervalMs?: number;
  /**
   * Sampling rate from the hardware controller (default 1000ms / 1 second)
   */
  sampleRateMs?: number;
  /**
   * Rolling time window for calculating the moving average (default 5000ms / 5 seconds)
   */
  windowMs?: number;
  /**
   * UI language for formatting battery text (default 'en')
   */
  lang?: 'fr' | 'en';
}

export interface UseBatteryMonitorReturn {
  batteryStatus: BatteryStatus | null;
  rawBatteryStatus: BatteryStatus | null;
  batteryLevel: number | null;
  batteryDurationInfo: BatteryDurationInfo;
  sampleCount: number;
  lastUpdated: number | null;
  isUpdating: boolean;
  refreshBattery: () => Promise<BatteryStatus | null>;
  history: BatterySample[];
}

/**
 * Calculates the moving average of battery metrics over the specified window (last 5 seconds)
 */
export function computeBatteryMovingAverage(
  samples: BatterySample[], 
  windowMs: number = 5000,
  lang: 'fr' | 'en' = 'en'
): BatteryStatus | null {
  if (!samples || samples.length === 0) return null;

  const isEn = lang === 'en';
  const now = Date.now();
  // Filter samples within the last 5 seconds (with a small 500ms grace buffer for timing jitter)
  const windowSamples = samples.filter(s => now - s.timestamp <= windowMs + 500);

  if (windowSamples.length === 0) {
    // If no recent samples in window, return the most recent sample available
    return samples[samples.length - 1].status;
  }

  const latestSample = windowSamples[windowSamples.length - 1].status;

  // If battery is not present (desktop PC), return directly
  if (!latestSample.present) {
    return {
      ...latestSample,
      isAveraged: true,
      sampleCount: windowSamples.length,
      averageWindowSeconds: Math.round(windowMs / 1000),
      lastUpdated: now,
    };
  }

  // 1. État de charge : Moyenne du pourcentage de charge sur les 5 dernières secondes
  const validPcts = windowSamples
    .map(s => s.status.percentage)
    .filter((p): p is number => p !== null && p !== undefined && !isNaN(p));
  
  const avgPercentage = validPcts.length > 0
    ? Math.round(validPcts.reduce((acc, v) => acc + v, 0) / validPcts.length)
    : latestSample.percentage;

  // 2. Autonomie : Moyenne de l'autonomie restante estimée (minutes) sur les 5 dernières secondes
  const validRuns = windowSamples
    .map(s => s.status.estimatedRunTimeMinutes)
    .filter((m): m is number => m !== null && m !== undefined && !isNaN(m) && m > 0);
  
  const avgRunTimeMinutes = validRuns.length > 0
    ? Math.round(validRuns.reduce((acc, v) => acc + v, 0) / validRuns.length)
    : latestSample.estimatedRunTimeMinutes;

  // 3. Temps de recharge estimé : Moyenne du temps de recharge restant (minutes) sur les 5 dernières secondes
  const validCharges = windowSamples
    .map(s => s.status.estimatedChargeTimeMinutes)
    .filter((m): m is number => m !== null && m !== undefined && !isNaN(m) && m > 0);

  const avgChargeTimeMinutes = validCharges.length > 0
    ? Math.round(validCharges.reduce((acc, v) => acc + v, 0) / validCharges.length)
    : latestSample.estimatedChargeTimeMinutes;

  // 4. Puissance de charge & décharge : Moyenne en Watts sur les 5 dernières secondes
  const validDischarge = windowSamples
    .map(s => s.status.dischargeRateWatts)
    .filter((w): w is number => w !== null && w !== undefined && !isNaN(w) && w > 0);

  const avgDischargeWatts = validDischarge.length > 0
    ? Math.round((validDischarge.reduce((acc, v) => acc + v, 0) / validDischarge.length) * 10) / 10
    : latestSample.dischargeRateWatts;

  const validChargeWatts = windowSamples
    .map(s => s.status.chargeRateWatts)
    .filter((w): w is number => w !== null && w !== undefined && !isNaN(w) && w > 0);

  const avgChargeWatts = validChargeWatts.length > 0
    ? Math.round((validChargeWatts.reduce((acc, v) => acc + v, 0) / validChargeWatts.length) * 10) / 10
    : latestSample.chargeRateWatts;

  // Détermination de l'état d'alimentation (Sur secteur / En charge / Sur batterie)
  const isCharging = latestSample.isCharging;
  const acConnected = latestSample.acConnected;

  // Libellé de statut reflétant la moyenne des 5 dernières secondes
  const statusLabel = isCharging
    ? (isEn ? `Charging (${avgPercentage}% - 5s Avg.)` : `En charge (${avgPercentage}% - Moy. 5s)`)
    : acConnected
    ? (isEn ? `On AC Power (${avgPercentage}% - 5s Avg.)` : `Sur secteur (${avgPercentage}% - Moy. 5s)`)
    : (isEn ? `On Battery (${avgPercentage}% - 5s Avg.)` : `Sur batterie (${avgPercentage}% - Moy. 5s)`);

  // Recalculer la durée formatée basée sur les valeurs moyennes
  let avgDurationFormatted = latestSample.estimatedDurationFormatted;
  if (isCharging && avgChargeTimeMinutes && avgChargeTimeMinutes > 0) {
    const h = Math.floor(avgChargeTimeMinutes / 60);
    const m = avgChargeTimeMinutes % 60;
    avgDurationFormatted = isEn
      ? (h > 0 && m > 0 ? `~${h} h ${m} min (until full charge)` : `~${m} min (until full charge)`)
      : (h > 0 && m > 0 ? `~${h} h ${m} min (jusqu'à pleine charge)` : `~${m} min (jusqu'à pleine charge)`);
  } else if (!isCharging && avgRunTimeMinutes && avgRunTimeMinutes > 0) {
    const h = Math.floor(avgRunTimeMinutes / 60);
    const m = avgRunTimeMinutes % 60;
    avgDurationFormatted = isEn
      ? (h > 0 && m > 0 ? `~${h} h ${m} min remaining (5s avg.)` : `~${m} min remaining (5s avg.)`)
      : (h > 0 && m > 0 ? `~${h} h ${m} min restantes (moyenne 5s)` : `~${m} min restantes (moyenne 5s)`);
  }

  return {
    ...latestSample,
    percentage: avgPercentage,
    rawPercentage: latestSample.percentage,
    estimatedRunTimeMinutes: avgRunTimeMinutes,
    estimatedChargeTimeMinutes: avgChargeTimeMinutes,
    rawEstimatedMinutes: latestSample.isCharging ? latestSample.estimatedChargeTimeMinutes : latestSample.estimatedRunTimeMinutes,
    estimatedDurationFormatted: avgDurationFormatted,
    dischargeRateWatts: avgDischargeWatts,
    chargeRateWatts: avgChargeWatts,
    statusLabel,
    isAveraged: true,
    sampleCount: windowSamples.length,
    averageWindowSeconds: Math.round(windowMs / 1000),
    lastUpdated: now,
  };
}

/**
 * Custom hook providing a real-time 5-second moving average of battery autonomy and charge state
 */
export function useBatteryMonitor(options: BatteryMonitorOptions = {}): UseBatteryMonitorReturn {
  const {
    updateIntervalMs = 5000, // Publish average every 5 seconds
    sampleRateMs = 1000,     // Sample hardware every 1 second
    windowMs = 5000,         // Moving average window of the last 5 seconds
    lang = 'en',
  } = options;

  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [rawBatteryStatus, setRawBatteryStatus] = useState<BatteryStatus | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [sampleCount, setSampleCount] = useState<number>(0);

  const samplesRef = useRef<BatterySample[]>([]);
  const isFetchingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Poll hardware sample
  const sampleHardware = useCallback(async (): Promise<BatteryStatus | null> => {
    if (isFetchingRef.current || (typeof document !== 'undefined' && document.hidden)) {
      return null;
    }
    isFetchingRef.current = true;
    try {
      const data = await hardwareAPI.getBatteryStatus();
      if (!isMountedRef.current || !data) return null;

      const now = Date.now();
      setRawBatteryStatus(data);

      // Append to rolling buffer
      samplesRef.current.push({ timestamp: now, status: data });

      // Keep only samples within the last 15 seconds to prevent unbounded array growth
      const cutoff = now - Math.max(windowMs * 2, 15000);
      samplesRef.current = samplesRef.current.filter(s => s.timestamp >= cutoff);

      return data;
    } catch (err) {
      console.warn('Erreur échantillonnage batterie:', err);
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, [windowMs]);

  // Compute and apply the moving average of the last 5 seconds
  const publishMovingAverage = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsUpdating(true);

    const averaged = computeBatteryMovingAverage(samplesRef.current, windowMs, lang);
    if (averaged) {
      setBatteryStatus(averaged);
      setSampleCount(averaged.sampleCount ?? samplesRef.current.length);
      setLastUpdated(Date.now());
    }

    setTimeout(() => {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }, 400);
  }, [windowMs, lang]);

  // Manual immediate refresh
  const refreshBattery = useCallback(async (): Promise<BatteryStatus | null> => {
    const raw = await sampleHardware();
    if (raw) {
      publishMovingAverage();
    }
    return raw;
  }, [sampleHardware, publishMovingAverage]);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Initial immediate sample & display (instant UI feedback without waiting 5 seconds)
    sampleHardware().then(initial => {
      if (isMountedRef.current && initial) {
        // Set initial immediate reading
        const initialAvg = computeBatteryMovingAverage(samplesRef.current, windowMs, lang);
        setBatteryStatus(initialAvg || initial);
        setSampleCount(1);
        setLastUpdated(Date.now());
      }
    });

    // 2. High-frequency hardware sampling interval (every 1 second)
    const samplingInterval = setInterval(() => {
      sampleHardware();
    }, sampleRateMs);

    // 3. UI Moving Average update interval (every 5 seconds)
    const updateInterval = setInterval(() => {
      publishMovingAverage();
    }, updateIntervalMs);

    // Visibility and focus change handlers to keep data fresh when returning to tab/app
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        sampleHardware().then(() => publishMovingAverage());
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(samplingInterval);
      clearInterval(updateInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [sampleHardware, publishMovingAverage, sampleRateMs, updateIntervalMs, windowMs, lang]);

  const batteryLevel = batteryStatus?.percentage ?? null;
  const batteryDurationInfo = useMemo(() => formatBatteryDuration(batteryStatus, lang), [batteryStatus, lang]);

  return {
    batteryStatus,
    rawBatteryStatus,
    batteryLevel,
    batteryDurationInfo,
    sampleCount,
    lastUpdated,
    isUpdating,
    refreshBattery,
    history: samplesRef.current,
  };
}
