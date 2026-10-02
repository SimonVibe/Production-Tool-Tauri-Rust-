import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, SunDim, SunMedium, Sparkles } from 'lucide-react';
import { hardwareAPI } from '../lib/tauriAdapter';
import { useLanguage } from '../i18n/LanguageContext';

interface BrightnessControlProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

export default function BrightnessControl({
  value,
  onChange,
  className = ''
}: BrightnessControlProps) {
  const { language } = useLanguage();
  // Local immediate state for 0ms lag-free slider response
  const [localBrightness, setLocalBrightness] = useState<number>(value);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastSentTimeRef = useRef<number>(0);
  const throttleTimeoutRef = useRef<any>(null);
  const pendingValueRef = useRef<number>(value);

  // Sync from props if prop changes from outside and not currently dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalBrightness(value);
    }
  }, [value, isDragging]);

  // High-performance hardware dispatcher (throttled at 60ms + guaranteed trailing flush)
  const dispatchBrightness = useCallback((val: number, immediate = false) => {
    pendingValueRef.current = val;
    const now = performance.now();
    const timeSinceLast = now - lastSentTimeRef.current;

    // Apply immediate visual CSS filter to give instant screen feedback in all environments
    try {
      const minBrightness = 0.45; // 45% minimum brightness filter
      const maxBrightness = 1.0;
      const normalizedFactor = minBrightness + ((val / 100) * (maxBrightness - minBrightness));
      document.documentElement.style.setProperty('--screen-brightness-filter', `${normalizedFactor}`);
    } catch {}

    const sendToHardware = (b: number) => {
      lastSentTimeRef.current = performance.now();
      hardwareAPI.setSystemBrightness(b);
      onChange(b);
    };

    if (immediate || timeSinceLast >= 60) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      sendToHardware(val);
    } else {
      // Trailing debounce to ensure the final value is always sent
      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = setTimeout(() => {
          throttleTimeoutRef.current = null;
          sendToHardware(pendingValueRef.current);
        }, 65 - timeSinceLast);
      }
    }
  }, [onChange]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalBrightness(val);
    dispatchBrightness(val, false);
  };

  const handlePresetClick = (presetVal: number) => {
    setLocalBrightness(presetVal);
    dispatchBrightness(presetVal, true);
  };

  // Support mouse wheel scrolling on hover to adjust brightness seamlessly
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    const nextVal = Math.min(100, Math.max(10, localBrightness + delta));
    setLocalBrightness(nextVal);
    dispatchBrightness(nextVal, false);
  };

  // Dynamic Sun icon & color based on brightness level
  const getSunIcon = () => {
    if (localBrightness < 35) return <SunDim size={18} className="text-zinc-500 transition-colors" />;
    if (localBrightness < 75) return <SunMedium size={18} className="text-amber-400/90 transition-colors" />;
    return <Sun size={18} className="text-amber-400 transition-all drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />;
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      className={`relative h-10 flex items-center space-x-3 bg-zinc-950/90 border border-zinc-800/90 hover:border-zinc-700 px-3.5 rounded-xl shadow-inner transition-all ${className}`}
      title={language === 'en' ? "Adjust brightness (Drag slider, mouse scroll wheel, or quick presets)" : "Régler la luminosité (Glisser, Molette de souris ou Présélections rapides)"}
    >
      {/* Sun Icon with clickable cycle to 100% */}
      <button
        onClick={() => handlePresetClick(localBrightness === 100 ? 50 : 100)}
        className="shrink-0 p-1 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer text-amber-400"
        title={localBrightness === 100 
          ? (language === 'en' ? "Dim to 50%" : "Réduire à 50%") 
          : (language === 'en' ? "Maximum brightness 100%" : "Luminosité maximale 100%")}
      >
        {getSunIcon()}
      </button>

      {/* Range Slider */}
      <div className="relative flex-1 flex items-center min-w-[130px] sm:min-w-[170px] md:min-w-[210px]">
        <input 
          type="range" 
          min="10" 
          max="100" 
          step="1"
          value={localBrightness}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
            dispatchBrightness(localBrightness, true);
          }}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => {
            setIsDragging(false);
            dispatchBrightness(localBrightness, true);
          }}
          onChange={handleSliderChange}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${localBrightness}%, #27272a ${localBrightness}%, #27272a 100%)`
          }}
        />
      </div>

      {/* Percentage Value */}
      <span className="text-xs sm:text-sm font-mono font-bold text-zinc-200 w-11 text-right tabular-nums select-none">
        {localBrightness}%
      </span>

      {/* Instant Quick Presets Buttons (Visible on hover or compact) */}
      <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-zinc-800/90">
        {[25, 50, 75, 100].map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`text-xs font-mono h-7 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              localBrightness === preset
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
            }`}
            title={language === 'en' ? `Set immediately to ${preset}%` : `Régler instantanément à ${preset}%`}
          >
            {preset === 100 ? 'MAX' : `${preset}%`}
          </button>
        ))}
      </div>
    </div>
  );
}
