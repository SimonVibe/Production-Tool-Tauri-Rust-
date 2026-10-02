import { useState, useMemo } from 'react';
import { AppConfig, defaultConfig } from '../types';
import { 
  ArrowLeft, Save, FolderSearch, RefreshCw, CheckCircle2, 
  AlertCircle, AlertTriangle, HelpCircle, Server, FileCode, Check, RotateCcw, Plus, Trash2, Play, EyeOff, Cpu, Eye
} from 'lucide-react';
import { hardwareAPI } from '../lib/tauriAdapter';
import { validateExecutablePath, validateFolderOrNetworkPath, ValidationResult } from '../lib/pathValidator';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onCancel: () => void;
  onOpenNetwork?: () => void;
  isNetworkConnected?: boolean;
}

export default function ConfigPage({ config, onSave, onCancel, onOpenNetwork, isNetworkConnected }: Props) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState<AppConfig>(config);
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [testingAppId, setTestingAppId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (key: keyof AppConfig, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleBrowseFile = async (key: keyof AppConfig) => {
    const path = await hardwareAPI.selectFile();
    if (path) {
      handleChange(key, path);
    }
  };

  const handleBrowseFolder = async (key: keyof AppConfig) => {
    const path = await hardwareAPI.selectFolder();
    if (path) {
      handleChange(key, path);
    }
  };

  const handleResetDefaults = () => {
    setFormData(defaultConfig);
    setShowResetConfirm(false);
  };

  const handleAddExternalApp = () => {
    setFormData(prev => ({
      ...prev,
      externalApps: [
        ...(prev.externalApps || []),
        { id: Math.random().toString(36).substr(2, 9), name: '', path: '' }
      ]
    }));
  };

  const handleRemoveExternalApp = (id: string) => {
    setFormData(prev => ({
      ...prev,
      externalApps: (prev.externalApps || []).filter(app => app.id !== id)
    }));
  };

  const handleExternalAppChange = (id: string, field: 'name' | 'path', value: string) => {
    setFormData(prev => ({
      ...prev,
      externalApps: (prev.externalApps || []).map(app => 
        app.id === id ? { ...app, [field]: value } : app
      )
    }));
  };

  const handleTestVisibilityToggle = (testKey: keyof NonNullable<AppConfig['hiddenTests']>) => {
    setFormData(prev => ({
      ...prev,
      hiddenTests: {
        ...prev.hiddenTests,
        [testKey]: !prev.hiddenTests?.[testKey]
      }
    }));
  };

  const handleSetAllTestsHidden = (hidden: boolean) => {
    setFormData(prev => ({
      ...prev,
      hiddenTests: {
        screen: hidden,
        audio: hidden,
        keyboard: hidden,
        camera: hidden,
        burnin: hidden,
        battery: hidden,
        wifi: hidden,
        bluetooth: hidden,
      }
    }));
  };

  const handleSpecVisibilityToggle = (specKey: keyof NonNullable<AppConfig['hiddenSpecs']>) => {
    setFormData(prev => ({
      ...prev,
      hiddenSpecs: {
        ...prev.hiddenSpecs,
        [specKey]: !prev.hiddenSpecs?.[specKey]
      }
    }));
  };

  const handleSetAllSpecsHidden = (hidden: boolean) => {
    setFormData(prev => ({
      ...prev,
      hiddenSpecs: {
        model: hidden,
        serialNumber: hidden,
        uuid: hidden,
        assetTag: hidden,
        ownershipTag: hidden,
        cpu: hidden,
        memory: hidden,
        disk: hidden,
        diskSn: hidden,
        gpu: hidden,
        bios: hidden,
        securityBanner: hidden,
      }
    }));
  };

  const handleBrowseExternalApp = async (id: string) => {
    const path = await hardwareAPI.selectFile();
    if (path) {
      const fileName = path.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '';
      setFormData(prev => ({
        ...prev,
        externalApps: (prev.externalApps || []).map(app => {
          if (app.id === id) {
            return {
              ...app,
              path,
              name: app.name.trim() === '' ? fileName : app.name
            };
          }
          return app;
        })
      }));
    }
  };

  const handleTestExternalApp = async (id: string, name: string, path: string) => {
    if (!path.trim()) {
      setTestResult({ id, success: false, message: 'Veuillez spécifier un chemin de fichier avant de tester.' });
      return;
    }
    setTestingAppId(id);
    setTestResult(null);
    try {
      const res = await hardwareAPI.executeAction(name || 'App Externe', path);
      if (res.success) {
        setTestResult({ id, success: true, message: res.output || 'Application lancée avec succès.' });
      } else {
        setTestResult({ id, success: false, message: res.error || 'Erreur lors du lancement.' });
      }
    } catch (err: any) {
      setTestResult({ id, success: false, message: err.message || 'Échec de l’exécution' });
    } finally {
      setTestingAppId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!isFormValid) return;

    // Clean and validate external applications before saving
    const cleanedApps = (formData.externalApps || [])
      .map(app => {
        const trimmedPath = app.path?.trim() || '';
        let trimmedName = app.name?.trim() || '';
        if (trimmedPath && !trimmedName) {
          trimmedName = trimmedPath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'Application';
        }
        return {
          id: app.id || Math.random().toString(36).substr(2, 9),
          name: trimmedName,
          path: trimmedPath,
        };
      })
      .filter(app => app.path.length > 0 || app.name.length > 0);

    const cleanConfig: AppConfig = {
      ...formData,
      externalApps: cleanedApps,
    };

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setPasswordError('Les mots de passe ne correspondent pas.');
        return;
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      cleanConfig.adminPasswordHash = hashHex;
    }

    onSave(cleanConfig);
  };

  // Real-time validations for each field
  const validations: Record<string, ValidationResult> = useMemo(() => {
    return {
      testSonPath: validateExecutablePath(formData.testSonPath || ''),
      testClavierPath: validateExecutablePath(formData.testClavierPath || ''),
      burnInTestPath: validateExecutablePath(formData.burnInTestPath || ''),
      batteryAppPath: validateExecutablePath(formData.batteryAppPath || ''),
      driverSdioPath: validateExecutablePath(formData.driverSdioPath || ''),
      nasDriversPath: validateFolderOrNetworkPath(formData.nasDriversPath || ''),
    };
  }, [formData]);

  const invalidEntries = useMemo(() => {
    return Object.entries(validations).filter(([_, res]) => !res.isValid);
  }, [validations]);

  const isFormValid = invalidEntries.length === 0;

  return (
    <div className="w-full h-full max-w-4xl mx-auto bg-zinc-950 text-zinc-100 p-6 shadow-2xl flex flex-col overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onCancel} 
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition-colors cursor-pointer"
            title={t('config.back_tooltip')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{t('config.execution_paths')}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                isFormValid 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isFormValid ? t('config.all_valid') : t('config.invalid_count', `${invalidEntries.length} format(s) invalide(s)`, { count: invalidEntries.length })}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{t('config.realtime_validation')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <LanguageSwitcher />

          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              showHelp 
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            <HelpCircle size={14} />
            <span>{t('config.format_guide')}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 rounded-xl border border-zinc-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title={t('config.default_tooltip')}
          >
            <RotateCcw size={14} />
            <span>{t('config.default_btn')}</span>
          </button>
        </div>
      </div>

      {/* Format Help Card */}
      {showHelp && (
        <div className="mb-5 p-4 bg-zinc-900/90 border border-blue-500/30 rounded-2xl text-xs space-y-3 text-zinc-300 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <FileCode size={15} />
              {language === 'en' ? 'Accepted formats for paths and addresses' : 'Formats acceptés pour les chemins et adresses'}
            </h4>
            <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-zinc-300 font-bold cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1">
              <strong className="text-emerald-400">{language === 'en' ? '1. Executables & Scripts:' : '1. Exécutables et Scripts :'}</strong>
              <p className="text-zinc-400">{language === 'en' ? 'Accepted extensions: ' : 'Extensions acceptées : '}<code className="text-zinc-200 font-mono">.exe, .bat, .cmd, .ps1, .cpl, .msc, .vbs</code>.</p>
              <p className="text-zinc-500 italic">{language === 'en' ? 'Examples: ' : 'Exemples : '}<span className="text-zinc-300 font-mono">mmsys.cpl</span>, <span className="text-zinc-300 font-mono">SDIO\SDI_x64_R.exe</span>, <span className="text-zinc-300 font-mono">C:\OPEQ\Test.exe</span></p>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1">
              <strong className="text-blue-400">{language === 'en' ? '2. Network & NAS Folders:' : '2. Dossiers Réseau & NAS :'}</strong>
              <p className="text-zinc-400">{language === 'en' ? 'UNC format required: ' : 'Format UNC obligatoire : '}<code className="text-zinc-200 font-mono">\\Server\Share\Folder</code> {language === 'en' ? 'or' : 'ou'} <code className="text-zinc-200 font-mono">\\192.168.1.50\Drivers</code>.</p>
              <p className="text-zinc-500 italic">{language === 'en' ? 'Accepted local paths: ' : 'Chemins locaux acceptés : '}<span className="text-zinc-300 font-mono">C:\Drivers</span> {language === 'en' ? 'or' : 'ou'} <span className="text-zinc-300 font-mono">D:\Tech\Drivers</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Global Validation Warning Banner */}
      {!isFormValid && (
        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-xs text-rose-300 animate-in fade-in duration-150">
          <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <strong className="font-bold text-rose-200">{t('config.recording_blocked')}</strong>
            <p className="text-rose-300/90">
              {invalidEntries.length === 1 
                ? t('config.single_invalid')
                : t('config.multiple_invalid', `${invalidEntries.length} champs comportent des erreurs de format. Corrigez-les pour continuer.`, { count: invalidEntries.length })}
            </p>
          </div>
        </div>
      )}
      
      {/* Form Fields */}
      <div className="space-y-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-lg">
        <ConfigField 
          label={t('config.sound_test_path')} 
          value={formData.testSonPath} 
          onChange={(v) => handleChange('testSonPath', v)} 
          onBrowse={() => handleBrowseFile('testSonPath')}
          placeholder={language === 'en' ? 'e.g.: mmsys.cpl or Sound.bat' : 'ex: mmsys.cpl ou Sons.bat'}
          validation={validations.testSonPath}
          language={language}
        />

        <ConfigField 
          label={t('config.keyboard_test_path')} 
          value={formData.testClavierPath} 
          onChange={(v) => handleChange('testClavierPath', v)} 
          onBrowse={() => handleBrowseFile('testClavierPath')}
          placeholder="ex: AquaKeyTest.exe"
          validation={validations.testClavierPath}
          language={language}
        />

        <ConfigField 
          label={t('config.burnin_test_path')} 
          value={formData.burnInTestPath} 
          onChange={(v) => handleChange('burnInTestPath', v)} 
          onBrowse={() => handleBrowseFile('burnInTestPath')}
          placeholder="ex: BurnInTest\bit.exe"
          validation={validations.burnInTestPath}
          language={language}
        />

        <ConfigField 
          label={t('config.battery_app_path')} 
          value={formData.batteryAppPath} 
          onChange={(v) => handleChange('batteryAppPath', v)} 
          onBrowse={() => handleBrowseFile('batteryAppPath')}
          placeholder="ex: batteryinfoview-x64\BatteryInfoView.exe"
          validation={validations.batteryAppPath}
          language={language}
        />

        <ConfigField 
          label={t('config.sdio_path')} 
          value={formData.driverSdioPath || ''} 
          onChange={(v) => handleChange('driverSdioPath', v)} 
          onBrowse={() => handleBrowseFile('driverSdioPath')}
          placeholder={language === 'en' ? 'e.g.: SDIO\\SDI_x64_R.exe or snappy.exe' : 'ex: SDIO\\SDI_x64_R.exe ou snappy.exe'}
          validation={validations.driverSdioPath}
          language={language}
        />

        <ConfigField 
          label={t('config.nas_source_folder')} 
          value={formData.nasDriversPath || ''} 
          onChange={(v) => handleChange('nasDriversPath', v)} 
          onBrowse={() => handleBrowseFolder('nasDriversPath')}
          placeholder={language === 'en' ? 'e.g.: \\\\nas-server\\Tech\\Drivers' : 'ex: \\\\serveur-nas\\Tech\\Drivers'}
          isFolder={true}
          validation={validations.nasDriversPath}
          language={language}
        />

        {/* Connexion Réseau OPEQ (NAS) */}
        <div className="mt-2 p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isNetworkConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}>
              {isNetworkConnected ? <CheckCircle2 size={20} /> : <Server size={20} />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold text-white">{t('config.net_conn_title')}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isNetworkConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {isNetworkConnected ? t('config.connected') : t('config.not_connected')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {t('config.net_conn_desc')} ({formData.nasDriversPath || '\\\\serveur-nas\\Tech'})
              </p>
            </div>
          </div>

          {onOpenNetwork && (
            <button
              type="button"
              onClick={onOpenNetwork}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs shrink-0 ${
                isNetworkConnected
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-zinc-700 hover:border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-950/40'
              }`}
            >
              <Server size={14} className={isNetworkConnected ? "text-emerald-400" : "text-white"} />
              <span>{isNetworkConnected ? t('config.manage_reauth') : t('config.connect_net_btn')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center pt-2 border-t border-zinc-800/80 mt-4">
          <input
            type="checkbox"
            id="autoReboot"
            checked={formData.autoReboot || false}
            onChange={(e) => setFormData(prev => ({ ...prev, autoReboot: e.target.checked }))}
            className="w-4 h-4 text-emerald-600 bg-zinc-950 border-zinc-800 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="autoReboot" className="ml-2.5 text-xs font-bold text-zinc-300 cursor-pointer select-none">
            {t('config.auto_reboot_check')}
          </label>
        </div>
      </div>

      {/* Applications Externes */}
      <div className="space-y-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Play size={14} className="text-purple-400" /> {t('config.external_tools_title')}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {t('config.external_tools_desc')}
            </p>
          </div>
          <button
            onClick={handleAddExternalApp}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>{t('config.add_app_btn')}</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {formData.externalApps?.map((app) => (
             <div key={app.id} className="flex flex-col space-y-2 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80 shadow-inner">
                <div className="flex space-x-3 items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        value={app.name} 
                        onChange={(e) => handleExternalAppChange(app.id, 'name', e.target.value)} 
                        placeholder={t('config.app_name_ph')} 
                        className="sm:w-1/3 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl font-bold text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30" 
                      />
                      <div className="flex-1 flex space-x-2 relative">
                        <input 
                          type="text" 
                          value={app.path} 
                          onChange={(e) => handleExternalAppChange(app.id, 'path', e.target.value)} 
                          placeholder={t('config.app_path_ph')} 
                          className="flex-1 px-3.5 py-2 pr-9 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30" 
                        />
                        <button 
                          onClick={() => handleBrowseExternalApp(app.id)} 
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-purple-400 border border-zinc-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                          title={language === 'en' ? "Browse file" : "Parcourir le fichier"}
                        >
                          <FolderSearch size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestExternalApp(app.id, app.name, app.path)}
                      disabled={testingAppId === app.id || !app.path.trim()}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        !app.path.trim()
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800/80 cursor-not-allowed'
                          : testingAppId === app.id
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/50 animate-pulse'
                          : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30'
                      }`}
                      title={language === 'en' ? "Test launching this application" : "Tester le lancement de l'application"}
                    >
                      <Play size={13} className={testingAppId === app.id ? "animate-spin" : ""} />
                      <span>{testingAppId === app.id ? (language === 'en' ? 'Testing...' : 'Test...') : t('config.test_app')}</span>
                    </button>

                    <button 
                      onClick={() => handleRemoveExternalApp(app.id)} 
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                      title={language === 'en' ? "Remove this application" : "Supprimer cette application"}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Test Feedback */}
                {testResult && testResult.id === app.id && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" /> : <AlertCircle size={14} className="shrink-0 text-rose-400" />}
                    <span className="flex-1">{testResult.message}</span>
                  </div>
                )}
             </div>
          ))}
          {(!formData.externalApps || formData.externalApps.length === 0) && (
            <div className="text-xs text-zinc-500 italic text-center py-6 bg-zinc-950/50 rounded-xl border border-zinc-800/50 border-dashed space-y-1">
              <p>{language === 'en' ? 'No external applications configured.' : 'Aucune application externe configurée.'}</p>
              <p className="text-[11px] text-zinc-600">{language === 'en' ? 'Click "Add an application" to create a shortcut on the dashboard.' : 'Cliquez sur « Ajouter une application » pour créer un raccourci direct sur le tableau de bord.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Visibilité des Spécifications Détectées */}
      <div className="space-y-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-lg mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800/80 gap-2">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu size={14} className="text-emerald-400" /> {language === 'en' ? 'Hide Detected Specifications (Dashboard)' : 'Masquer des Spécifications Détectées (Tableau de bord)'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {language === 'en' ? 'Check the hardware details you do not wish to display on the home screen.' : 'Cochez les informations matérielles que vous ne souhaitez pas afficher sur l\'écran d\'accueil.'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleSetAllSpecsHidden(false)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Show all' : 'Tout afficher'}
            </button>
            <button
              type="button"
              onClick={() => handleSetAllSpecsHidden(true)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Hide all' : 'Tout masquer'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'model', label: language === 'en' ? 'Machine Model' : 'Modèle de la machine', desc: language === 'en' ? 'Make, series and chassis' : 'Marque, série et châssis' },
            { id: 'serialNumber', label: language === 'en' ? 'Serial Number (S/N)' : 'Numéro de série (S/N)', desc: language === 'en' ? 'Manufacturer identifier' : 'Identifiant constructeur' },
            { id: 'uuid', label: language === 'en' ? 'UUID Identifier' : 'Identifiant UUID', desc: language === 'en' ? 'Unique SMBIOS UUID' : 'UUID unique SMBIOS' },
            { id: 'assetTag', label: 'Asset Tag', desc: language === 'en' ? 'BIOS inventory tag' : 'Numéro inventaire BIOS' },
            { id: 'ownershipTag', label: 'Ownership Tag', desc: language === 'en' ? 'OEM proprietary ownership tag' : 'Étiquette OEM propriétaire' },
            { id: 'cpu', label: language === 'en' ? 'Processor (CPU)' : 'Processeur (CPU)', desc: language === 'en' ? 'Model, cores and frequency' : 'Modèle, cœurs et fréquence' },
            { id: 'memory', label: language === 'en' ? 'RAM Memory' : 'Mémoire vive (RAM)', desc: language === 'en' ? 'Total capacity and sticks' : 'Capacité totale et barrettes' },
            { id: 'disk', label: language === 'en' ? 'Disk Capacity & SMART' : 'Capacité disque & SMART', desc: language === 'en' ? 'Storage, SMART health and mode' : 'Stockage, santé SMART et mode' },
            { id: 'diskSn', label: language === 'en' ? 'Disk S/N' : 'S/N Disque(s)', desc: language === 'en' ? 'Disk serial numbers' : 'Numéros de série des disques' },
            { id: 'gpu', label: language === 'en' ? 'Graphics Card (GPU)' : 'Carte graphique (GPU)', desc: language === 'en' ? 'Graphics controller' : 'Contrôleur graphique' },
            { id: 'bios', label: language === 'en' ? 'BIOS Version' : 'Version du BIOS', desc: language === 'en' ? 'Firmware version and date' : 'Version et date firmware' },
            { id: 'securityBanner', label: language === 'en' ? 'Win 11 Security Banner' : 'Bannière Sécurité Win 11', desc: 'TPM 2.0, Secure Boot, UEFI' },
          ].map((spec) => {
            const specKey = spec.id as keyof NonNullable<AppConfig['hiddenSpecs']>;
            const isHidden = formData.hiddenSpecs?.[specKey] || false;
            return (
              <label 
                key={spec.id} 
                className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isHidden 
                    ? 'bg-zinc-950/40 border-zinc-800/40 opacity-70' 
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 shadow-inner'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={() => handleSpecVisibilityToggle(specKey)}
                  className="w-4 h-4 mt-0.5 text-emerald-500 bg-zinc-900 border-zinc-700 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold block truncate ${isHidden ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                    {spec.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 block truncate">
                    {spec.desc}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Visibilité des Tests */}
      <div className="space-y-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-lg mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800/80 gap-2">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <EyeOff size={14} className="text-amber-400" /> {language === 'en' ? 'Hide Tests & Shortcuts (Dashboard)' : 'Masquer des Tests (Tableau de bord)'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {language === 'en' ? 'Check the test buttons or quick controls you wish to hide.' : 'Cochez les boutons de test ou contrôles rapides que vous souhaitez masquer.'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleSetAllTestsHidden(false)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Show all' : 'Tout afficher'}
            </button>
            <button
              type="button"
              onClick={() => handleSetAllTestsHidden(true)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Hide all' : 'Tout masquer'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'screen', label: language === 'en' ? 'Screen & Touch Test' : 'Test Écran & Tactile', desc: language === 'en' ? 'Color matrix and touch test' : 'Matrice de couleurs et tactile' },
            { id: 'audio', label: language === 'en' ? 'Audio & Sound Test' : 'Test Son & Audio', desc: language === 'en' ? 'Windows audio devices' : 'Périphériques audio Windows' },
            { id: 'keyboard', label: language === 'en' ? 'Keyboard Test' : 'Test Clavier', desc: language === 'en' ? 'Interactive AquaKeyTest' : 'AquaKeyTest interactif' },
            { id: 'camera', label: language === 'en' ? 'Camera & Mic Test' : 'Test Caméra & Micro', desc: language === 'en' ? 'HD video feed and audio loopback' : 'Flux vidéo HD et audio' },
            { id: 'burnin', label: 'BurnIn Stress Test', desc: language === 'en' ? 'CPU / RAM stress test' : 'Test de charge CPU / RAM' },
            { id: 'battery', label: language === 'en' ? 'Battery Button' : 'Bouton Batterie', desc: language === 'en' ? 'Gauge and battery health modal' : 'Jauge et état de santé batterie' },
            { id: 'wifi', label: language === 'en' ? 'WiFi Button' : 'Bouton WiFi', desc: language === 'en' ? 'Wireless networks' : 'Réseaux sans fil' },
            { id: 'bluetooth', label: language === 'en' ? 'Bluetooth Button' : 'Bouton Bluetooth', desc: language === 'en' ? 'Bluetooth devices' : 'Périphériques Bluetooth' },
          ].map((test) => {
            const testKey = test.id as keyof NonNullable<AppConfig['hiddenTests']>;
            const isHidden = formData.hiddenTests?.[testKey] || false;
            return (
              <label 
                key={test.id} 
                className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isHidden 
                    ? 'bg-zinc-950/40 border-zinc-800/40 opacity-70' 
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 shadow-inner'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={() => handleTestVisibilityToggle(testKey)}
                  className="w-4 h-4 mt-0.5 text-amber-500 bg-zinc-900 border-zinc-700 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold block truncate ${isHidden ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                    {test.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 block truncate">
                    {test.desc}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Confirmation Reset Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-amber-400" />
              {language === 'en' ? 'Reset configuration?' : 'Réinitialiser la configuration ?'}
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'en' ? 'All execution paths and NAS network address will be restored to OPEQ default values.' : 'Tous les chemins d\'exécution et l\'adresse réseau NAS seront restaurés aux valeurs d\'usine par défaut OPEQ.'}
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Confirm Reset' : 'Confirmer la réinitialisation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="space-y-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 shadow-lg mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-800/80 gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2" />
              {language === 'en' ? 'Security (Configuration)' : 'Sécurité (Configuration)'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {language === 'en' ? 'Change the password required to access this settings page. Leave empty to keep current password.' : 'Modifiez le mot de passe requis pour accéder à cette page de configuration. Laissez vide pour ne pas le changer.'}
            </p>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">{language === 'en' ? 'New Password' : 'Nouveau mot de passe'}</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl font-mono text-xs text-zinc-100 shadow-inner transition-all placeholder:text-zinc-600 focus:outline-none"
                placeholder={language === 'en' ? 'Leave empty to keep current' : 'Laisser vide pour ne pas changer'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">{language === 'en' ? 'Confirm Password' : 'Confirmer le mot de passe'}</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl font-mono text-xs text-zinc-100 shadow-inner transition-all placeholder:text-zinc-600 focus:outline-none"
                placeholder={language === 'en' ? 'Repeat password' : 'Répéter le mot de passe'}
              />
            </div>
          </div>
          {passwordError && (
            <div className="text-rose-400 text-xs font-medium flex items-center space-x-1 mt-2">
              <AlertCircle size={12} />
              <span>{passwordError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between shrink-0">
        <div className="text-xs font-mono text-zinc-500">
          {isFormValid ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Check size={14} /> {language === 'en' ? 'Ready to save' : 'Prêt à enregistrer'}
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle size={14} /> {language === 'en' ? 'Formats to correct' : 'Formats à corriger'}
            </span>
          )}
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={!isFormValid}
            className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center transition-all cursor-pointer ${
              isFormValid
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
            }`}
            title={isFormValid ? (language === 'en' ? 'Save configuration' : 'Enregistrer les modifications') : (language === 'en' ? 'Correct format errors before saving' : 'Corrigez les erreurs de format avant de sauvegarder')}
          >
            <Save size={16} className="mr-2" />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  onBrowse, 
  isFolder,
  validation,
  language = 'en'
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  onBrowse?: () => void; 
  isFolder?: boolean;
  validation?: ValidationResult;
  language?: string;
}) {
  const status = validation?.status || 'valid';
  const isValid = validation?.isValid ?? true;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-zinc-300">{label}</label>
        <div className="flex items-center space-x-2">
          {validation?.badge && (
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
              isFolder 
                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                : 'text-zinc-400 bg-zinc-800/80 border-zinc-700/80'
            }`}>
              {validation.badge}
            </span>
          )}
          {isFolder && !validation?.badge && (
            <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
              <Server size={11} /> {language === 'en' ? 'Folder / Network' : 'Dossier / Réseau'}
            </span>
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3.5 py-2 pr-9 bg-zinc-950 border rounded-xl font-mono text-xs text-zinc-100 shadow-inner transition-all placeholder:text-zinc-600 focus:outline-none ${
              !isValid 
                ? 'border-rose-500/80 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30' 
                : status === 'warning'
                ? 'border-amber-500/60 focus:border-amber-400 focus:ring-1 focus:ring-amber-500/30'
                : 'border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {!isValid && <AlertCircle size={16} className="text-rose-400" />}
            {isValid && status === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
            {isValid && status === 'valid' && value.trim() !== '' && <CheckCircle2 size={16} className="text-emerald-400" />}
          </div>
        </div>

        {onBrowse && (
          <button 
            onClick={onBrowse} 
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title={isFolder ? (language === 'en' ? 'Select folder' : 'Sélectionner un dossier') : (language === 'en' ? 'Browse file' : 'Parcourir un fichier')}
          >
            <FolderSearch size={18} className={isFolder ? "text-blue-400" : "text-emerald-400"} />
          </button>
        )}
      </div>

      {/* Live validation feedback message */}
      {validation && (
        <div className="flex items-center space-x-1.5 text-[11px] pt-0.5">
          {!isValid && (
            <span className="text-rose-400 flex items-center gap-1 font-medium">
              <AlertCircle size={12} className="shrink-0" />
              {validation.message}
            </span>
          )}
          {isValid && status === 'warning' && (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} className="shrink-0" />
              {validation.message}
            </span>
          )}
          {isValid && status === 'valid' && value.trim() !== '' && (
            <span className="text-zinc-500 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              {validation.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

