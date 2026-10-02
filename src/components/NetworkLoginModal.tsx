import React, { useState, useEffect, useMemo } from 'react';
import { Server, Lock, User, X, CheckSquare, Square, AlertCircle, CheckCircle2 } from 'lucide-react';
import { hardwareAPI } from '../lib/tauriAdapter';
import { AppConfig } from '../types';
import { validateFolderOrNetworkPath } from '../lib/pathValidator';
import { useLanguage } from '../i18n/LanguageContext';
import { translateLogMessage } from '../lib/logTranslator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => Promise<void>;
}

export default function NetworkLoginModal({ isOpen, onClose, onSuccess, config, onSaveConfig }: Props) {
  const { t, language } = useLanguage();
  const [path, setPath] = useState(config.networkAuth?.path || config.nasDriversPath || '\\\\serveur-nas\\Tech');
  const [user, setUser] = useState(config.networkAuth?.user || '');
  const [pass, setPass] = useState(config.networkAuth?.pass || '');
  const [remember, setRemember] = useState(!!config.networkAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathValidation = useMemo(() => validateFolderOrNetworkPath(path), [path]);

  useEffect(() => {
    if (isOpen) {
      if (config.networkAuth) {
        setPath(config.networkAuth.path);
        setUser(config.networkAuth.user);
        setPass(config.networkAuth.pass);
        setRemember(true);
      } else if (config.nasDriversPath) {
        setPath(config.nasDriversPath);
      }
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathValidation.isValid) {
      setError(pathValidation.message);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const result = await hardwareAPI.connectNetwork(path, user, pass);
      if (result.success) {
        if (remember) {
          await onSaveConfig({ ...config, networkAuth: { path, user, pass } });
        } else {
          const newConfig = { ...config };
          delete newConfig.networkAuth;
          await onSaveConfig(newConfig);
        }
        onSuccess();
        onClose();
      } else {
        setError(translateLogMessage(result.message, language));
      }
    } catch (err: any) {
      setError(err.message ? translateLogMessage(err.message, language) : (language === 'en' ? "An unexpected error occurred" : "Une erreur inattendue est survenue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Server size={16} className="text-emerald-400" />
            </div>
            <h2 className="font-bold text-white text-lg">{t('net_login.title')}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleConnect} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('net_login.path_label')}</label>
              {pathValidation.isValid && path.trim() !== '' && (
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {pathValidation.badge || 'Format Valide'}
                </span>
              )}
            </div>
            <div className="relative">
              <Server size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={path}
                onChange={e => setPath(e.target.value)}
                placeholder="\\Serveur\Partage ou Z:\"
                className={`w-full bg-zinc-950 border rounded-xl pl-9 pr-9 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none transition-colors ${
                  !pathValidation.isValid 
                    ? 'border-rose-500 focus:border-rose-400' 
                    : 'border-zinc-800 focus:border-emerald-500'
                }`}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {!pathValidation.isValid ? (
                  <AlertCircle size={16} className="text-rose-400" />
                ) : path.trim() !== '' ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : null}
              </div>
            </div>
            {!pathValidation.isValid && (
              <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} className="shrink-0" />
                {pathValidation.message}
              </p>
            )}

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-zinc-500">{t('net_login.shortcuts')}</span>
              <button
                type="button"
                onClick={() => setPath('\\\\serveur-nas\\Tech')}
                className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded border border-zinc-700 cursor-pointer"
              >
                \\serveur-nas\Tech
              </button>
              <button
                type="button"
                onClick={() => setPath('\\\\serveur-nas\\Tech\\Drivers')}
                className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
              >
                \Tech\Drivers
              </button>
              <button
                type="button"
                onClick={() => setPath('Z:\\')}
                className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
              >
                Z:\
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('net_login.user_label')}</label>
              <span className="text-[10px] text-zinc-500 font-medium">{t('common.optional', 'Optionnel')} / Z:\</span>
            </div>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Ex: Domaine\Tech"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('net_login.pass_label')}</label>
              <span className="text-[10px] text-zinc-500 font-medium">{t('common.optional', 'Optionnel')} / Z:\</span>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1 pb-2">
            <button
              type="button"
              onClick={() => setRemember(!remember)}
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {remember ? <CheckSquare size={18} /> : <Square size={18} className="text-zinc-500" />}
            </button>
            <span className="text-xs text-zinc-400 font-semibold cursor-pointer" onClick={() => setRemember(!remember)}>
              {t('net_login.remember')}
            </span>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors flex items-center cursor-pointer"
            >
              {loading ? t('net_login.connecting') : t('net_login.connect_btn')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
