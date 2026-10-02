import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className = '', compact = false }: Props) {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  return (
    <div
      className={`h-10 flex items-center bg-zinc-950/90 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-1 shadow-inner select-none transition-all ${className}`}
      title={language === 'fr' ? 'Switch application to English' : "Passer l'application en Français"}
    >
      <button
        type="button"
        onClick={toggleLanguage}
        className="px-2 h-8 flex items-center space-x-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
      >
        <Globe size={15} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
      </button>

      <div className="flex items-center space-x-0.5 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800/80">
        <button
          type="button"
          onClick={() => setLanguage('fr')}
          className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            language === 'fr'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Afficher en Français"
        >
          FR
        </button>

        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Display in English"
        >
          EN
        </button>
      </div>
    </div>
  );
}
