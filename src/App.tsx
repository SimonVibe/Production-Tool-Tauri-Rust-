import { useState, useEffect, lazy, Suspense } from 'react';
import Dashboard from './components/Dashboard';
import { AppConfig, defaultConfig, SecurityStatus } from './types';
import { hardwareAPI, isTauri } from './lib/tauriAdapter';

const ConfigPage = lazy(() => import('./components/ConfigPage'));
const NetworkLoginModal = lazy(() => import('./components/NetworkLoginModal'));
const ConfigAuthModal = lazy(() => import('./components/ConfigAuthModal'));

export const DEFAULT_ADMIN_HASH = 'b45ebce2c7ded784ff72b3569bbe571ec5e43f3d3cdc0954d13a9a39a97bde64'; // Hash for "opeq"

const calculateIdealZoom = () => {
  if (typeof window === 'undefined') return 1.0;
  
  // Base de référence de l'application (taille standard pour un zoom de 1.0)
  const baseHeight = 840;
  const baseWidth = 1200;
  
  const scaleHeight = window.innerHeight / baseHeight;
  const scaleWidth = window.innerWidth / baseWidth;
  
  // On prend le facteur d'échelle le plus restrictif pour que tout rentre
  const scale = Math.min(scaleHeight, scaleWidth);
  
  // Arrondir à 0.05 près pour éviter les bugs de rendu sous-pixels
  const roundedScale = Math.round(scale * 20) / 20;
  
  // Restreindre entre 0.6 (très petits écrans) et 1.5 (très grands écrans 4K)
  return Math.min(Math.max(roundedScale, 0.6), 1.5);
};

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'config'>('dashboard');
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [brightness, setBrightness] = useState(100);
  
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opeq-zoom-manual');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    
    return calculateIdealZoom();
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomLevel * 16}px`;
  }, [zoomLevel]);

  // Handle auto-adjust on resize or when entering fullscreen
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Automatically adjust the DPI on window resize (e.g. going fullscreen)
        const ideal = calculateIdealZoom();
        setZoomLevel(ideal);
        try {
          // Clear manual override when the window size significantly changes
          localStorage.removeItem('opeq-zoom-manual');
        } catch {}
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const [sysInfo, setSysInfo] = useState<Record<string, string>>(() => {
    return {
      'Modèle :': 'Chargement...',
      'Numéro de série :': 'Chargement...',
      'Version de Bios :': 'Chargement...',
      'CPU :': 'Chargement...',
      'Memoire :': 'Chargement...',
      'Disque :': 'Chargement...',
      'Numéro de série disque(s) :': 'Chargement...',
      'État SMART :': 'OK',
      'Carte Vidéo :': 'Chargement...',
      'UUID :': 'Chargement...',
      'Asset Tag :': 'Chargement...',
      'Ownership Tag :': 'Chargement...',
    };
  });

  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>(() => {
    try {
      localStorage.removeItem('opeq-security-cache');
    } catch {}
    return { tpm: null, secureBoot: null, isUefi: null };
  });

  const [isNetworkConnected, setIsNetworkConnected] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showConfigAuth, setShowConfigAuth] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Parallel non-blocking initialization sequence
    const initApp = async () => {
      const coreType = isTauri() ? 'Tauri (Rust + WebView2)' : 'Simulateur Web / Local';
      const initialLog = `[${new Date().toLocaleTimeString()}] System Core Initialisé: ${coreType}`;
      setDebugLogs([initialLog]);

      // 1. Fetch system info immediately in parallel
      hardwareAPI.getSysInfo()
        .then(info => {
          if (isMounted && info) {
            setSysInfo(info);
          }
        })
        .catch(err => {
          console.error('Erreur getSysInfo:', err);
        });

      // 2. Fetch live security status immediately (direct hardware/registry query, no stale cache)
      hardwareAPI.checkSecurityStatus(true)
        .then(securityRes => {
          if (isMounted && securityRes) {
            setSecurityStatus(securityRes);
          }
        })
        .catch(err => {
          console.error('Erreur checkSecurityStatus:', err);
        });

      // 3. Load config and trigger non-blocking network connection
      hardwareAPI.loadConfig()
        .then(loadedConfig => {
          if (!isMounted) return;
          setConfig(loadedConfig);

          const netPath = loadedConfig.networkAuth?.path || loadedConfig.nasDriversPath || '\\\\serveur-nas\\Tech';
          const netUser = loadedConfig.networkAuth?.user || '';
          const netPass = loadedConfig.networkAuth?.pass || '';

          hardwareAPI.connectNetwork(netPath, netUser, netPass)
            .then(result => {
              if (!isMounted) return;
              if (result.success) {
                setIsNetworkConnected(true);
                setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Réseau auto-connecté (${netPath})`, ...prev].slice(0, 50));
              } else {
                setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Détection réseau: ${result.message}`, ...prev].slice(0, 50));
              }
            })
            .catch(e => {
              console.warn('Auto-connect non critique:', e);
            });
        })
        .catch(err => {
          console.error('Erreur loadConfig:', err);
        });
    };

    initApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initial brightness setup
  useEffect(() => {
    hardwareAPI.setSystemBrightness(brightness);
  }, []);

  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    await hardwareAPI.saveConfig(newConfig);
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] Configuration sauvegardée avec succès`, ...prev].slice(0, 50));
    setCurrentView('dashboard');
  };

  const handleRefresh = async () => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] Actualisation forcée du matériel et de la sécurité...`, ...prev].slice(0, 50));
    try {
      const [newInfo, newSec] = await Promise.all([
        hardwareAPI.getSysInfo(true),
        hardwareAPI.checkSecurityStatus(true)
      ]);
      if (newInfo) setSysInfo(newInfo);
      if (newSec) setSecurityStatus(newSec);
      setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Spécifications et sécurité actualisées avec succès`, ...prev].slice(0, 50));
    } catch (err: any) {
      setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Erreur lors de l'actualisation: ${err.message || 'Erreur inconnue'}`, ...prev].slice(0, 50));
    }
  };

  const handleRefreshSecurity = async () => {
    try {
      const newSec = await hardwareAPI.checkSecurityStatus(true);
      if (newSec) {
        setSecurityStatus(newSec);
        setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Sécurité matérielle actualisée (TPM: ${newSec.tpm ? 'Oui' : 'Non'}, Secure Boot: ${newSec.secureBoot ? 'Actif' : 'Inactif'}, UEFI: ${newSec.isUefi ? 'Oui' : 'Non'})`, ...prev].slice(0, 50));
      }
      return newSec;
    } catch (err: any) {
      console.error('Erreur actualisation sécurité ciblée:', err);
    }
  };

  const executeAction = async (actionName: string, path: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] Lancement de: ${actionName} (${path})`, ...prev].slice(0, 50));

    try {
      const result = await hardwareAPI.executeAction(actionName, path);
      if (result && result.error) {
        setDebugLogs(prev => [`[${timestamp}] ERREUR: ${result.error}`, ...prev].slice(0, 50));
      } else if (result && result.output) {
        setDebugLogs(prev => [`[${timestamp}] SUCCÈS: ${result.output}`, ...prev].slice(0, 50));
      } else {
        setDebugLogs(prev => [`[${timestamp}] SUCCÈS: Commande exécutée via Rust Core`, ...prev].slice(0, 50));
      }
    } catch (err: any) {
      setDebugLogs(prev => [`[${timestamp}] EXCEPTION: ${err.message || 'Erreur inconnue'}`, ...prev].slice(0, 50));
    }
  };

  return (
    <div 
      className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative antialiased"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 200px 100px at top left, rgba(9, 9, 11, 1) 40%, rgba(9, 9, 11, 0) 100%),
          url('/background.png')
        `,
        backgroundSize: 'auto, cover',
        backgroundPosition: 'top left, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-zinc-950/70 pointer-events-none -z-10" />
      <div className="relative z-0">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="text-emerald-400 animate-pulse">Chargement...</span></div>}>
          {currentView === 'dashboard' ? (
          <Dashboard 
            config={config} 
            onOpenConfig={() => setShowConfigAuth(true)} 
            onOpenNetwork={() => setShowNetworkModal(true)}
            isNetworkConnected={isNetworkConnected}
            onExecute={executeAction}
            onRefresh={handleRefresh}
            onRefreshSecurity={handleRefreshSecurity}
            onClearLogs={() => setDebugLogs([])}
            brightness={brightness}
            setBrightness={setBrightness}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            sysInfo={sysInfo}
            securityStatus={securityStatus}
            debugLogs={debugLogs}
          />
        ) : (
          <ConfigPage 
            config={config} 
            onSave={handleSaveConfig} 
            onCancel={() => setCurrentView('dashboard')} 
            onOpenNetwork={() => setShowNetworkModal(true)}
            isNetworkConnected={isNetworkConnected}
          />
        )}

        {showNetworkModal && (
          <NetworkLoginModal
            isOpen={showNetworkModal}
            onClose={() => setShowNetworkModal(false)}
            config={config}
            onSaveConfig={async (newConfig) => {
              setConfig(newConfig);
              await hardwareAPI.saveConfig(newConfig);
              const timestamp = new Date().toLocaleTimeString();
              setDebugLogs(prev => [`[${timestamp}] Identifiants réseau sauvegardés dans config.json`, ...prev].slice(0, 50));
            }}
            onSuccess={() => {
              setIsNetworkConnected(true);
              const timestamp = new Date().toLocaleTimeString();
              setDebugLogs(prev => [`[${timestamp}] Connexion réseau établie avec succès`, ...prev].slice(0, 50));
            }}
          />
        )}
        <ConfigAuthModal 
          isOpen={showConfigAuth} 
          onClose={() => setShowConfigAuth(false)} 
          onSuccess={() => {
            setShowConfigAuth(false);
            setCurrentView('config');
          }} 
          correctHash={config.adminPasswordHash || DEFAULT_ADMIN_HASH} 
        />
        </Suspense>
      </div>
    </div>
  );
}
