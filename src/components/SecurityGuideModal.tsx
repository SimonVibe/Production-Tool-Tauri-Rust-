import { useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  X, ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, 
  Key, RefreshCw, Cpu, Laptop, Copy, Check, Sparkles, CheckCircle
} from 'lucide-react';
import { SecurityStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface SecurityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  securityStatus: SecurityStatus;
  onRefresh: () => void;
  detectedModel?: string;
}

type BrandType = 'hp' | 'dell' | 'lenovo' | 'toshiba' | 'other';

interface GuideStep {
  stepNumber: number;
  category: 'bios-access' | 'tpm' | 'secure-boot' | 'uefi' | 'keys' | 'save' | 'hp-code';
  title: string;
  badgeLabel?: string;
  description: ReactNode;
  tip?: string;
}

export function SecurityGuideModal({
  isOpen,
  onClose,
  securityStatus,
  onRefresh,
  detectedModel = '',
}: SecurityGuideModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [selectedBrand, setSelectedBrand] = useState<BrandType>('other');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (!detectedModel) return;
    const m = detectedModel.toLowerCase();
    if (m.includes('hp') || m.includes('probook') || m.includes('elitebook') || m.includes('zbook') || m.includes('hewlett')) {
      setSelectedBrand('hp');
    } else if (m.includes('dell') || m.includes('latitude') || m.includes('optiplex') || m.includes('precision') || m.includes('inspiron') || m.includes('vostro')) {
      setSelectedBrand('dell');
    } else if (m.includes('lenovo') || m.includes('thinkpad') || m.includes('thinkcentre') || m.includes('ideapad')) {
      setSelectedBrand('lenovo');
    } else if (m.includes('toshiba') || m.includes('dynabook') || m.includes('portege') || m.includes('satellite') || m.includes('tecra')) {
      setSelectedBrand('toshiba');
    } else {
      setSelectedBrand('other');
    }
  }, [detectedModel]);

  useEffect(() => {
    if (isOpen) {
      onRefresh();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const needsTpm = !securityStatus.tpm;
  const needsSecureBoot = !securityStatus.secureBoot;
  const needsUefi = securityStatus.isUefi === false;
  const needsAnyAction = needsTpm || needsSecureBoot || needsUefi;

  // Determines if a specific step should be highlighted based on actual missing security features
  const isStepHighlighted = (category: GuideStep['category']) => {
    if (category === 'bios-access' || category === 'save') {
      return needsAnyAction;
    }
    if (category === 'tpm') {
      return needsTpm;
    }
    if (category === 'secure-boot') {
      return needsSecureBoot;
    }
    if (category === 'uefi') {
      return needsSecureBoot || needsUefi;
    }
    if (category === 'keys') {
      return needsSecureBoot;
    }
    if (category === 'hp-code') {
      return needsSecureBoot;
    }
    return false;
  };

  // Determines if a feature handled by this step is already compliant
  const isStepAlreadyCompliant = (category: GuideStep['category']) => {
    if (category === 'tpm' && securityStatus.tpm) return true;
    if (category === 'secure-boot' && securityStatus.secureBoot) return true;
    if (category === 'uefi' && securityStatus.isUefi === true) return true;
    return false;
  };

  // Steps definition for HP
  const hpSteps: GuideStep[] = useMemo(() => [
    {
      stepNumber: 1,
      category: 'bios-access',
      title: isEn ? 'Access HP BIOS Setup' : 'Accéder au BIOS HP Setup',
      badgeLabel: isEn ? 'Boot' : 'Démarrage',
      description: isEn ? (
        <span>
          Restart the PC and immediately and repeatedly press the <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Esc (ESC)</kbd> key then <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> to enter BIOS configuration (HP BIOS Setup).
        </span>
      ) : (
        <span>
          Redémarrez le PC et appuyez immédiatement et de façon répétée sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Échap (ESC)</kbd> puis sur <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> pour entrer dans la configuration du BIOS (HP BIOS Setup).
        </span>
      ),
    },
    {
      stepNumber: 2,
      category: 'tpm',
      title: isEn ? 'Enable TPM 2.0 Security Component' : 'Activer le composant de sécurité TPM 2.0',
      badgeLabel: isEn ? 'TPM Security' : 'Sécurité TPM',
      description: isEn ? (
        <span>
          Go to the <strong className="text-white">Security</strong> tab &rarr; <strong className="text-white">TPM Embedded Security</strong> (or <em>Security Device Support</em>). Make sure the device state is set to <strong className="text-emerald-300">Available / Enabled</strong> and activated.
        </span>
      ) : (
        <span>
          Allez dans l'onglet <strong className="text-white">Sécurité (Security)</strong> &rarr; <strong className="text-white">TPM Embedded Security</strong> (ou <em>Security Device Support</em>). Vérifiez que l'état du périphérique est sur <strong className="text-emerald-300">Available / Enabled</strong> et activé.
        </span>
      ),
    },
    {
      stepNumber: 3,
      category: 'secure-boot',
      title: isEn ? 'Secure Boot Configuration' : 'Configuration du Démarrage Sécurisé (Secure Boot)',
      badgeLabel: 'Secure Boot',
      description: isEn ? (
        <span>
          In the <strong className="text-white">Security</strong> or <strong className="text-white">Advanced</strong> tab &rarr; <strong className="text-white">Secure Boot Configuration</strong>.
        </span>
      ) : (
        <span>
          Dans l'onglet <strong className="text-white">Sécurité</strong> ou <strong className="text-white">Avancé (Advanced)</strong> &rarr; <strong className="text-white">Configuration du démarrage sécurisé (Secure Boot Configuration)</strong>.
        </span>
      ),
    },
    {
      stepNumber: 4,
      category: 'uefi',
      title: isEn ? 'Disable Legacy Mode & Enable Secure Boot' : 'Désactiver le mode hérité & activer Secure Boot',
      badgeLabel: isEn ? 'UEFI Mode' : 'Mode UEFI',
      description: (
        <div>
          <span>{isEn ? 'In the dropdown menu, specifically select the option:' : 'Dans le menu déroulant, sélectionnez précisément l\'option :'}</span>
          <div className="mt-1 font-mono text-xs text-emerald-300 bg-emerald-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-800/60 inline-block">
            Legacy Support Disable and Secure Boot Enable
          </div>
          <p className="text-zinc-400 text-[11px] mt-1">
            {isEn 
              ? '(Disables legacy support and activates secure boot in pure UEFI mode).' 
              : '(Désactive le support hérité et active le démarrage sécurisé en mode UEFI pur).'}
          </p>
        </div>
      ),
    },
    {
      stepNumber: 5,
      category: 'keys',
      title: isEn ? 'Restore Factory Default Keys' : 'Restauration des clés d\'usine (Factory Default Keys)',
      badgeLabel: isEn ? 'PK/KEK Keys' : 'Clés PK/KEK',
      description: isEn ? (
        <span>
          Ensure factory signature keys are loaded: select <strong className="text-white">Restore Factory Default Keys</strong> if keys were modified or cleared.
        </span>
      ) : (
        <span>
          Assurez-vous que les clés de signature d'usine sont chargées : sélectionnez <strong className="text-white">Restore Factory Default Keys</strong> si les clés avaient été modifiées ou effacées.
        </span>
      ),
    },
    {
      stepNumber: 6,
      category: 'save',
      title: isEn ? 'Save and Exit BIOS' : 'Enregistrer et quitter le BIOS',
      badgeLabel: isEn ? 'Save' : 'Sauvegarde',
      description: isEn ? (
        <span>
          Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10 (Save and Exit)</kbd> and confirm by selecting <strong className="text-white">Yes</strong>.
        </span>
      ) : (
        <span>
          Appuyez sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10 (Sauvegarder et quitter)</kbd> et confirmez la sortie en sélectionnant <strong className="text-white">Yes</strong>.
        </span>
      ),
    },
    {
      stepNumber: 7,
      category: 'hp-code',
      title: isEn ? 'Mandatory 4-Digit On-Screen PIN Confirmation' : 'Saisie obligatoire du code PIN à 4 chiffres à l\'écran',
      badgeLabel: isEn ? 'HP Critical Step' : 'Étape critique HP',
      description: (
        <div>
          <span className="text-amber-300 font-semibold">
            {isEn ? 'You must remain in front of the screen during reboot!' : 'Restez impérativement devant l\'écran au redémarrage !'}
          </span>
          <p className="text-zinc-300 text-xs mt-1">
            {isEn ? (
              <>
                As soon as the blue/grey screen appears asking for Secure Boot confirmation, <strong className="text-white">type the 4 digits displayed on screen</strong> then press the <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Enter</kbd> key. Without this entry, HP cancels the activation.
              </>
            ) : (
              <>
                Dès l'apparition de l'écran bleu/gris demandant la confirmation du Secure Boot, <strong className="text-white">tapez les 4 chiffres affichés à l'écran</strong> puis appuyez sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Entrée</kbd>. Sans cette saisie, HP annule l'activation.
              </>
            )}
          </p>
        </div>
      ),
    },
  ], [isEn]);

  // Steps definition for DELL
  const dellSteps: GuideStep[] = useMemo(() => [
    {
      stepNumber: 1,
      category: 'bios-access',
      title: isEn ? 'Access Dell BIOS Setup' : 'Accéder au BIOS Dell Setup',
      badgeLabel: isEn ? 'Boot' : 'Démarrage',
      description: isEn ? (
        <span>
          Restart the PC and immediately press the <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F2</kbd> key as soon as the Dell logo appears to enter the BIOS.
        </span>
      ) : (
        <span>
          Redémarrez le PC et appuyez immédiatement sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F2</kbd> dès l'apparition du logo Dell pour entrer dans le BIOS.
        </span>
      ),
    },
    {
      stepNumber: 2,
      category: 'tpm',
      title: isEn ? 'Enable TPM 2.0 / Intel PTT' : 'Activer le TPM 2.0 / Intel PTT',
      badgeLabel: isEn ? 'TPM Security' : 'Sécurité TPM',
      description: isEn ? (
        <span>
          In the left tree, open <strong className="text-white">Security</strong> &rarr; <strong className="text-white">TPM 2.0 Security</strong> (or <em>Intel PTT</em>). Check the <strong className="text-emerald-300">TPM On</strong> box and verify that <strong className="text-white">Enabled</strong> is checked.
        </span>
      ) : (
        <span>
          Dans l'arborescence de gauche, ouvrez <strong className="text-white">Security</strong> &rarr; <strong className="text-white">TPM 2.0 Security</strong> (ou <em>Intel PTT</em>). Cochez la case <strong className="text-emerald-300">TPM On</strong> et vérifiez que l'option <strong className="text-white">Enabled</strong> est bien cochée.
        </span>
      ),
    },
    {
      stepNumber: 3,
      category: 'secure-boot',
      title: isEn ? 'Enable Secure Boot' : 'Activer le Démarrage Sécurisé (Secure Boot)',
      badgeLabel: 'Secure Boot',
      description: isEn ? (
        <span>
          Navigate to <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Secure Boot Enable</strong> and select the <strong className="text-emerald-300">Enabled</strong> option.
        </span>
      ) : (
        <span>
          Allez dans la section <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Secure Boot Enable</strong> et cochez l'option <strong className="text-emerald-300">Enabled</strong>.
        </span>
      ),
    },
    {
      stepNumber: 4,
      category: 'uefi',
      title: isEn ? 'Verify UEFI Boot Sequence' : 'Vérifier la séquence de démarrage UEFI',
      badgeLabel: isEn ? 'UEFI Mode' : 'Mode UEFI',
      description: isEn ? (
        <span>
          In the <strong className="text-white">Boot Sequence / Boot Mode</strong> section, ensure the list displays <strong className="text-emerald-300">UEFI</strong> (and not <em>Legacy External Devices</em> or <em>Legacy Boot</em>).
        </span>
      ) : (
        <span>
          Dans la section <strong className="text-white">Boot Sequence / Boot Mode</strong>, assurez-vous que la liste affiche <strong className="text-emerald-300">UEFI</strong> (et non <em>Legacy External Devices</em> ou <em>Legacy Boot</em>).
        </span>
      ),
    },
    {
      stepNumber: 5,
      category: 'keys',
      title: isEn ? 'Key Management (Expert Key Management)' : 'Gestion des clés de sécurité (Expert Key Management)',
      badgeLabel: isEn ? 'PK/KEK Keys' : 'Clés PK/KEK',
      description: isEn ? (
        <span>
          In <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Expert Key Management</strong>, ensure the <strong className="text-white">Enable Custom Mode</strong> option is <u>unchecked/disabled</u> (Deployed Mode / Factory Default).
        </span>
      ) : (
        <span>
          Dans <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Expert Key Management</strong>, assurez-vous que l'option <strong className="text-white">Enable Custom Mode</strong> est <u>désactivée</u> (Mode Déployé / Standard d'usine).
        </span>
      ),
    },
    {
      stepNumber: 6,
      category: 'save',
      title: isEn ? 'Apply Changes and Restart' : 'Appliquer les modifications et redémarrer',
      badgeLabel: isEn ? 'Save' : 'Sauvegarde',
      description: isEn ? (
        <span>
          Click the <strong className="text-white">Apply</strong> button at the bottom right, then click <strong className="text-white">Exit</strong> to reboot into Windows.
        </span>
      ) : (
        <span>
          Cliquez sur le bouton <strong className="text-white">Apply</strong> en bas à droite, puis sur <strong className="text-white">Exit</strong> pour redémarrer sous Windows.
        </span>
      ),
    },
  ], [isEn]);

  // Steps definition for LENOVO
  const lenovoSteps: GuideStep[] = useMemo(() => [
    {
      stepNumber: 1,
      category: 'bios-access',
      title: isEn ? 'Access Lenovo BIOS Setup' : 'Accéder au BIOS Lenovo Setup',
      badgeLabel: isEn ? 'Boot' : 'Démarrage',
      description: isEn ? (
        <span>
          Restart and immediately press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F1</kbd> (or press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Enter</kbd> to interrupt startup, then <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F1</kbd>).
        </span>
      ) : (
        <span>
          Redémarrez et appuyez immédiatement sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F1</kbd> (ou appuyez sur <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">Entrée</kbd> pour interrompre le démarrage puis <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F1</kbd>).
        </span>
      ),
    },
    {
      stepNumber: 2,
      category: 'tpm',
      title: isEn ? 'Enable TPM 2.0 Security Chip' : 'Activer la puce de sécurité TPM 2.0 (Security Chip)',
      badgeLabel: isEn ? 'TPM Security' : 'Sécurité TPM',
      description: isEn ? (
        <span>
          Go to the <strong className="text-white">Security</strong> tab &rarr; <strong className="text-white">Security Chip</strong>. Ensure Type is set to <strong className="text-white">TPM 2.0</strong> (or <em>Intel PTT</em>) and Status is set to <strong className="text-emerald-300">[Active / Enabled]</strong>.
        </span>
      ) : (
        <span>
          Allez dans l'onglet <strong className="text-white">Security</strong> &rarr; <strong className="text-white">Security Chip</strong>. Assurez-vous que le type est réglé sur <strong className="text-white">TPM 2.0</strong> (ou <em>Intel PTT</em>) et que le statut est sur <strong className="text-emerald-300">[Active / Enabled]</strong>.
        </span>
      ),
    },
    {
      stepNumber: 3,
      category: 'secure-boot',
      title: isEn ? 'Enable Secure Boot' : 'Activer le Secure Boot',
      badgeLabel: 'Secure Boot',
      description: isEn ? (
        <span>
          Still in the <strong className="text-white">Security</strong> tab, move down to <strong className="text-white">Secure Boot</strong> and set the switch to <strong className="text-emerald-300">[Enabled]</strong>.
        </span>
      ) : (
        <span>
          Toujours dans l'onglet <strong className="text-white">Security</strong>, descendez sur <strong className="text-white">Secure Boot</strong> et positionnez le commutateur sur <strong className="text-emerald-300">[Enabled]</strong>.
        </span>
      ),
    },
    {
      stepNumber: 4,
      category: 'uefi',
      title: isEn ? 'Force Pure UEFI Boot Mode' : 'Forcer le démarrage en mode UEFI pur',
      badgeLabel: isEn ? 'UEFI Mode' : 'Mode UEFI',
      description: isEn ? (
        <span>
          If Secure Boot appears greyed out: navigate to the <strong className="text-white">Startup</strong> tab &rarr; <strong className="text-white">UEFI/Legacy Boot</strong> and select <strong className="text-emerald-300">UEFI Only</strong> (with <em>CSM Support: No</em>).
        </span>
      ) : (
        <span>
          Si l'option Secure Boot apparaît grisée : rendez-vous dans l'onglet <strong className="text-white">Startup</strong> &rarr; <strong className="text-white">UEFI/Legacy Boot</strong> et sélectionnez <strong className="text-emerald-300">UEFI Only</strong> (avec <em>CSM Support: No</em>).
        </span>
      ),
    },
    {
      stepNumber: 5,
      category: 'keys',
      title: isEn ? 'Restore Factory Keys' : 'Restaurer les clés d\'usine (Restore Factory Keys)',
      badgeLabel: isEn ? 'PK/KEK Keys' : 'Clés PK/KEK',
      description: isEn ? (
        <span>
          In <strong className="text-white">Security</strong> &rarr; <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Key Management</strong>, you must select <strong className="text-emerald-300">Restore Factory Keys</strong> (or <em>Install Default Keys</em>) and confirm with <strong>Yes</strong>.<br />
          <span className="text-amber-300 font-semibold block mt-1.5">
            ⚠️ Crucial warning: NEVER leave keys cleared (Clear Keys / Reset to Setup Mode). As long as factory keys are not reloaded, Secure Boot remains DISABLED in Setup Mode even if checked as Enabled!
          </span>
        </span>
      ) : (
        <span>
          Dans <strong className="text-white">Security</strong> &rarr; <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Key Management</strong>, sélectionnez impérativement <strong className="text-emerald-300">Restore Factory Keys</strong> (ou <em>Install Default Keys</em>) et confirmez par <strong>Yes</strong>.<br />
          <span className="text-amber-300 font-semibold block mt-1.5">
            ⚠️ Attention cruciale : Ne laissez JAMAIS les clés effacées (Clear Keys / Reset to Setup Mode). Tant que les clés d'usine ne sont pas rechargées, le Secure Boot reste DÉSACTIVÉ en Setup Mode même s'il est coché sur Enabled !
          </span>
        </span>
      ),
    },
    {
      stepNumber: 6,
      category: 'save',
      title: isEn ? 'Save and Restart' : 'Sauvegarder et redémarrer',
      badgeLabel: isEn ? 'Save' : 'Sauvegarde',
      description: isEn ? (
        <span>
          Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> (Save and Exit Setup) and confirm with <strong className="text-white">Yes</strong>.
        </span>
      ) : (
        <span>
          Appuyez sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> (Save and Exit Setup) et confirmez avec <strong className="text-white">Yes</strong>.
        </span>
      ),
    },
  ], [isEn]);

  // Steps definition for TOSHIBA / DYNABOOK
  const toshibaSteps: GuideStep[] = useMemo(() => [
    {
      stepNumber: 1,
      category: 'bios-access',
      title: isEn ? 'Access Toshiba / Dynabook BIOS Setup' : 'Accéder au BIOS Toshiba / Dynabook Setup',
      badgeLabel: isEn ? 'Boot' : 'Démarrage',
      description: isEn ? (
        <span>
          Power on or restart the PC and immediately and repeatedly press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F2</kbd> as soon as the Toshiba/Dynabook logo appears. (Alternative: hold <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F12</kbd> to display the Boot Menu, then select <em>Enter Setup</em>).
        </span>
      ) : (
        <span>
          Allumez ou redémarrez le PC et appuyez immédiatement et de façon répétée sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F2</kbd> dès l'apparition du logo Toshiba/Dynabook. (Alternative : maintenez la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F12</kbd> pour afficher le Boot Menu, puis sélectionnez <em>Enter Setup</em>).
        </span>
      ),
    },
    {
      stepNumber: 2,
      category: 'tpm',
      title: isEn ? 'Enable TPM 2.0 / Intel PTT Module' : 'Activer le module TPM 2.0 / Intel PTT',
      badgeLabel: isEn ? 'TPM Security' : 'Sécurité TPM',
      description: isEn ? (
        <span>
          Go to the <strong className="text-white">Security</strong> (or <em>Advanced Security</em>) tab &rarr; look for <strong className="text-white">Trusted Platform Module (TPM)</strong> or <strong className="text-white">Intel PTT (Platform Trust Technology)</strong> &rarr; Set state to <strong className="text-emerald-300">[Enabled]</strong> or <strong className="text-emerald-300">[Available]</strong>.
        </span>
      ) : (
        <span>
          Allez dans l'onglet <strong className="text-white">Security</strong> (ou <em>Advanced Security</em>) &rarr; cherchez <strong className="text-white">Trusted Platform Module (TPM)</strong> ou <strong className="text-white">Intel PTT (Platform Trust Technology)</strong> &rarr; Réglez l'état sur <strong className="text-emerald-300">[Enabled]</strong> ou <strong className="text-emerald-300">[Available]</strong>.
        </span>
      ),
    },
    {
      stepNumber: 3,
      category: 'secure-boot',
      title: isEn ? 'Enable Secure Boot' : 'Activer le Démarrage Sécurisé (Secure Boot)',
      badgeLabel: 'Secure Boot',
      description: isEn ? (
        <span>
          In the <strong className="text-white">Security</strong> tab (or depending on models: <strong className="text-white">Advanced</strong> &rarr; <strong className="text-white">System Configuration</strong>) &rarr; locate <strong className="text-white">Secure Boot</strong> &rarr; set option to <strong className="text-emerald-300">[Enabled]</strong>.
        </span>
      ) : (
        <span>
          Dans l'onglet <strong className="text-white">Security</strong> (ou selon les modèles : <strong className="text-white">Advanced</strong> &rarr; <strong className="text-white">System Configuration</strong>) &rarr; repérez <strong className="text-white">Secure Boot</strong> &rarr; positionnez l'option sur <strong className="text-emerald-300">[Enabled]</strong>.
        </span>
      ),
    },
    {
      stepNumber: 4,
      category: 'uefi',
      title: isEn ? 'Configure Boot Mode to UEFI Boot' : 'Configurer le mode de démarrage sur UEFI Boot',
      badgeLabel: isEn ? 'UEFI Mode' : 'Mode UEFI',
      description: isEn ? (
        <span>
          In <strong className="text-white">Advanced</strong> &rarr; <strong className="text-white">System Configuration</strong> &rarr; <strong className="text-white">Boot Mode</strong> &rarr; select <strong className="text-emerald-300">[UEFI Boot]</strong> (ensure <em>CSM Boot</em> mode is disabled).
        </span>
      ) : (
        <span>
          Dans l'onglet <strong className="text-white">Advanced</strong> &rarr; <strong className="text-white">System Configuration</strong> &rarr; <strong className="text-white">Boot Mode</strong> &rarr; sélectionnez <strong className="text-emerald-300">[UEFI Boot]</strong> (assurez-vous que le mode <em>CSM Boot</em> est désactivé).
        </span>
      ),
    },
    {
      stepNumber: 5,
      category: 'keys',
      title: isEn ? 'Unlock and Reset Keys (if greyed out)' : 'Déverrouillage et réinitialisation des clés (si grisé)',
      badgeLabel: isEn ? 'Keys / Security' : 'Clés / Sécurité',
      description: isEn ? (
        <span>
          If the Secure Boot option is greyed out: ensure <em>CSM Boot</em> mode is disabled. If necessary, temporarily set an administrator password (<strong className="text-white">Supervisor Password</strong>) in the Security tab to unlock access to Secure Boot.
        </span>
      ) : (
        <span>
          Si l'option Secure Boot est grisée : assurez-vous d'avoir désactivé le mode <em>CSM Boot</em>. Si nécessaire, définissez temporairement un mot de passe administrateur (<strong className="text-white">Supervisor Password</strong>) dans l'onglet Security pour déverrouiller l'accès au Secure Boot.
        </span>
      ),
    },
    {
      stepNumber: 6,
      category: 'save',
      title: isEn ? 'Save Settings and Restart' : 'Enregistrer les paramètres et redémarrer',
      badgeLabel: isEn ? 'Save' : 'Sauvegarde',
      description: isEn ? (
        <span>
          Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> (or select <strong className="text-white">Save and Exit</strong>) then confirm with <strong className="text-white">Yes</strong>.
        </span>
      ) : (
        <span>
          Appuyez sur la touche <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs shadow-xs">F10</kbd> (ou sélectionnez <strong className="text-white">Save and Exit</strong>) puis confirmez avec <strong className="text-white">Yes</strong>.
        </span>
      ),
    },
  ], [isEn]);

  const renderStepsList = (steps: GuideStep[]) => {
    return (
      <div className="space-y-3">
        {steps.map((step) => {
          const highlighted = isStepHighlighted(step.category);
          const compliant = isStepAlreadyCompliant(step.category);

          return (
            <div 
              key={step.stepNumber}
              className={`rounded-xl p-3.5 sm:p-4 border transition-all duration-200 ${
                highlighted
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20'
                  : compliant
                  ? 'bg-zinc-900/30 border-zinc-800/80 opacity-80 hover:opacity-100'
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Step Number Circle */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border mt-0.5 ${
                  highlighted
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                    : compliant
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {compliant && !highlighted ? (
                    <Check size={14} className="text-emerald-400 stroke-[3]" />
                  ) : (
                    step.stepNumber
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm font-bold ${
                        highlighted ? 'text-amber-200' : 'text-zinc-100'
                      }`}>
                        {step.title}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {step.badgeLabel && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                          {step.badgeLabel}
                        </span>
                      )}

                      {highlighted ? (
                        <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs animate-pulse">
                          <Sparkles size={11} className="text-amber-400" />
                          <span>{isEn ? 'Action required' : 'Action requise'}</span>
                        </span>
                      ) : compliant ? (
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle size={11} className="text-emerald-400" />
                          <span>{isEn ? 'Already compliant' : 'Déjà conforme'}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Step Description */}
                  <div className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed pt-0.5">
                    {step.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="bg-zinc-900/95 px-5 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {isEn ? 'Diagnostics & Security Guide (Windows 11)' : 'Diagnostic & Guide Sécurité (Windows 11)'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                  TPM 2.0 & Secure Boot
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {isEn
                  ? 'Tailored BIOS procedures and automatic highlights for missing security features'
                  : 'Procédure BIOS adaptée et surbrillance automatique selon les éléments à activer'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Current Status Overview */}
        <div className="bg-zinc-900/40 p-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* TPM */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${
                securityStatus.tpm 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {securityStatus.tpm ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {isEn ? 'TPM 2.0 Module' : 'Module TPM 2.0'}
                </div>
                <div className={`text-xs font-bold ${securityStatus.tpm ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {securityStatus.tpm 
                    ? (isEn ? 'Active / Detected' : 'Actif / Détecté') 
                    : (isEn ? 'Not detected or inactive' : 'Non détecté ou inactif')}
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800" />
            
            {/* Secure Boot */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${
                securityStatus.secureBoot 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {securityStatus.secureBoot ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {isEn ? 'Secure Boot' : 'Démarrage Sécurisé (Secure Boot)'}
                </div>
                <div className={`text-xs font-bold ${securityStatus.secureBoot ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {securityStatus.secureBoot 
                    ? (isEn ? 'Active in UEFI' : 'Actif dans l\'UEFI') 
                    : (isEn ? 'Inactive / Disabled' : 'Inactif / Non appliqué')}
                </div>
              </div>
            </div>

            {/* HDD Mode */}
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${
                securityStatus.isUefi === null || securityStatus.isUefi === undefined
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  : securityStatus.isUefi 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {securityStatus.isUefi === null || securityStatus.isUefi === undefined ? (
                  <RefreshCw size={16} className="animate-spin text-zinc-400" />
                ) : securityStatus.isUefi ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {isEn ? 'Disk Partition Scheme (HDD)' : 'Installation Disque (HDD)'}
                </div>
                <div className={`text-xs font-bold ${
                  securityStatus.isUefi === null || securityStatus.isUefi === undefined
                    ? 'text-zinc-500'
                    : securityStatus.isUefi 
                    ? 'text-emerald-400' 
                    : 'text-amber-400'
                }`}>
                  {securityStatus.isUefi === null || securityStatus.isUefi === undefined 
                    ? (isEn ? 'Checking...' : 'Vérification...') 
                    : securityStatus.isUefi 
                    ? (isEn ? 'UEFI (GPT Partition)' : 'UEFI (Partition GPT)') 
                    : (isEn ? 'Legacy (MBR Partition)' : 'Legacy (Partition MBR)')}
                </div>
              </div>
            </div>
            
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
            <span>{isEn ? 'Rescan' : 'Réanalyser'}</span>
          </button>
        </div>

        {/* Dynamic Action Required Summary Alert */}
        {needsAnyAction ? (
          <div className="px-5 py-2.5 bg-amber-950/30 border-b border-amber-800/40 flex items-center justify-between gap-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles size={15} className="text-amber-400 shrink-0" />
              <span>
                <strong>{isEn ? 'Recommendation for this PC:' : 'Recommandation pour ce poste :'}</strong>{' '}
                {isEn
                  ? <>Follow the amber highlighted steps below to enable {[
                      needsSecureBoot ? 'Secure Boot' : null,
                      needsTpm ? 'TPM 2.0' : null,
                      needsUefi ? 'UEFI mode' : null,
                    ].filter(Boolean).join(' and ')}.</>
                  : <>Suivez les étapes en surbrillance ambrée ci-dessous pour activer {[
                      needsSecureBoot ? 'le Secure Boot' : null,
                      needsTpm ? 'le TPM 2.0' : null,
                      needsUefi ? 'le mode UEFI' : null,
                    ].filter(Boolean).join(' et ')}.</>}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-emerald-950/30 border-b border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-200 font-medium">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>
              <strong>{isEn ? 'Optimal configuration:' : 'Configuration optimale :'}</strong>{' '}
              {isEn
                ? 'TPM 2.0, Secure Boot and UEFI mode are all active and compliant for Windows 11.'
                : 'Le TPM 2.0, le Secure Boot et le mode UEFI sont tous actifs et conformes pour Windows 11.'}
            </span>
          </div>
        )}

        {/* Brand Selector Tabs */}
        <div className="px-5 pt-3 pb-2 bg-zinc-950 flex flex-wrap items-center gap-2 border-b border-zinc-800/60">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            {isEn ? 'Manufacturer Guide:' : 'Guide Constructeur :'}
          </span>
          
          <button
            onClick={() => setSelectedBrand('hp')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedBrand === 'hp'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
          >
            HP (ProBook / EliteBook)
          </button>

          <button
            onClick={() => setSelectedBrand('dell')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedBrand === 'dell'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
          >
            Dell (Latitude / OptiPlex)
          </button>

          <button
            onClick={() => setSelectedBrand('lenovo')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedBrand === 'lenovo'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
          >
            Lenovo (ThinkPad / ThinkCentre)
          </button>

          <button
            onClick={() => setSelectedBrand('toshiba')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedBrand === 'toshiba'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
          >
            Toshiba / Dynabook (Portégé / Tecra)
          </button>

          <button
            onClick={() => setSelectedBrand('other')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedBrand === 'other'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
          >
            {isEn ? 'General (Windows / GPT)' : 'Général (Windows / GPT)'}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar text-zinc-300 text-xs sm:text-sm leading-relaxed">
          
          {/* HDD Mode Legacy Warning Banner (Visible on all tabs if Legacy is detected) */}
          {securityStatus.isUefi === false && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-2 mb-4">
              <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                <AlertTriangle size={18} className="shrink-0" />
                <span>
                  {isEn 
                    ? 'Blocking issue detected: Hard drive (HDD) installed in Legacy (MBR) mode' 
                    : 'Bloquant détecté : Le disque dur (HDD) est installé en mode Hérité (Legacy / MBR)'}
                </span>
              </div>
              <p className="text-zinc-300 text-xs">
                {isEn ? (
                  <>
                    Windows is installed on an <strong>MBR (Legacy)</strong> partition style. For Secure Boot to work and be validated, Windows must be installed in <strong>UEFI mode (GPT partition)</strong>.
                  </>
                ) : (
                  <>
                    Windows est installé sur une partition de style <strong>MBR (Legacy)</strong>. Pour que le démarrage sécurisé (Secure Boot) puisse fonctionner et être validé, Windows doit impérativement être installé en mode <strong>UEFI (partition GPT)</strong>.
                  </>
                )}
              </p>
              <p className="text-zinc-300 text-xs">
                <strong>{isEn ? 'Solution without reinstalling:' : 'Solution sans réinstaller :'}</strong>{' '}
                {isEn 
                  ? 'Use Microsoft\'s official MBR2GPT tool. Open an elevated Command Prompt (Admin) and type:' 
                  : 'Utilisez l\'outil Microsoft MBR2GPT. Ouvrez une invite de commande (Admin) et tapez :'}
              </p>
              <div className="flex items-center justify-between gap-2 bg-black/60 px-2.5 py-1.5 rounded-lg border border-emerald-900/60 font-mono text-xs">
                <code className="text-emerald-300 select-all">mbr2gpt.exe /convert /allowFullOS</code>
                <button
                  id="copy-mbr2gpt-banner-btn"
                  onClick={() => handleCopy('mbr2gpt.exe /convert /allowFullOS', 'mbr2gpt-banner')}
                  className="inline-flex items-center gap-1.5 px-2 py-1 font-sans text-[11px] font-medium rounded-md bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors cursor-pointer shrink-0"
                  title={isEn ? 'Copy command' : 'Copier la commande'}
                >
                  {copiedId === 'mbr2gpt-banner' ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">{isEn ? 'Copied !' : 'Copié !'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} className="text-emerald-400" />
                      <span>{isEn ? 'Copy' : 'Copier'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-zinc-300 text-xs mt-1">
                {isEn 
                  ? 'Then, restart your computer and enable UEFI + Secure Boot in the BIOS.' 
                  : 'Ensuite, redémarrez et activez l\'UEFI + Secure Boot dans le BIOS.'}
              </p>
            </div>
          )}

          {/* Setup Mode / Keys Cleared Warning Banner */}
          {securityStatus.setupMode && (
            <div className="bg-amber-950/50 border border-amber-500/60 rounded-xl p-3.5 space-y-2 mb-4 shadow-lg shadow-amber-950/20">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <Key size={18} className="shrink-0 text-amber-400" />
                <span>
                  {isEn 
                    ? 'Setup Mode detected: Secure Boot keys cleared' 
                    : 'Mode Installation (Setup Mode) détecté : Clés Secure Boot effacées'}
                </span>
              </div>
              <p className="text-zinc-300 text-xs">
                {isEn ? (
                  <>
                    The UEFI firmware is currently in <strong>Setup Mode</strong> because security keys (PK/KEK) have been erased. In this mode, <strong>even if the Secure Boot option is checked as [Enabled], the motherboard disables Secure Boot</strong> because no boot signatures can be verified without keys.
                  </>
                ) : (
                  <>
                    Le micrologiciel UEFI est actuellement en <strong>Setup Mode</strong> car les clés de sécurité (PK/KEK) ont été effacées. Dans ce mode, <strong>même si l'option Secure Boot est cochée sur [Enabled], la carte mère désactive le Secure Boot</strong> car aucune signature de démarrage ne peut être vérifiée sans clés.
                  </>
                )}
              </p>
              <div className="bg-black/50 p-2.5 rounded-lg border border-amber-800/60 text-xs text-amber-200">
                {isEn ? (
                  <>
                    <strong className="text-emerald-400">👉 30-second solution:</strong> Restart into BIOS &rarr; <strong>Key Management</strong> &rarr; click <strong className="text-emerald-300">Restore Factory Keys</strong> (or <em>Install Default Keys</em>) &rarr; save (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F10</kbd>). Secure Boot will immediately activate upon reboot!
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-400">👉 Solution en 30 secondes :</strong> Redémarrez dans le BIOS &rarr; <strong>Key Management</strong> &rarr; cliquez sur <strong className="text-emerald-300">Restore Factory Keys</strong> (ou <em>Install Default Keys</em>) &rarr; sauvegardez (<kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F10</kbd>). Le Secure Boot s'activera immédiatement au redémarrage !
                  </>
                )}
              </div>
            </div>
          )}

          {/* HP GUIDE */}
          {selectedBrand === 'hp' && (
            <div className="space-y-4">
              {/* Alert Box Specific to HP */}
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <Key size={18} className="shrink-0" />
                  <span>
                    {isEn 
                      ? 'Top cause on HP: The 4-digit confirmation PIN prompt during reboot' 
                      : 'Cause n°1 sur HP : Le code PIN de confirmation à 4 chiffres lors du redémarrage'}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs">
                  {isEn ? (
                    <>
                      On <strong>HP ProBook / EliteBook laptops and PCs (e.g. 650 G6, 850 G6)</strong>, when you enable Secure Boot in the BIOS and save (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F10</kbd>), the HP BIOS displays a blue/grey screen upon reboot:
                    </>
                  ) : (
                    <>
                      Sur les portables et PC <strong>HP ProBook / EliteBook (ex. 650 G6, 850 G6)</strong>, lorsque vous activez le Secure Boot dans le BIOS et enregistrez (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F10</kbd>), le BIOS HP affiche un écran gris/bleu au redémarrage :
                    </>
                  )}
                </p>
                <div className="bg-black/60 border border-amber-900/60 rounded-lg p-3 font-mono text-[11.5px] text-amber-200">
                  "A change to the operating system Secure Boot configuration has been requested.<br/>
                  Enter the 4-digit code shown on screen + Enter to accept the change, or press ESC to cancel."
                </div>
                <p className="text-zinc-300 text-xs">
                  {isEn ? (
                    <>
                      ⚠️ <strong>If you do not type this 4-digit code on screen followed by the <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">Enter</kbd> key</strong> (or if the screen is ignored), <strong>HP BIOS automatically cancels the modification and resets Secure Boot to DISABLED</strong>!
                    </>
                  ) : (
                    <>
                      ⚠️ <strong>Si vous ne tapez pas ce code à 4 chiffres à l'écran suivi de la touche <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">Entrée</kbd></strong> (ou si l'écran est ignoré), <strong>le BIOS HP annule automatiquement la modification et remet le Secure Boot à DÉSACTIVÉ</strong> !
                    </>
                  )}
                </p>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Laptop size={16} className="text-emerald-400" />
                  {isEn ? 'Complete procedure for HP ProBook / EliteBook:' : 'Procédure complète pour HP ProBook / EliteBook :'}
                </h4>
                {renderStepsList(hpSteps)}
              </div>
            </div>
          )}

          {/* DELL GUIDE */}
          {selectedBrand === 'dell' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Laptop size={16} className="text-emerald-400" />
                  {isEn ? 'Complete procedure for Dell Latitude / OptiPlex / Precision:' : 'Procédure complète pour Dell Latitude / OptiPlex / Precision :'}
                </h4>
                {renderStepsList(dellSteps)}
              </div>
            </div>
          )}

          {/* LENOVO GUIDE */}
          {selectedBrand === 'lenovo' && (
            <div className="space-y-4">
              {/* Alert Box Specific to Lenovo Key Management */}
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <Key size={18} className="shrink-0 text-amber-400" />
                  <span>
                    {isEn 
                      ? 'Frequent cause on Lenovo: Cleared keys ("Setup Mode") instead of "User Mode"' 
                      : 'Cause fréquente sur Lenovo : Clés effacées ("Setup Mode") au lieu de "User Mode"'}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs">
                  {isEn ? (
                    <>
                      On Lenovo BIOS, if you enabled Secure Boot but also clicked <strong className="text-rose-300">"Clear All Secure Boot Keys"</strong> or <strong className="text-rose-300">"Reset to Setup Mode"</strong>, motherboard security keys were erased.
                      In this state, <strong>Secure Boot remains DISABLED for security</strong> as long as factory keys are not restored.
                    </>
                  ) : (
                    <>
                      Sur les BIOS Lenovo, si vous avez activé le Secure Boot mais également cliqué sur <strong className="text-rose-300">"Clear All Secure Boot Keys"</strong> ou <strong className="text-rose-300">"Reset to Setup Mode"</strong>, les clés de sécurité de la carte mère ont été effacées.
                      Dans cet état, <strong>le Secure Boot reste DÉSACTIVÉ par sécurité</strong> tant que les clés d'usine ne sont pas restaurées.
                    </>
                  )}
                </p>
                <div className="bg-black/60 border border-emerald-800/60 rounded-lg p-3 text-xs space-y-1.5 text-zinc-200">
                  <div className="font-bold text-emerald-400">
                    {isEn ? '✅ How to activate Secure Boot in 30 seconds:' : '✅ Comment activer le Secure Boot en 30 secondes :'}
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                    <li>
                      {isEn 
                        ? <>Restart and enter BIOS (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F1</kbd> at Lenovo logo).</> 
                        : <>Redémarrez et entrez dans le BIOS (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F1</kbd> au logo Lenovo).</>}
                    </li>
                    <li>
                      {isEn 
                        ? <>Go to <strong className="text-white">Security</strong> &rarr; <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Key Management</strong>.</> 
                        : <>Allez dans <strong className="text-white">Security</strong> &rarr; <strong className="text-white">Secure Boot</strong> &rarr; <strong className="text-white">Key Management</strong>.</>}
                    </li>
                    <li>
                      {isEn 
                        ? <>Click on <strong className="text-emerald-300">Restore Factory Keys</strong> (or <em>Install Default Keys</em> / <em>Reset to Factory Default</em>) and confirm with <strong>Yes</strong>.</> 
                        : <>Cliquez sur <strong className="text-emerald-300">Restore Factory Keys</strong> (ou <em>Install Default Keys</em> / <em>Reset to Factory Default</em>) et confirmez par <strong>Yes</strong>.</>}
                    </li>
                    <li>
                      {isEn 
                        ? <>Verify that <em>Platform Mode</em> changes to <strong className="text-emerald-300">User Mode</strong> and <em>Secure Boot</em> to <strong className="text-emerald-300">Enabled</strong>.</> 
                        : <>Vérifiez que la ligne <em>Platform Mode</em> passe à <strong className="text-emerald-300">User Mode</strong> et <em>Secure Boot</em> à <strong className="text-emerald-300">Enabled</strong>.</>}
                    </li>
                    <li>
                      {isEn 
                        ? <>Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F10</kbd> to save and restart into Windows.</> 
                        : <>Appuyez sur <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700 font-mono text-xs">F10</kbd> pour sauvegarder et redémarrer sous Windows.</>}
                    </li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Laptop size={16} className="text-emerald-400" />
                  {isEn ? 'Complete procedure for Lenovo ThinkPad / ThinkCentre:' : 'Procédure complète pour Lenovo ThinkPad / ThinkCentre :'}
                </h4>
                {renderStepsList(lenovoSteps)}
              </div>
            </div>
          )}

          {/* TOSHIBA / DYNABOOK GUIDE */}
          {selectedBrand === 'toshiba' && (
            <div className="space-y-4">
              {/* Alert Box for Toshiba */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
                  <Laptop size={18} className="shrink-0" />
                  <span>
                    {isEn 
                      ? 'Toshiba / Dynabook specifics (Portégé, Tecra, Satellite Pro)' 
                      : 'Particularité Toshiba / Dynabook (Portégé, Tecra, Satellite Pro)'}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs">
                  {isEn ? (
                    <>
                      On Toshiba/Dynabook BIOS, activating Secure Boot strictly requires the <strong>Boot Mode</strong> parameter to be set to <strong>UEFI Boot</strong> (and not <em>CSM Boot</em>). Additionally, TPM may be named <strong>Intel PTT</strong> (Platform Trust Technology) or <strong>TPM Embedded</strong>.
                    </>
                  ) : (
                    <>
                      Sur les BIOS Toshiba/Dynabook, l'activation du Secure Boot requiert impérativement que le paramètre <strong>Boot Mode</strong> soit positionné sur <strong>UEFI Boot</strong> (et non <em>CSM Boot</em>). De plus, le TPM peut porter le nom <strong>Intel PTT</strong> (Platform Trust Technology) ou <strong>TPM Embedded</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Laptop size={16} className="text-emerald-400" />
                  {isEn ? 'Complete procedure for Toshiba / Dynabook:' : 'Procédure complète pour Toshiba / Dynabook :'}
                </h4>
                {renderStepsList(toshibaSteps)}
              </div>
            </div>
          )}

          {/* GENERAL / OTHER GUIDE */}
          {selectedBrand === 'other' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Cpu size={16} className="text-emerald-400" />
                  {isEn 
                    ? 'General Guide (Asus, Acer, MSI, other brands) & GPT Verification:' 
                    : 'Guide Général (Asus, Acer, MSI, autres marques) & Vérification GPT :'}
                </h4>
                <p className="text-zinc-300 text-xs">
                  {isEn ? (
                    <>
                      On the majority of modern computers, the BIOS access keys are <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F2</kbd>, <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">Del / Delete</kbd> or <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F12</kbd>.
                    </>
                  ) : (
                    <>
                      Sur la majorité des ordinateurs modernes, les touches d'accès BIOS sont <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F2</kbd>, <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">Suppr / Del</kbd> ou <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">F12</kbd>.
                    </>
                  )}
                </p>
                <div className="space-y-2">
                  <div className="bg-black/50 p-3 rounded-lg border border-zinc-800 text-xs">
                    <strong className="text-white block mb-1">
                      {isEn ? '1. Check current boot mode:' : '1. Vérifier le mode de démarrage actuel :'}
                    </strong>
                    {isEn ? (
                      <>
                        Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">Win + R</kbd> &rarr; type <code className="text-emerald-300 font-mono">msinfo32</code> &rarr; check the <strong>BIOS Mode</strong> line.
                      </>
                    ) : (
                      <>
                        Pressez <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-white font-mono border border-zinc-700 text-xs">Win + R</kbd> &rarr; tapez <code className="text-emerald-300 font-mono">msinfo32</code> &rarr; vérifiez la ligne <strong>Mode BIOS</strong>.
                      </>
                    )}
                    <ul className="mt-1 list-disc list-inside text-zinc-400">
                      <li>
                        {isEn ? (
                          <>If it indicates <strong className="text-emerald-300">UEFI</strong>: The machine is compatible, only the BIOS setting needs to be confirmed.</>
                        ) : (
                          <>Si c'est <strong className="text-emerald-300">UEFI</strong> : La machine est compatible, seule l'option BIOS reste à confirmer.</>
                        )}
                      </li>
                      <li>
                        {isEn ? (
                          <>If it indicates <strong className="text-rose-400">Legacy (MBR)</strong>: Windows must be converted to GPT using the official Microsoft utility.</>
                        ) : (
                          <>Si c'est <strong className="text-rose-400">Hérité (Legacy)</strong> : Windows doit être converti en GPT avec l'utilitaire Microsoft officiel.</>
                        )}
                      </li>
                    </ul>
                  </div>

                  <div className="bg-black/50 p-3 rounded-lg border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <strong className="text-white font-sans">
                        {isEn 
                          ? '2. Official Microsoft command for lossless MBR &rarr; GPT conversion:' 
                          : '2. Commande officielle Microsoft de conversion MBR &rarr; GPT sans perte de données :'}
                      </strong>
                      <button
                        id="copy-mbr2gpt-other-btn"
                        onClick={() => handleCopy('mbr2gpt.exe /convert /allowFullOS', 'mbr2gpt-other')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shrink-0"
                        title={isEn ? 'Copy command' : 'Copier la commande'}
                      >
                        {copiedId === 'mbr2gpt-other' ? (
                          <>
                            <Check size={13} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">{isEn ? 'Copied !' : 'Copié !'}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} className="text-zinc-300" />
                            <span>{isEn ? 'Copy' : 'Copier'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-950/80 px-3 py-2 rounded-lg border border-zinc-800/80 font-mono text-amber-300 select-all">
                      <code>mbr2gpt.exe /convert /allowFullOS</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-zinc-900/95 px-5 py-3.5 flex items-center justify-between border-t border-zinc-800 shrink-0">
          <div className="text-[11px] text-zinc-400">
            {isEn
              ? <>OPEQ Tip: Steps with amber <strong className="text-amber-300">Action required</strong> badge correspond to settings missing on this machine.</>
              : <>Astuce OPEQ : Les étapes avec badge ambré <strong className="text-amber-300">Action requise</strong> correspondent aux paramètres manquants sur cette machine.</>}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {isEn ? 'Close guide' : 'Fermer le guide'}
          </button>
        </div>

      </div>
    </div>
  );
}
