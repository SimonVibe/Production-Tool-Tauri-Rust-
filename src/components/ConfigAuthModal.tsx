import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctHash: string;
}

export default function ConfigAuthModal({ isOpen, onClose, onSuccess, correctHash }: Props) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const hashPassword = async (pass: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hashed = await hashPassword(password);
    if (hashed === correctHash) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPassword('');
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-rose-500/20">
            <Lock className="text-rose-400" size={24} />
          </div>
          
          <h2 className="text-xl font-bold text-center text-zinc-100 mb-2">{t('config_auth.title')}</h2>
          <p className="text-sm text-center text-zinc-400 mb-6">
            {t('config_auth.prompt')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder={t('net_login.pass_label')}
                  className={`w-full bg-zinc-950 border ${error ? 'border-rose-500' : 'border-zinc-800'} rounded-xl py-2.5 px-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors`}
                />
              </div>
              {error && (
                <div className="flex items-center space-x-1.5 mt-2 text-rose-400 text-xs font-medium justify-center">
                  <ShieldAlert size={14} />
                  <span>{t('config_auth.wrong_pass')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!password}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <span>{t('config_auth.unlock')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
