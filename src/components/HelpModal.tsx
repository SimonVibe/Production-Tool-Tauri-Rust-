import { useState, useEffect, useRef } from 'react';
import { 
  X, HelpCircle, BookOpen, Wrench, Wifi, Server, Cpu, Monitor, 
  Camera, Volume2, Keyboard, Flame, Battery, ShieldCheck, Download, 
  Upload, Terminal, CheckCircle2, AlertTriangle, ArrowRight,
  ExternalLink, Copy, Check, Sparkles, Laptop, HardDrive, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
  onOpenNasModal?: () => void;
  onOpenWuModal?: () => void;
  onOpenBiosModal?: () => void;
  onOpenScreenModal?: () => void;
  onOpenCamMicModal?: () => void;
}

export type HelpTabType = 'workflow' | 'drivers' | 'bios' | 'tests' | 'network' | 'shortcuts';
type TabType = HelpTabType;

export default function HelpModal({
  isOpen,
  onClose,
  initialTab,
  onOpenNasModal,
  onOpenWuModal,
  onOpenBiosModal,
  onOpenScreenModal,
  onOpenCamMicModal
}: Props) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'workflow');
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedShortcut(label);
    setTimeout(() => setCopiedShortcut(null), 1500);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'workflow', label: language === 'en' ? '1. Global Procedure' : '1. Procédure Globale', icon: BookOpen },
    { id: 'drivers', label: language === 'en' ? '2. Drivers & NAS' : '2. Pilotes & NAS', icon: Cpu },
    { id: 'bios', label: language === 'en' ? '3. BIOS / Firmware' : '3. BIOS / Firmware', icon: Sparkles },
    { id: 'tests', label: language === 'en' ? '4. Hardware Diagnostics' : '4. Diagnostics Matériel', icon: Wrench },
    { id: 'network', label: language === 'en' ? '5. Network & Shares' : '5. Réseau & Partages', icon: Server },
    { id: 'shortcuts', label: language === 'en' ? '6. Keyboard Shortcuts' : '6. Raccourcis Clavier', icon: Keyboard },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden text-zinc-100">
        
        {/* Top Header */}
        <div className="bg-zinc-900/95 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {language === 'en' ? 'OPEQ User Guide & Procedures' : "Guide & Procédure d'Utilisation OPEQ"}
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                {language === 'en'
                  ? 'Refurbishing, driver installation, updates, and hardware testing'
                  : 'Reconditionnement, installation des pilotes, mises à jour et tests matériels'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose} 
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              title={language === 'en' ? 'Close (Esc)' : 'Fermer (Échap)'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div 
          ref={tabContainerRef}
          onWheel={(e) => {
            if (tabContainerRef.current) {
              tabContainerRef.current.scrollLeft += e.deltaY;
            }
          }}
          className="bg-zinc-900/50 px-6 py-2 border-b border-zinc-800/80 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar shrink-0"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-zinc-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* TAB 1: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-400" />
                  {language === 'en' ? 'Recommended Workflow for an OPEQ Computer' : 'Flux de Travail Recommandé pour un Ordinateur OPEQ'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'Follow this standard timeline to quickly certify and refurbish each unit.'
                    : 'Suivez cette chronologie standard pour certifier et reconditionner rapidement chaque unité.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Étape 1 */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {language === 'en' ? 'STEP 1' : 'ÉTAPE 1'}
                    </span>
                    <Wifi size={16} className="text-zinc-500" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-100">
                    {language === 'en' ? '1. Network Connection & Authentication' : '1. Connexion Réseau & Authentification'}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>Connect the Ethernet cable. Click the <strong className="text-white">OPEQ Network</strong> button in the top right to mount the NAS network share (<code className="text-cyan-400 font-mono">\\serveur-nas\Tech</code>).</>
                      : <>Branchez le câble Ethernet. Cliquez sur le bouton <strong className="text-white">Réseau OPEQ</strong> en haut à droite pour monter le lecteur réseau NAS (<code className="text-cyan-400 font-mono">\\serveur-nas\Tech</code>).</>}
                  </p>
                </div>

                {/* Étape 2 */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {language === 'en' ? 'STEP 2' : 'ÉTAPE 2'}
                    </span>
                    <Cpu size={16} className="text-zinc-500" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-100">
                    {language === 'en' ? '2. Hardware Driver Installation' : '2. Installation des Pilotes Matériels'}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>Press <strong className="text-white font-mono">[P]</strong> to open the Driver Center. Prioritize the <strong className="text-blue-400">NAS Network Pack</strong> or run <strong className="text-emerald-400">Windows Update</strong> if the model is not yet in the catalog.</>
                      : <>Appuyez sur <strong className="text-white font-mono">[P]</strong> pour ouvrir le Centre des Pilotes. Choisissez en priorité le <strong className="text-blue-400">Pack Réseau NAS</strong> ou lancez <strong className="text-emerald-400">Windows Update</strong> si le modèle n'existe pas encore.</>}
                  </p>
                </div>

                {/* Étape 3 */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      {language === 'en' ? 'STEP 3' : 'ÉTAPE 3'}
                    </span>
                    <Sparkles size={16} className="text-zinc-500" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-100">
                    {language === 'en' ? '3. Firmware / BIOS Update' : '3. Mise à jour Firmware / BIOS'}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>Press <strong className="text-white font-mono">[F]</strong> to inspect SMBIOS version. If an updated OEM capsule is available, apply it (ensure AC power is connected).</>
                      : <>Appuyez sur <strong className="text-white font-mono">[F]</strong> pour inspecter la version du BIOS SMBIOS. Si une capsule OEM plus récente est disponible, appliquez-la (assurez-vous que l'ordinateur est branché sur secteur).</>}
                  </p>
                </div>

                {/* Étape 4 */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {language === 'en' ? 'STEP 4' : 'ÉTAPE 4'}
                    </span>
                    <Wrench size={16} className="text-zinc-500" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-100">
                    {language === 'en' ? '4. Hardware Diagnostic Tests' : '4. Tests Diagnostics Matériels'}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>Run the integrated quick test suite: Screen <strong className="text-white font-mono">[E]</strong>, Camera/Mic <strong className="text-white font-mono">[C]</strong>, Keyboard <strong className="text-white font-mono">[K]</strong>, Sound <strong className="text-white font-mono">[S]</strong>, Battery <strong className="text-white font-mono">[B]</strong> and BurnIn <strong className="text-white font-mono">[T]</strong>.</>
                      : <>Exécutez la suite de tests rapides intégrée : Écran <strong className="text-white font-mono">[E]</strong>, Caméra/Micro <strong className="text-white font-mono">[C]</strong>, Clavier <strong className="text-white font-mono">[K]</strong>, Son <strong className="text-white font-mono">[S]</strong>, Batterie <strong className="text-white font-mono">[B]</strong> et BurnIn <strong className="text-white font-mono">[T]</strong>.</>}
                  </p>
                </div>

                {/* Étape 5 */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 md:col-span-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                      {language === 'en' ? 'STEP 5 (Optional but recommended)' : 'ÉTAPE 5 (Optionnelle mais recommandée)'}
                    </span>
                    <Upload size={16} className="text-cyan-400" />
                  </div>
                  <h5 className="text-xs font-bold text-zinc-100">
                    {language === 'en' ? '5. Export Driver Pack to NAS (DISM)' : '5. Exportation du Pack de Pilotes vers le NAS (DISM)'}
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>If this model is new or you just installed all drivers via Windows Update / SDIO, go to tab <strong className="text-emerald-400">Export to NAS</strong>. This will automatically archive all drivers for future units of the same model!</>
                      : <>Si ce modèle est nouveau ou si vous venez d'installer tous les pilotes via Windows Update / SDIO, rendez-vous dans l'onglet <strong className="text-emerald-400">Exporter vers le NAS</strong>. Cela sauvera automatiquement tous les pilotes pour les prochains ordinateurs identiques !</>}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DRIVERS & NAS */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu size={18} className="text-emerald-400" />
                  {language === 'en' ? 'Driver Management & Installation' : 'Gestion & Installation des Pilotes'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'The different methods built into the app to equip each machine.'
                    : "Les différentes méthodes intégrées dans l'application pour équiper chaque machine."}
                </p>
              </div>

              <div className="space-y-4">
                {/* Méthode 1: NAS */}
                <div className="p-4 bg-zinc-900/70 border border-blue-500/30 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Server size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">
                          {language === 'en' ? 'Method 1: NAS Folder & PnPUtil (Recommended)' : 'Méthode 1 : Dossier NAS & PnPUtil (Recommandé)'}
                        </h5>
                        <p className="text-[11px] text-zinc-400">
                          {language === 'en' ? 'Instant detection by Brand / Form Factor / Model' : 'Détection instantanée par Marque / Châssis / Modèle'}
                        </p>
                      </div>
                    </div>
                    {onOpenNasModal && (
                      <button
                        onClick={() => { onClose(); onOpenNasModal(); }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{language === 'en' ? 'Open' : 'Ouvrir'}</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {language === 'en'
                      ? <>The application queries WMI to extract make (e.g. HP) and exact model (e.g. EliteBook 840 G8). It scans folder <code className="font-mono text-cyan-300">\\serveur-nas\Tech\Drivers\Make</code> and automatically matches the correct pack.</>
                      : <>L'application interroge le WMI pour extraire la marque (ex: HP) et le modèle exact (ex: EliteBook 840 G8). Elle scanne le dossier <code className="font-mono text-cyan-300">\\serveur-nas\Tech\Drivers\Marque</code> et fait correspondre automatiquement le bon pack.</>}
                  </p>
                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 space-y-2">
                    <p className="font-semibold text-zinc-300">
                      {language === 'en' ? '💡 Optimized interface by categories' : '💡 Nouveau : Interface optimisée par catégories'}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {language === 'en' ? (
                        <>
                          <li><strong className="text-zinc-200">Collapsed categories by default</strong> for a cleaner overview.</li>
                          <li><strong className="text-zinc-200">Global checkbox</strong> (square icon) next to category name to toggle all in one click.</li>
                          <li>Logs scroll automatically at the bottom during injection.</li>
                        </>
                      ) : (
                        <>
                          <li><strong className="text-zinc-200">Catégories réduites par défaut</strong> pour une meilleure vue d'ensemble.</li>
                          <li><strong className="text-zinc-200">Coche globale</strong> (icône carrée) à côté du nom de la catégorie pour tout sélectionner/désélectionner d'un clic.</li>
                          <li>Les logs défilent automatiquement en bas de page lors de l'installation.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Méthode 2: Windows Update */}
                <div className="p-4 bg-zinc-900/70 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Download size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">
                          {language === 'en' ? 'Method 2: Drivers via Windows Update (Microsoft)' : 'Méthode 2 : Pilotes via Windows Update (Microsoft)'}
                        </h5>
                        <p className="text-[11px] text-zinc-400">
                          {language === 'en' ? 'Microsoft Update Agent online catalog' : 'Catalogue en ligne Microsoft Update Agent'}
                        </p>
                      </div>
                    </div>
                    {onOpenWuModal && (
                      <button
                        onClick={() => { onClose(); onOpenWuModal(); }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{language === 'en' ? 'Open' : 'Ouvrir'}</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {language === 'en'
                      ? 'If the model is not yet available on the NAS, this interface allows querying certified drivers directly from Microsoft, choosing components, and following live progress.'
                      : "Si le modèle n'existe pas encore sur le NAS, cette interface permet de rechercher les pilotes certifiés directement auprès de Microsoft, de sélectionner les composants souhaités et de suivre l'installation en temps réel."}
                  </p>
                </div>

                {/* Méthode 3: Export DISM & Gestion dossiers existants */}
                <div className="p-4 bg-zinc-900/70 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Upload size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        {language === 'en' ? 'DISM Export & Existing Folder Handling' : 'Exportation DISM & Détection des Dossiers Existants'}
                      </h5>
                      <p className="text-[11px] text-zinc-400">
                        {language === 'en' ? 'Safe name collision management on network server' : 'Gestion sécurisée des conflits de noms sur le serveur réseau'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {language === 'en' ? 'During export (' : "Lors de l'exportation ("}<code className="font-mono text-zinc-200">dism.exe /online /export-driver</code>) :
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    {language === 'en' ? (
                      <>
                        <li><strong className="text-zinc-200">If folder doesn't exist:</strong> Automatically created on NAS with standard hierarchy.</li>
                        <li><strong className="text-zinc-200">If folder already exists:</strong> A prompt asks whether to <span className="text-amber-400 font-semibold">Replace existing contents</span> (cleans older files) or <span className="text-blue-400 font-semibold">Choose another name</span> (e.g. <code className="text-zinc-300">Model_v2</code>).</li>
                      </>
                    ) : (
                      <>
                        <li><strong className="text-zinc-200">Si le dossier n'existe pas :</strong> Il est créé automatiquement sur le NAS dans l'arborescence standardisée.</li>
                        <li><strong className="text-zinc-200">Si le dossier existe déjà :</strong> Une fenêtre d'avertissement s'affiche et vous propose soit de <span className="text-amber-400 font-semibold">Remplacer le contenu existant</span> (nettoie les anciens fichiers avant ré-export), soit de <span className="text-blue-400 font-semibold">Choisir un nouveau nom</span> (ex: <code className="text-zinc-300">Modèle_v2</code>).</li>
                      </>
                    )}
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: BIOS */}
          {activeTab === 'bios' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-400" />
                  {language === 'en' ? 'BIOS / UEFI Update and Verification' : 'Mise à jour et Vérification du BIOS / UEFI'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'Firmware management, TPM 2.0 status and Secure Boot compliance for Windows 11.'
                    : 'Gestion des microprogrammes, statut TPM 2.0 et Secure Boot pour la conformité Windows 11.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    <h5 className="text-xs font-bold text-white">
                      {language === 'en' ? 'TPM 2.0 & Secure Boot Compliance' : 'Conformité TPM 2.0 & Secure Boot'}
                    </h5>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>The top banner displays real-time status of the TPM security processor and Secure Boot. If inactive, click <strong className="text-amber-400">Security Guide</strong> for BIOS Setup activation steps (F10 for HP, F2 for Dell, F1 for Lenovo).</>
                      : <>Le bandeau supérieur affiche en direct l'état du processeur de sécurité TPM et du démarrage sécurisé. Si l'un des deux est inactif, appuyez sur <strong className="text-amber-400">Guide de Sécurité</strong> pour obtenir les étapes d'activation dans le Setup BIOS (F10 pour HP, F2 pour Dell, F1 pour Lenovo).</>}
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <h5 className="text-xs font-bold text-white">
                      {language === 'en' ? 'Firmware Flash via Windows Capsules' : 'Flash Firmware via Capsules Windows'}
                    </h5>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'en'
                      ? <>The application checks the official UEFI capsule catalog. Pressing <strong className="text-white font-mono">[F]</strong> triggers firmware flashing directly without USB drive.</>
                      : <>L'application interroge le catalogue officiel de capsules UEFI. En appuyant sur <strong className="text-white font-mono">[F]</strong>, vous pouvez déclencher la mise à jour du microprogramme sans clé USB externe.</>}
                  </p>
                  <p className="text-[11px] text-amber-300 font-semibold bg-amber-950/40 p-2 rounded border border-amber-800/40">
                    {language === 'en'
                      ? '⚠️ Safety: Always connect AC power charger and never turn off the PC during BIOS flashing.'
                      : "⚠️ Précautions : Brancher l'adaptateur secteur AC et ne jamais éteindre l'ordinateur durant l'écriture du BIOS."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TESTS */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench size={18} className="text-amber-400" />
                  {language === 'en' ? 'Hardware Diagnostics & Testing Guide' : 'Guide des Diagnostics & Tests Matériels'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'All built-in tools to validate the physical health of the computer.'
                    : "Tous les outils intégrés pour valider l'état physique de l'ordinateur."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor size={16} className="text-cyan-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'Screen & Dead Pixel Test' : 'Test Écran & Pixels'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">E</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Displays 5 full-screen colors (Red, Green, Blue, White, Black) to quickly spot dead pixels, lines and tint issues.'
                      : 'Affiche 5 fonds de couleur plein écran (Rouge, Vert, Bleu, Blanc, Noir) pour repérer immédiatement les pixels morts, lignes et décolorations.'}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera size={16} className="text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'Camera & Mic Test' : 'Test Caméra & Micro'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">C</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Activates live webcam stream and responsive VU-meter to verify microphone voice capture.'
                      : 'Active le flux webcam en direct et un VU-mètre audio réactif pour confirmer que le microphone capte clairement la voix.'}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Keyboard size={16} className="text-purple-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'Keyboard Test (AquaKey)' : 'Test Clavier (AquaKey)'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">K</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Launches AquaKeyTest to check each physical keyboard key (letters, function keys, numpad).'
                      : 'Lance le logiciel AquaKeyTest pour vérifier individuellement chaque touche du clavier physique (lettres, fonctions, pavé numérique).'}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 size={16} className="text-indigo-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'Windows Sound Test' : 'Test de Son Windows'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">S</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Opens the standard Windows audio dialogue to test left/right stereo speakers and headphone jack.'
                      : 'Ouvre la boîte de dialogue audio Windows standard pour tester les haut-parleurs gauche/droite et la prise casque jack.'}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Battery size={16} className="text-amber-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'Battery Diagnostic' : 'Diagnostic Batterie'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">B</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Inspects battery wear (% of design capacity, cycle count, runtime and general health).'
                      : "Inspecte l'état d'usure de la batterie (usure % de la capacité d'origine, nombre de cycles et santé générale)."}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flame size={16} className="text-rose-400" />
                      <span className="text-xs font-bold text-white">
                        {language === 'en' ? 'BurnIn Stress Test' : 'BurnIn Stress Test'}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">T</kbd>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {language === 'en'
                      ? 'Runs intensive stress load on CPU, RAM, and GPU to ensure system stability under high load without overheating.'
                      : 'Exécute un test de charge intensif sur le processeur (CPU), la mémoire vive (RAM) et la carte vidéo pour éliminer tout défaut de surchauffe.'}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: NETWORK */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Server size={18} className="text-blue-400" />
                  {language === 'en' ? 'Network Configuration & OPEQ NAS Shares' : 'Configuration Réseau & Partages NAS OPEQ'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'Connection parameters for workshop shared folders.'
                    : "Paramètres de connexion aux dossiers partagés de l'atelier."}
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3 text-xs text-zinc-300 leading-relaxed">
                <h5 className="font-bold text-white">
                  {language === 'en' ? 'Default Access Paths' : "Chemins d'accès par défaut"}
                </h5>
                <div className="space-y-2">
                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">
                        {language === 'en' ? 'NAS Drivers Folder:' : 'Dossier Pilotes NAS :'}
                      </span>
                      <code className="text-cyan-300 font-mono font-bold">\\serveur-nas\Tech\Drivers</code>
                    </div>
                    <button
                      onClick={() => copyText('\\\\serveur-nas\\Tech\\Drivers', 'nas-drivers')}
                      className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                      title={language === 'en' ? 'Copy path' : 'Copier le chemin'}
                    >
                      {copiedShortcut === 'nas-drivers' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">
                        {language === 'en' ? 'NAS Tools & Utilities Folder:' : 'Dossier Outils & Utilitaires :'}
                      </span>
                      <code className="text-cyan-300 font-mono font-bold">\\serveur-nas\Tech\Tools</code>
                    </div>
                    <button
                      onClick={() => copyText('\\\\serveur-nas\\Tech\\Tools', 'nas-tools')}
                      className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                      title={language === 'en' ? 'Copy path' : 'Copier le chemin'}
                    >
                      {copiedShortcut === 'nas-tools' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-zinc-400 space-y-1">
                  <p>
                    <strong className="text-zinc-200">{language === 'en' ? 'Authentication format:' : "Format d'authentification :"}</strong>{' '}
                    {language === 'en'
                      ? <>If prompted, enter domain user as <code className="text-zinc-200 font-mono">opeq-qc\user</code> or <code className="text-zinc-200 font-mono">.\user</code>.</>
                      : <>Si demandé, utilisez le compte de domaine sous la forme <code className="text-zinc-200 font-mono">opeq-qc\utilisateur</code> ou <code className="text-zinc-200 font-mono">.\utilisateur</code>.</>}
                  </p>
                  <p>
                    <strong className="text-zinc-200">{language === 'en' ? 'Custom configuration:' : 'Configuration personnalisée :'}</strong>{' '}
                    {language === 'en'
                      ? <>You can change these paths anytime via the <strong className="text-white">Settings icon (Gear)</strong>.</>
                      : <>Vous pouvez modifier ces chemins à tout moment via l'icône <strong className="text-white">Paramètres (Roue dentée)</strong>.</>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Keyboard size={18} className="text-purple-400" />
                  {language === 'en' ? 'Technician Keyboard Shortcuts' : 'Tableau des Raccourcis Clavier Technicien'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'en'
                    ? 'Save time by controlling the entire application directly from the keyboard.'
                    : "Gagnez du temps en pilotant toute l'application directement au clavier."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'H / F1', label: language === 'en' ? 'OPEQ Guide & Help' : 'Guide & Aide OPEQ', desc: language === 'en' ? 'Opens this complete technical guide' : 'Ouvre ce manuel technique complet' },
                  { key: 'P', label: language === 'en' ? 'Driver Manager' : 'Gestionnaire de Pilotes', desc: language === 'en' ? 'Opens PnPUtil & Windows Update center' : 'Ouvre le centre PnPUtil & Windows Update' },
                  { key: 'F', label: language === 'en' ? 'BIOS Firmware' : 'Firmware BIOS', desc: language === 'en' ? 'Opens UEFI & SMBIOS updater' : 'Ouvre la mise à jour UEFI & SMBIOS' },
                  { key: 'E', label: language === 'en' ? 'Screen Test' : 'Test Écran', desc: language === 'en' ? '5 colors & dead pixel test' : 'Test 5 couleurs et pixels morts' },
                  { key: 'C', label: language === 'en' ? 'Camera & Mic Test' : 'Test Caméra & Micro', desc: language === 'en' ? 'Live video preview & VU-meter' : 'Aperçu vidéo direct et VU-mètre' },
                  { key: 'K', label: language === 'en' ? 'Keyboard Test' : 'Test Clavier', desc: language === 'en' ? 'Launches AquaKeyTest' : 'Lance AquaKeyTest' },
                  { key: 'S', label: language === 'en' ? 'Sound Test' : 'Test Son', desc: language === 'en' ? 'Opens Windows audio control panel' : 'Ouvre le panneau audio Windows' },
                  { key: 'B', label: language === 'en' ? 'Battery Diagnostic' : 'Diagnostic Batterie', desc: language === 'en' ? 'Opens battery status tool' : "Lance l'outil d'état de batterie" },
                  { key: 'T', label: language === 'en' ? 'BurnIn Test' : 'BurnIn Test', desc: language === 'en' ? 'Launches stress test' : 'Lance le test de stress' },
                  { key: 'L', label: language === 'en' ? 'Logs Journal' : 'Journal des Logs', desc: language === 'en' ? 'Shows or hides system logs' : 'Affiche ou masque les logs système' },
                  { key: 'F5 / R', label: language === 'en' ? 'Refresh' : 'Actualiser', desc: language === 'en' ? 'Rescans hardware, battery, and specs' : 'Re-scanne le matériel, la batterie et les spécifications' },
                  { key: 'Esc', label: language === 'en' ? 'Close' : 'Fermer', desc: language === 'en' ? 'Closes the active modal' : 'Ferme la fenêtre modale active' },
                ].map((s) => (
                  <div key={s.key} className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100">{s.label}</span>
                      <kbd className="px-2 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-[11px] font-mono text-emerald-400 font-bold shadow-xs">
                        {s.key}
                      </kbd>
                    </div>
                    <p className="text-[11px] text-zinc-400">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* removed FAQ tab content */}

        </div>

        {/* Footer */}
        <div className="bg-zinc-900/95 px-6 py-3.5 flex items-center justify-between border-t border-zinc-800 shrink-0">
          <div className="text-xs text-zinc-500 font-mono">
            {language === 'en'
              ? 'OPEQ Refurbishing Workshop • Integrated online guide'
              : 'OPEQ Atelier Reconditionnement • Aide en ligne intégrée'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Close guide' : 'Fermer le guide'}
          </button>
        </div>

      </div>
    </div>
  );
}
