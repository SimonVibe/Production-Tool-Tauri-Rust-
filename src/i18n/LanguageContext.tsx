import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'en';

export interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

export const translations: Record<string, { fr: string; en: string }> = {
  // Common / Global
  'common.close': { fr: 'Fermer', en: 'Close' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.confirm': { fr: 'Confirmer', en: 'Confirm' },
  'common.save': { fr: 'Sauvegarder', en: 'Save' },
  'common.refresh': { fr: 'Actualiser', en: 'Refresh' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.error': { fr: 'Erreur', en: 'Error' },
  'common.success': { fr: 'Succès', en: 'Success' },
  'common.warning': { fr: 'Avertissement', en: 'Warning' },
  'common.copied': { fr: 'Copié !', en: 'Copied!' },
  'common.copy': { fr: 'Copier', en: 'Copy' },
  'common.all': { fr: 'Tous', en: 'All' },
  'common.search': { fr: 'Rechercher...', en: 'Search...' },
  'common.na': { fr: 'N/A', en: 'N/A' },
  'common.not_specified': { fr: 'Non renseigné', en: 'Not specified' },
  'common.yes': { fr: 'Oui', en: 'Yes' },
  'common.no': { fr: 'Non', en: 'No' },
  'common.active': { fr: 'Actif', en: 'Active' },
  'common.inactive': { fr: 'Inactif', en: 'Inactive' },
  'common.retry': { fr: 'Réessayer', en: 'Retry' },
  'common.clear': { fr: 'Effacer', en: 'Clear' },
  'common.expand': { fr: 'Déplier', en: 'Expand' },
  'common.collapse': { fr: 'Réduire', en: 'Collapse' },
  'common.optional': { fr: 'Optionnel', en: 'Optional' },

  // Header
  'header.brightness': { fr: 'Luminosité', en: 'Brightness' },
  'header.brightness_tooltip': { fr: 'Régler la luminosité (Glisser, Molette ou Présélections)', en: 'Adjust brightness (Drag, Scroll wheel or Quick presets)' },
  'header.zoom_out': { fr: 'Réduire l\'interface (A-)', en: 'Zoom out interface (A-)' },
  'header.zoom_in': { fr: 'Agrandir l\'interface (A+)', en: 'Zoom in interface (A+)' },
  'header.zoom_reset': { fr: 'Niveau de zoom. Cliquez pour Auto-Ajuster', en: 'Zoom level. Click to Auto-Fit' },
  'header.config': { fr: 'Configuration', en: 'Settings' },
  'header.config_tooltip': { fr: 'Configuration des chemins système et connexion réseau', en: 'System paths configuration & NAS network connection' },
  'header.help_tooltip': { fr: 'Manuel d\'utilisation, Guide & Raccourcis (? ou H)', en: 'User manual, Technical guide & Shortcuts (? or H)' },
  'header.lang_switch': { fr: 'Changer la langue (FR / EN)', en: 'Switch language (FR / EN)' },

  // Preflight Banner
  'preflight.admin_required': { fr: 'Privilèges Administrateur Requis', en: 'Administrator Privileges Required' },
  'preflight.limited_rights': { fr: 'Droits Limités', en: 'Limited Rights' },
  'preflight.admin_desc': { fr: 'L\'injection PnPUtil et l\'exportation DISM nécessitent des droits d\'administration élevés sous Windows pour installer les fichiers .INF.', en: 'PnPUtil injection and DISM export require elevated Windows administrator privileges to install .INF files.' },
  'preflight.relaunch_admin': { fr: 'Relancer en Admin', en: 'Relaunch as Admin' },
  'preflight.relaunch_tooltip': { fr: 'Relancer l\'application avec élévation UAC', en: 'Relaunch application with UAC elevation' },
  'preflight.on_battery': { fr: 'Alimentation sur Batterie Seule', en: 'Running on Battery Power' },
  'preflight.charger_unplugged': { fr: 'Chargeur Débranché', en: 'Charger Unplugged' },
  'preflight.battery_warning_desc': { fr: 'Il est fortement recommandé de brancher le câble secteur avant de lancer l\'installation massive de pilotes pour prévenir tout arrêt inopiné durant les négociations Plug & Play.', en: 'It is strongly recommended to connect the AC power adapter before starting mass driver installations to prevent abrupt shutdowns during Plug & Play negotiations.' },

  // Hardware Security Banner
  'security.hardware_security': { fr: 'Sécurité Matérielle', en: 'Hardware Security' },
  'security.win11': { fr: '(Windows 11)', en: '(Windows 11)' },
  'security.guide_diag': { fr: '(Guide & Diagnostic)', en: '(Guide & Diagnostic)' },
  'security.banner_tooltip': { fr: 'Cliquer pour afficher le diagnostic et le guide d\'activation TPM 2.0 / Secure Boot', en: 'Click to view diagnosis and TPM 2.0 / Secure Boot activation guide' },
  'security.tpm_label': { fr: 'TPM 2.0:', en: 'TPM 2.0:' },
  'security.secureboot_label': { fr: 'Secure Boot:', en: 'Secure Boot:' },
  'security.setup_mode': { fr: 'Clés effacées (Setup Mode)', en: 'Keys cleared (Setup Mode)' },
  'security.setup_mode_tooltip': { fr: 'Mode Installation détecté : Les clés ont été effacées dans le BIOS. Cliquez pour ouvrir le guide et voir comment restaurer les clés d\'usine.', en: 'Setup Mode detected: Keys were cleared in BIOS. Click to open guide and learn how to restore factory keys.' },
  'security.hdd_mode': { fr: 'HDD:', en: 'HDD:' },
  'security.win11_compliant': { fr: '✓ 100% Conforme Win 11', en: '✓ 100% Win 11 Compliant' },
  'security.checking': { fr: 'Vérification...', en: 'Checking...' },
  'security.config_required': { fr: 'Configuration requise', en: 'Setup required' },

  // Hardware Specs
  'specs.detected_specs': { fr: 'Spécifications Détectées', en: 'Detected Hardware Specs' },
  'specs.refresh_tooltip': { fr: 'Actualiser les spécifications (R)', en: 'Refresh hardware specifications (R)' },
  'specs.model': { fr: 'Modèle', en: 'Model' },
  'specs.serial_number': { fr: 'Numéro de série', en: 'Serial Number' },
  'specs.uuid': { fr: 'Identifiant UUID', en: 'UUID Identifier' },
  'specs.asset_tag': { fr: 'Asset Tag', en: 'Asset Tag' },
  'specs.ownership_tag': { fr: 'Ownership Tag', en: 'Ownership Tag' },
  'specs.cpu': { fr: 'Processeur (CPU)', en: 'Processor (CPU)' },
  'specs.memory': { fr: 'Mémoire vive (RAM)', en: 'Memory (RAM)' },
  'specs.storage_capacity': { fr: 'Capacité stockage', en: 'Storage Capacity' },
  'specs.disk_sn': { fr: 'S/N Disque(s)', en: 'Disk Serial Number(s)' },
  'specs.gpu': { fr: 'Carte graphique', en: 'Graphics Card (GPU)' },
  'specs.bios_version': { fr: 'Version du BIOS', en: 'BIOS Version' },
  'specs.all_hidden': { fr: 'Toutes les spécifications matérielles sont masquées.', en: 'All hardware specifications are hidden.' },
  'specs.reactivate_config': { fr: 'Vous pouvez les réactiver dans la Configuration.', en: 'You can re-enable them in Settings.' },
  'specs.smart_healthy': { fr: 'SMART Sain', en: 'SMART Healthy' },
  'specs.smart_healthy_tooltip': { fr: 'État S.M.A.R.T. Sain : 100% opérationnel, aucun défaut SMART signalé.', en: 'S.M.A.R.T. Healthy: 100% operational, no defects reported.' },
  'specs.smart_warning': { fr: 'SMART Attention', en: 'SMART Warning' },
  'specs.smart_warning_tooltip': { fr: 'État S.M.A.R.T. Attention : Prédicteur d\'usure ou secteurs réalloués détectés, surveillance requise.', en: 'S.M.A.R.T. Warning: Wear indicator or reallocated sectors detected, monitoring required.' },
  'specs.smart_critical': { fr: 'SMART Critique', en: 'SMART Critical' },
  'specs.smart_critical_tooltip': { fr: 'État S.M.A.R.T. Critique : Défaillance matérielle imminente ou secteurs défectueux irrécupérables !', en: 'S.M.A.R.T. Critical: Imminent hardware failure or unrecoverable bad sectors!' },
  'specs.smart_loading': { fr: 'SMART...', en: 'SMART...' },
  'specs.smart_loading_tooltip': { fr: 'Vérification de l\'état S.M.A.R.T. en cours...', en: 'Checking S.M.A.R.T. health status...' },
  'specs.copy_spec': { fr: 'Copier', en: 'Copy' },
  'specs.partition_checking': { fr: 'Vérification du mode de partition...', en: 'Checking partition mode...' },
  'specs.partition_uefi': { fr: 'Système installé en mode UEFI (Moderne)', en: 'System installed in UEFI mode (Modern)' },
  'specs.partition_legacy': { fr: 'Système installé en mode Hérité (Legacy/MBR)', en: 'System installed in Legacy mode (Legacy/MBR)' },
  'battery.moving_avg_tooltip': { fr: 'Moyenne mobile calculée sur les 5 dernières secondes ({count} mesures)', en: 'Moving average calculated over the last 5 seconds ({count} samples)' },

  // Toast Notifications & Shortcuts
  'toast.refreshing': { fr: 'Actualisation des spécifications...', en: 'Refreshing hardware specifications...' },
  'toast.refreshed_success': { fr: 'Spécifications actualisées avec succès', en: 'Hardware specifications refreshed successfully' },
  'toast.refresh_error': { fr: 'Erreur lors de l\'actualisation', en: 'Error refreshing specifications' },
  'toast.copied': { fr: 'copié dans le presse-papiers', en: 'copied to clipboard' },
  'toast.admin_error': { fr: 'Échec de la relance en administrateur', en: 'Failed to relaunch as administrator' },
  'shortcut.refresh': { fr: '🔄 Raccourci [F5/R] : Actualisation du Matériel & Télémétrie', en: '🔄 Shortcut [F5/R]: Refreshing Hardware & Telemetry' },
  'shortcut.screen': { fr: '🖥️ Raccourci [E] : Test Écran', en: '🖥️ Shortcut [E]: Screen Test' },
  'shortcut.camera_mic': { fr: '📷 Raccourci [C] : Test Caméra & Micro', en: '📷 Shortcut [C]: Camera & Mic Test' },
  'shortcut.keyboard': { fr: '⌨️ Raccourci [K] : Lancement AquaKeyTest', en: '⌨️ Shortcut [K]: Launching AquaKeyTest' },
  'shortcut.sound': { fr: '🔊 Raccourci [S] : Test Audio Windows', en: '🔊 Shortcut [S]: Windows Audio Test' },
  'shortcut.battery': { fr: '🔋 Raccourci [B] : Diagnostic Santé Batterie', en: '🔋 Shortcut [B]: Battery Health Diagnostic' },
  'shortcut.stress': { fr: '🔥 Raccourci [T] : BurnIn Stress Test', en: '🔥 Shortcut [T]: BurnIn Stress Test' },
  'shortcut.bios': { fr: '⚡ Raccourci [F] : Gestionnaire Firmware BIOS', en: '⚡ Shortcut [F]: BIOS Firmware Flasher' },
  'shortcut.drivers': { fr: '🔧 Raccourci [P] : Gestionnaire de Pilotes', en: '🔧 Shortcut [P]: Driver Manager' },
  'shortcut.logs_open': { fr: 'Fenêtre des logs ouverte', en: 'Event log drawer opened' },
  'shortcut.logs_close': { fr: 'Fenêtre des logs fermée', en: 'Event log drawer closed' },

  // BIOS and Drivers Buttons
  'actions.bios_update': { fr: 'Mise à jour BIOS', en: 'BIOS Update' },
  'actions.bios_choices': { fr: '2 choix', en: '2 options' },
  'actions.bios_subtext': { fr: 'Windows Update ou Fichier Manuel', en: 'Windows Update or Manual File' },
  'actions.bios_autoreboot_label': { fr: 'Redémarrer auto si MAJ', en: 'Auto-reboot if updated' },
  'actions.bios_autoreboot_tooltip': { fr: 'Redémarrer automatiquement la machine après l\'installation du firmware BIOS (uniquement si une mise à jour a été appliquée)', en: 'Automatically reboot the system after BIOS firmware install (only if an update was applied)' },
  'actions.update': { fr: 'Mettre à jour', en: 'Update' },
  'actions.drivers_manager': { fr: 'Gestionnaire Pilotes', en: 'Driver Manager' },
  'actions.manage': { fr: 'Gérer', en: 'Manage' },
  'actions.all_drivers_installed': { fr: 'Tous pilotes installés', en: 'All drivers installed' },
  'actions.missing_drivers': { fr: 'pilote(s) manquant(s)', en: 'missing driver(s)' },

  // Tests & Diagnostics
  'tests.title': { fr: 'Tests Matériels & Diagnostics', en: 'Hardware Tests & Diagnostics' },
  'tests.quick_trigger': { fr: '1-Clic / Touche', en: '1-Click / Key' },
  'tests.screen_touch': { fr: 'Test Écran & Tactile', en: 'Screen & Touch Test' },
  'tests.screen_touch_sub': { fr: 'Matrice de couleurs + Gestes tactiles', en: 'Color matrix + Touch gestures' },
  'tests.audio': { fr: 'Test Son & Audio', en: 'Sound & Audio Test' },
  'tests.audio_sub': { fr: 'Gestionnaire de périphériques audio Windows', en: 'Windows audio device control panel' },
  'tests.keyboard': { fr: 'Test Clavier', en: 'Keyboard Test' },
  'tests.keyboard_sub': { fr: 'Utilitaire AquaKeyTest interactif', en: 'Interactive AquaKeyTest utility' },
  'tests.camera_mic': { fr: 'Test Caméra & Micro', en: 'Camera & Mic Test' },
  'tests.camera_mic_sub': { fr: 'Flux vidéo HD + Analyseur niveau sonore', en: 'HD video stream + Sound level analyzer' },
  'tests.burnin': { fr: 'BurnIn Stress Test', en: 'BurnIn Stress Test' },
  'tests.burnin_sub': { fr: 'Test de charge CPU / RAM & Stabilité', en: 'CPU / RAM stress test & stability' },
  'tests.external_app': { fr: 'Application Externe', en: 'External Application' },
  'tests.all_hidden': { fr: 'Tous les raccourcis de tests matériels sont masqués.', en: 'All hardware test shortcuts are hidden.' },

  // Battery & Quick Hardware Controls
  'battery.desktop_pc': { fr: 'PC Fixe', en: 'Desktop PC' },
  'battery.ac_power': { fr: 'Secteur', en: 'AC Power' },
  'battery.avg_5s': { fr: '5s moy.', en: '5s avg.' },
  'battery.health': { fr: 'Santé :', en: 'Health:' },
  'battery.remaining': { fr: '(restante)', en: '(remaining)' },
  'battery.diagnostic_shortcut': { fr: 'Diagnostic (B)', en: 'Diagnostic (B)' },
  'battery.button_tooltip': { fr: 'Cliquez pour ouvrir le Diagnostic Santé Batterie (B)', en: 'Click to open Battery Health Diagnostics (B)' },
  'hardware.bluetooth': { fr: 'Bluetooth', en: 'Bluetooth' },
  'hardware.bluetooth_tooltip': { fr: 'Paramètres Bluetooth Windows', en: 'Windows Bluetooth settings' },
  'hardware.wifi': { fr: 'WiFi', en: 'WiFi' },
  'hardware.wifi_tooltip': { fr: 'Réseaux WiFi disponibles', en: 'Available WiFi networks' },

  // Power Dock
  'power.shutdown': { fr: 'Éteindre', en: 'Shut Down' },
  'power.reboot': { fr: 'Redémarrer', en: 'Restart' },
  'power.reboot_bios': { fr: 'Redémarrer BIOS', en: 'Reboot into BIOS' },
  'power.confirm_action': { fr: 'Confirmer l\'Action Système', en: 'Confirm System Action' },
  'power.confirm_prompt': { fr: 'Êtes-vous sûr de vouloir exécuter :', en: 'Are you sure you want to execute:' },

  // Logs Console
  'logs.title': { fr: 'Journal des Événements', en: 'Event Log' },
  'logs.compact_title': { fr: 'Journal', en: 'Logs' },
  'logs.errors_and_warnings': { fr: 'Erreurs & Avertissements', en: 'Errors & Warnings' },
  'logs.errors': { fr: 'Erreurs', en: 'Errors' },
  'logs.info_actions': { fr: 'Info & Actions', en: 'Info & Actions' },
  'logs.info': { fr: 'Info', en: 'Info' },
  'logs.copy_all': { fr: 'Copier tout', en: 'Copy all' },
  'logs.copied': { fr: 'Copié !', en: 'Copied!' },
  'logs.fullscreen': { fr: 'Plein écran', en: 'Fullscreen' },
  'logs.modal_title': { fr: 'Fenêtre du Journal des Logs', en: 'Log Journal Window' },
  'logs.modal_subtitle': { fr: 'Historique en temps réel des diagnostics, exécutions et communications système', en: 'Real-time history of diagnostics, executions and system communication' },
  'logs.waiting': { fr: 'Système prêt. En attente d\'événements...', en: 'System ready. Waiting for events...' },
  'logs.empty_filter': { fr: 'Aucun log ne correspond aux critères de filtre ou de recherche.', en: 'No logs match current filter or search criteria.' },
  'logs.no_events': { fr: 'Aucun événement enregistré pour le moment.', en: 'No events recorded yet.' },
  'logs.showing': { fr: 'Affichage de {filtered} sur {total} entrée(s)', en: 'Showing {filtered} of {total} entry/entries' },

  // Battery Health Modal
  'battery_modal.title': { fr: 'Diagnostic & Santé de la Batterie', en: 'Battery Diagnostics & Health' },
  'battery_modal.subtitle': { fr: 'Télémétrie en temps réel • Autonomie & État de charge mis à jour toutes les 5 secondes (Moyenne 5s)', en: 'Real-time telemetry • Battery runtime & charge updated every 5s (5s moving average)' },
  'battery_modal.health_excellent': { fr: 'Excellente', en: 'Excellent' },
  'battery_modal.health_good': { fr: 'Bonne', en: 'Good' },
  'battery_modal.health_medium': { fr: 'Moyenne (Usure modérée)', en: 'Fair (Moderate wear)' },
  'battery_modal.health_poor': { fr: 'Dégradée (À remplacer)', en: 'Degraded (Replacement recommended)' },
  'battery_modal.health_unmeasured': { fr: 'Non mesuré', en: 'Unmeasured' },
  'battery_modal.charge_level': { fr: 'Niveau de charge', en: 'Charge Level' },
  'battery_modal.estimated_runtime': { fr: 'Autonomie estimée', en: 'Estimated Runtime' },
  'battery_modal.estimated_chargetime': { fr: 'Temps jusqu\'à pleine charge', en: 'Time to Full Charge' },
  'battery_modal.power_rate': { fr: 'Taux de décharge / charge', en: 'Discharge / Charge Rate' },
  'battery_modal.design_capacity': { fr: 'Capacité d\'usine (Design)', en: 'Design Capacity' },
  'battery_modal.full_capacity': { fr: 'Capacité pleine charge', en: 'Full Charge Capacity' },
  'battery_modal.cycle_count': { fr: 'Nombre de cycles', en: 'Cycle Count' },
  'battery_modal.voltage': { fr: 'Tension actuelle', en: 'Current Voltage' },
  'battery_modal.chemistry': { fr: 'Chimie', en: 'Chemistry' },
  'battery_modal.manufacturer': { fr: 'Fabricant', en: 'Manufacturer' },
  'battery_modal.battery_sn': { fr: 'N° de série batterie', en: 'Battery Serial Number' },

  // Screen Test Modal
  'screen_test.instructions': { fr: 'Test d\'écran : Cliquez pour changer de couleur. Échap pour quitter.', en: 'Screen test: Click to cycle colors. Esc to exit.' },
  'screen_test.touch_enabled': { fr: 'Écran tactile détecté : Faites glisser et pincez le carré pour tester le tactile multi-points.', en: 'Touch screen detected: Drag and pinch the square to test multi-touch.' },

  // Camera & Mic Modal
  'cam_mic.title': { fr: 'Test Caméra & Microphone', en: 'Camera & Microphone Test' },
  'cam_mic.camera_tab': { fr: 'Caméra', en: 'Camera' },
  'cam_mic.mic_tab': { fr: 'Microphone & Haut-Parleur', en: 'Microphone & Speaker' },
  'cam_mic.select_camera': { fr: 'Sélectionner la caméra :', en: 'Select Camera:' },
  'cam_mic.select_mic': { fr: 'Sélectionner le micro :', en: 'Select Microphone:' },
  'cam_mic.mirror': { fr: 'Miroir', en: 'Mirror' },
  'cam_mic.grid': { fr: 'Grille d\'alignement', en: 'Alignment Grid' },
  'cam_mic.snapshot': { fr: 'Prendre une photo', en: 'Take Snapshot' },
  'cam_mic.test_tone': { fr: 'Son de test haut-parleurs (440Hz)', en: 'Speaker Test Tone (440Hz)' },
  'cam_mic.stop_tone': { fr: 'Arrêter le son', en: 'Stop Tone' },
  'cam_mic.loopback_record': { fr: 'Enregistrer 3s et réécouter', en: 'Record 3s & Playback' },
  'cam_mic.loopback_recording': { fr: 'Enregistrement en cours...', en: 'Recording in progress...' },
  'cam_mic.loopback_playing': { fr: 'Lecture en cours...', en: 'Playing back...' },
  'cam_mic.no_camera': { fr: 'Aucune caméra détectée ou permission refusée.', en: 'No camera detected or permission denied.' },
  'cam_mic.no_mic': { fr: 'Aucun microphone détecté ou permission refusée.', en: 'No microphone detected or permission denied.' },

  // Drivers Modal & Hub
  'drivers_hub.title': { fr: 'Centre d\'Installation des Pilotes', en: 'Driver Installation Center' },
  'drivers_hub.dev_manager': { fr: 'Gestionnaire de périphériques :', en: 'Device Manager:' },
  'drivers_hub.choose_method': { fr: 'Choisissez la méthode d\'installation détaillée en premier plan :', en: 'Choose the detailed foreground installation method:' },
  'drivers_hub.opt1_title': { fr: '1. Pilotes Réseau & Dossier NAS (PnPUtil / DISM)', en: '1. Network & NAS Driver Repository (PnPUtil / DISM)' },
  'drivers_hub.opt1_desc': { fr: 'Interface détaillée : détection automatique du modèle, scan du dossier NAS, injection PnPUtil et export DISM.', en: 'Detailed interface: automatic model detection, NAS directory scan, PnPUtil injection and DISM export.' },
  'drivers_hub.opt2_title': { fr: '2. Pilotes via Windows Update (Microsoft)', en: '2. Drivers via Windows Update (Microsoft)' },
  'drivers_hub.opt2_desc': { fr: 'Interface détaillée : liste interactive des pilotes Microsoft, barres de progression et terminal d\'exécution.', en: 'Detailed interface: interactive list of Microsoft drivers, progress bars and execution terminal.' },
  'drivers_hub.opt3_title': { fr: '3. Snappy Driver Installer Origin (SDIO)', en: '3. Snappy Driver Installer Origin (SDIO)' },
  'drivers_hub.opt4_title': { fr: '4. Gestionnaire de périphériques Windows direct', en: '4. Direct Windows Device Manager' },
  'drivers_hub.opt4_desc': { fr: 'Ouvrir devmgmt.msc pour diagnostic direct des points d\'exclamation jaunes.', en: 'Open devmgmt.msc for direct inspection of yellow exclamation marks.' },
  'drivers_hub.detailed_badge': { fr: 'Interface Premier Plan Détaillée', en: 'Detailed Foreground Interface' },

  // Windows Update Modal
  'wu.title': { fr: 'Installation des Pilotes Windows Update', en: 'Windows Update Driver Installation' },
  'wu.scanning': { fr: 'Recherche des pilotes sur les serveurs Microsoft...', en: 'Scanning for drivers on Microsoft servers...' },
  'wu.rescan': { fr: 'Relancer la recherche', en: 'Rescan Windows Update' },
  'wu.install_selected': { fr: 'Installer la sélection', en: 'Install Selected' },
  'wu.installing': { fr: 'Installation en cours...', en: 'Installing drivers...' },
  'wu.installed_status': { fr: 'Tous les pilotes sont à jour.', en: 'All drivers are up to date.' },
  'wu.tab_all': { fr: 'Tous les pilotes', en: 'All Drivers' },
  'wu.tab_pending': { fr: 'Mises à jour en attente', en: 'Pending Updates' },
  'wu.tab_installed': { fr: 'Déjà installés', en: 'Already Installed' },
  'wu.autoreboot': { fr: 'Redémarrer automatiquement une fois l\'installation terminée', en: 'Automatically restart machine once installation completes' },
  'wu.reboot_now': { fr: 'Redémarrer maintenant', en: 'Restart Now' },

  // NAS Drivers Modal
  'nas.title': { fr: 'Gestionnaire des Pilotes Réseau & NAS (PnPUtil / DISM)', en: 'Network & NAS Driver Manager (PnPUtil / DISM)' },
  'nas.tab_install': { fr: '1. Installer depuis le NAS (PnPUtil)', en: '1. Install from NAS (PnPUtil)' },
  'nas.tab_export': { fr: '2. Exporter vers le NAS (DISM)', en: '2. Export to NAS (DISM)' },
  'nas.tab_tools': { fr: '3. Outils & Index NAS', en: '3. Tools & NAS Index' },
  'nas.detected_model': { fr: 'Modèle détecté :', en: 'Detected Model:' },
  'nas.nas_path': { fr: 'Dossier NAS / Partage :', en: 'NAS Repository / Share:' },
  'nas.direct_match': { fr: 'Correspondance exacte trouvée !', en: 'Exact match found!' },
  'nas.no_model_selected': { fr: 'Sélectionnez un dossier modèle dans le catalogue ci-dessous.', en: 'Select a model folder from the catalog below.' },
  'nas.install_all': { fr: 'Installer tous les pilotes de ce modèle', en: 'Install all drivers for this model' },
  'nas.install_selected': { fr: 'Installer les pilotes sélectionnés', en: 'Install selected drivers' },
  'nas.back_to_catalog': { fr: 'Retour au catalogue des modèles', en: 'Back to model catalog' },
  'nas.filter_brand': { fr: 'Toutes les marques', en: 'All Brands' },
  'nas.search_placeholder': { fr: 'Rechercher un modèle ou une marque...', en: 'Search for a model or brand...' },
  'nas.export_title': { fr: 'Exporter les pilotes OEM locaux vers le NAS', en: 'Export local OEM drivers to NAS' },
  'nas.export_btn': { fr: 'Lancer l\'exportation DISM', en: 'Start DISM Export' },
  'nas.conflict_title': { fr: 'Dossier de destination déjà existant', en: 'Destination folder already exists' },
  'nas.conflict_overwrite': { fr: 'Écraser / Remplacer', en: 'Overwrite / Replace' },
  'nas.conflict_rename': { fr: 'Créer une copie horodatée', en: 'Create timestamped copy' },

  // BIOS Update Modal
  'bios.title': { fr: 'Mise à Jour du BIOS & Firmware', en: 'BIOS & Firmware Update' },
  'bios.mode_choice': { fr: 'Sélectionner la méthode de mise à jour BIOS', en: 'Select BIOS Update Method' },
  'bios.mode_wu_title': { fr: '1. Firmware via Windows Update (Recommandé)', en: '1. Firmware via Windows Update (Recommended)' },
  'bios.mode_wu_desc': { fr: 'Recherche les capsules de firmware BIOS certifiées par le constructeur et signées par Microsoft.', en: 'Searches for OEM-certified BIOS firmware capsules signed by Microsoft.' },
  'bios.mode_manual_title': { fr: '2. Fichier BIOS Manuel (HP / Dell / Lenovo / Exe / Bin)', en: '2. Manual BIOS File (HP / Dell / Lenovo / Exe / Bin)' },
  'bios.mode_manual_desc': { fr: 'Sélectionnez directement un exécutable de mise à jour flash ou un package d\'extraction téléchargé.', en: 'Select a flash update executable or downloaded OEM package directly.' },
  'bios.ac_power_warning': { fr: 'ALERTE SÉCURITÉ : Assurez-vous que l\'ordinateur est branché sur le secteur et que la batterie est à plus de 25%. Ne pas éteindre pendant le flash !', en: 'SAFETY WARNING: Ensure the machine is plugged into AC power and the battery is above 25%. Do not shut down during flash!' },
  'bios.browse_file': { fr: 'Parcourir...', en: 'Browse...' },
  'bios.start_flash': { fr: 'Lancer la mise à jour BIOS', en: 'Start BIOS Update' },
  'bios.cancel_reboot': { fr: 'Annuler le redémarrage', en: 'Cancel Auto-Reboot' },

  // Security Guide Modal
  'sec_guide.title': { fr: 'Guide d\'Activation Sécurité Matérielle (TPM 2.0 & Secure Boot)', en: 'Hardware Security Activation Guide (TPM 2.0 & Secure Boot)' },
  'sec_guide.subtitle': { fr: 'Instructions détaillées de configuration BIOS par constructeur pour la certification Windows 11', en: 'Step-by-step BIOS configuration instructions by manufacturer for Windows 11 compliance' },
  'sec_guide.brand_hp': { fr: 'HP / ProBook / EliteBook', en: 'HP / ProBook / EliteBook' },
  'sec_guide.brand_dell': { fr: 'Dell / Latitude / OptiPlex', en: 'Dell / Latitude / OptiPlex' },
  'sec_guide.brand_lenovo': { fr: 'Lenovo / ThinkPad / ThinkCentre', en: 'Lenovo / ThinkPad / ThinkCentre' },
  'sec_guide.brand_toshiba': { fr: 'Dynabook / Toshiba', en: 'Dynabook / Toshiba' },
  'sec_guide.brand_other': { fr: 'Autres Constructeurs (Générique)', en: 'Other Manufacturers (Generic)' },
  'sec_guide.step': { fr: 'Étape', en: 'Step' },
  'sec_guide.compliant': { fr: 'Déjà Conforme', en: 'Already Compliant' },
  'sec_guide.action_needed': { fr: 'Action Requise', en: 'Action Required' },

  // Help Modal
  'help.title': { fr: 'Guide & Procédure d\'Utilisation', en: 'User Guide & Procedures' },
  'help.subtitle': { fr: 'Reconditionnement, installation des pilotes, mises à jour et tests matériels', en: 'Refurbishment, driver installations, updates and hardware diagnostics' },
  'help.tab_workflow': { fr: '1. Procédure Globale', en: '1. Global Workflow' },
  'help.tab_drivers': { fr: '2. Pilotes & NAS', en: '2. Drivers & NAS' },
  'help.tab_bios': { fr: '3. BIOS / Firmware', en: '3. BIOS / Firmware' },
  'help.tab_tests': { fr: '4. Diagnostics Matériel', en: '4. Hardware Diagnostics' },
  'help.tab_network': { fr: '5. Réseau & Partages', en: '5. Network & Shares' },
  'help.tab_shortcuts': { fr: '6. Raccourcis Clavier', en: '6. Keyboard Shortcuts' },

  // Config Page
  'config.title': { fr: 'Configuration de l\'Application', en: 'Application Settings' },
  'config.paths_title': { fr: 'Chemins des Outils & Utilitaires Système', en: 'Tools & System Utility Paths' },
  'config.nas_path': { fr: 'Dossier Partagé des Pilotes (NAS)', en: 'Driver Shared Repository (NAS)' },
  'config.screen_path': { fr: 'Exécutable Test d\'Écran', en: 'Screen Test Executable' },
  'config.sound_path': { fr: 'Gestionnaire Audio (CPL / Exe)', en: 'Audio Control Panel (CPL / Exe)' },
  'config.keyboard_path': { fr: 'Exécutable Test Clavier', en: 'Keyboard Test Executable' },
  'config.burnin_path': { fr: 'Exécutable BurnInTest', en: 'BurnInTest Executable' },
  'config.camera_path': { fr: 'Exécutable Test Caméra', en: 'Camera Test Executable' },
  'config.sdio_path': { fr: 'Exécutable Snappy Driver Installer (SDIO)', en: 'Snappy Driver Installer (SDIO) Executable' },
  'config.auto_reboot': { fr: 'Redémarrage Automatique', en: 'Automatic Reboot' },
  'config.auto_reboot_desc': { fr: 'Redémarrer automatiquement après l\'installation des pilotes ou la mise à jour BIOS si requis.', en: 'Automatically reboot after driver installations or BIOS updates if required.' },
  'config.default_language_title': { fr: 'Langue de Démarrage par Défaut', en: 'Default Starting Language' },
  'config.default_language_desc': { fr: "Définissez la langue active par défaut lors du démarrage de l'application.", en: 'Set the active language loaded upon application startup.' },
  'config.hidden_tests': { fr: 'Visibilité des Boutons de Tests', en: 'Test Buttons Visibility' },
  'config.hidden_specs': { fr: 'Visibilité des Lignes de Spécifications', en: 'Specifications Rows Visibility' },
  'config.external_apps': { fr: 'Applications Externes Additionnelles', en: 'Additional External Applications' },
  'config.add_external': { fr: 'Ajouter une application', en: 'Add Application' },
  'config.change_password': { fr: 'Modifier le Mot de Passe Administrateur', en: 'Change Administrator Password' },
  'config.reset_defaults': { fr: 'Rétablir la configuration par défaut', en: 'Restore Default Configuration' },
  'config.save_changes': { fr: 'Enregistrer les Modifications', en: 'Save Changes' },
  'config.back_to_dashboard': { fr: 'Retour au Tableau de Bord', en: 'Back to Dashboard' },

  // Network Login Modal
  'net_login.title': { fr: 'Connexion Réseau', en: 'Network Connection' },
  'net_login.path_label': { fr: 'Chemin Partage ou Lecteur', en: 'Share Path or Drive Letter' },
  'net_login.user_label': { fr: 'Nom d\'utilisateur', en: 'Username' },
  'net_login.pass_label': { fr: 'Mot de passe', en: 'Password' },
  'net_login.remember': { fr: 'Mémoriser les identifiants (config.json)', en: 'Remember credentials (config.json)' },
  'net_login.connect_btn': { fr: 'Se Connecter', en: 'Connect' },
  'net_login.connecting': { fr: 'Connexion...', en: 'Connecting...' },
  'net_login.shortcuts': { fr: 'Raccourcis :', en: 'Presets:' },

  // Config Auth Modal
  'config_auth.title': { fr: 'Accès Sécurisé', en: 'Secure Access' },
  'config_auth.prompt': { fr: 'Veuillez entrer le mot de passe pour accéder à la configuration.', en: 'Please enter the password to access application settings.' },
  'config_auth.unlock': { fr: 'Déverrouiller', en: 'Unlock' },
  'config_auth.wrong_pass': { fr: 'Mot de passe incorrect', en: 'Incorrect password' },

  // Cam & Mic extra
  'cam_mic.hd_title': { fr: 'Test Caméra & Microphone HD', en: 'HD Camera & Microphone Test' },
  'cam_mic.balanced': { fr: 'Équilibré', en: 'Balanced' },
  'cam_mic.mic_focus': { fr: 'Micro Focus', en: 'Mic Focus' },
  'cam_mic.large': { fr: 'Grand', en: 'Large' },
  'cam_mic.video_size': { fr: 'Taille vidéo :', en: 'Video size:' },
  'cam_mic.refresh_tooltip': { fr: 'Actualiser les périphériques', en: 'Refresh devices' },
  'cam_mic.close_tooltip': { fr: 'Fermer', en: 'Close' },
  'cam_mic.camera_label': { fr: 'Caméra :', en: 'Camera:' },
  'cam_mic.mic_label': { fr: 'Micro :', en: 'Microphone:' },
  'cam_mic.no_camera_found': { fr: 'Aucune caméra détectée', en: 'No camera detected' },
  'cam_mic.no_mic_found': { fr: 'Aucun microphone détecté', en: 'No microphone detected' },
  'cam_mic.vumeter': { fr: 'VU-Mètre Microphone Direct', en: 'Live Microphone VU-Meter' },
  'cam_mic.sound_tests': { fr: 'Tests Sonores & Audio', en: 'Sound & Audio Tests' },
  'cam_mic.mic_speakers': { fr: 'Micro & Haut-parleurs', en: 'Mic & Speakers' },
  'cam_mic.test_mic_echo': { fr: 'Tester Micro (Écho 3s)', en: 'Test Mic (3s Echo)' },
  'cam_mic.record_3s': { fr: 'Enregistrement 3s...', en: 'Recording 3s...' },
  'cam_mic.playback_audio': { fr: 'Relecture audio...', en: 'Playing audio back...' },
  'cam_mic.speak_3s': { fr: 'Parlez 3s → Relecture auto', en: 'Speak 3s → Auto playback' },
  'cam_mic.listen_speakers': { fr: 'Écoutez vos haut-parleurs...', en: 'Listen to your speakers...' },
  'cam_mic.speaker_tone_btn': { fr: 'Bip Haut-Parleurs', en: 'Speaker Beep' },
  'cam_mic.speaker_tone_active': { fr: 'Bip en cours...', en: 'Beep playing...' },
  'cam_mic.speaker_tone_desc': { fr: 'Tester sortie son stéréo', en: 'Test stereo audio output' },
  'cam_mic.signal_active': { fr: 'Signal 440Hz actif', en: '440Hz tone active' },
  'cam_mic.sample_captured': { fr: 'Échantillon audio capté', en: 'Audio sample captured' },
  'cam_mic.playback_btn': { fr: 'Réécouter', en: 'Play back' },
  'cam_mic.photo_captured': { fr: 'Capture photo validée', en: 'Snapshot verified' },
  'cam_mic.sensor_ok': { fr: 'Capteur optique opérationnel', en: 'Optical sensor operational' },
  'cam_mic.close_test': { fr: 'Fermer le test', en: 'Close Test' },
  'cam_mic.multimedia_active': { fr: 'Diagnostic matériel multimédia actif', en: 'Multimedia hardware diagnostics active' },
  'cam_mic.check_shutter': { fr: "Vérifiez si l'obturateur physique est ouvert ou si Windows autorise l'accès.", en: 'Check if the physical shutter is open or if Windows allows access.' },

  // Debug Log extra
  'logs.search_placeholder': { fr: 'Rechercher dans les logs...', en: 'Search logs...' },
  'logs.drawer_toggle': { fr: 'Déplier / Réduire le volet inférieur (L)', en: 'Expand / Collapse bottom drawer (L)' },
  'logs.drawer_expand': { fr: 'Déplier', en: 'Expand' },
  'logs.drawer_collapse': { fr: 'Réduire', en: 'Collapse' },
  'logs.open_fullscreen': { fr: 'Ouvrir la fenêtre des logs en plein écran (L)', en: 'Open full-screen log window (L)' },
  'logs.copy_tooltip': { fr: 'Copier les logs dans le presse-papier', en: 'Copy logs to clipboard' },
  'logs.filter_level': { fr: 'Filtre:', en: 'Filter:' },

  // Config Page extra
  'config.execution_paths': { fr: "Configuration des Chemins d'Exécution", en: 'Execution Paths Configuration' },
  'config.all_valid': { fr: '✓ Tous les chemins sont valides', en: '✓ All paths are valid' },
  'config.invalid_count': { fr: '{count} format(s) invalide(s)', en: '{count} invalid format(s)' },
  'config.realtime_validation': { fr: 'Validation en temps réel des exécutables locaux, scripts et adresses de partages réseau', en: 'Real-time validation of local executables, scripts, and network share addresses' },
  'config.format_guide': { fr: 'Guide des formats', en: 'Format Guide' },
  'config.default_btn': { fr: 'Par défaut', en: 'Defaults' },
  'config.default_tooltip': { fr: 'Réinitialiser tous les champs avec les chemins par défaut', en: 'Reset all fields with default paths' },
  'config.recording_blocked': { fr: 'Attention : Enregistrement bloqué', en: 'Warning: Save Blocked' },
  'config.single_invalid': { fr: "1 champ comporte un format invalide. Veuillez corriger l'erreur indiquée en rouge ci-dessous avant d'enregistrer.", en: '1 field has an invalid format. Please fix the error indicated in red below before saving.' },
  'config.multiple_invalid': { fr: '{count} champs comportent des erreurs de format. Corrigez-les pour continuer.', en: '{count} fields have format errors. Correct them to continue.' },
  'config.sound_test_path': { fr: "Chemin 'Test de son'", en: "'Sound test' path" },
  'config.keyboard_test_path': { fr: "Chemin 'Test Clavier'", en: "'Keyboard test' path" },
  'config.burnin_test_path': { fr: "Chemin 'BurnIn stress test'", en: "'BurnIn stress test' path" },
  'config.nas_source_folder': { fr: 'Dossier Source Pilotes Réseau (NAS/USB)', en: 'Network Drivers Source Folder (NAS/USB)' },
  'config.net_conn_title': { fr: 'Connexion au Réseau NAS', en: 'NAS Network Connection' },
  'config.connected': { fr: 'Connecté', en: 'Connected' },
  'config.not_connected': { fr: 'Non connecté', en: 'Not connected' },
  'config.net_conn_desc': { fr: "Authentification et montage du lecteur réseau partagé de l'atelier", en: 'Authentication and mounting of the workshop shared network drive' },
  'config.manage_reauth': { fr: 'Gérer / Réauthentifier', en: 'Manage / Re-authenticate' },
  'config.connect_net_btn': { fr: 'Connexion Réseau NAS', en: 'Connect NAS Network' },
  'config.auto_reboot_check': { fr: "Redémarrer automatiquement après l'installation des pilotes (AutoReboot)", en: 'Automatically reboot after driver installation (AutoReboot)' },
  'config.external_tools_title': { fr: 'Applications Externes & Outils Personnalisés', en: 'External Applications & Custom Tools' },
  'config.external_tools_desc': { fr: "Ajoutez des raccourcis vers vos outils d'atelier (ex: CPU-Z, HWiNFO, FurMark, scripts batch) pour les lancer depuis le tableau de bord.", en: 'Add shortcuts to your workshop tools (e.g. CPU-Z, HWiNFO, FurMark, batch scripts) to launch them from the dashboard.' },
  'config.add_app_btn': { fr: 'Ajouter une application', en: 'Add Application' },
  'config.test_app': { fr: 'Tester', en: 'Test' },
  'config.app_name_ph': { fr: "Nom de l'application (ex: CPU-Z)", en: 'Application name (e.g. CPU-Z)' },
  'config.app_path_ph': { fr: "Chemin d'accès (ex: C:\\Tools\\cpuz.exe ou \\\\serveur\\tools\\app.exe)", en: 'Access path (e.g. C:\\Tools\\cpuz.exe or \\\\server\\tools\\app.exe)' },
  'config.new_pass_ph': { fr: 'Nouveau mot de passe (optionnel)', en: 'New password (optional)' },
  'config.confirm_pass_ph': { fr: 'Confirmer le mot de passe', en: 'Confirm password' },
  'config.pass_mismatch': { fr: 'Les mots de passe ne correspondent pas.', en: 'Passwords do not match.' },
  'config.save_btn': { fr: 'Enregistrer la configuration', en: 'Save Configuration' },
  'config.cancel_btn': { fr: 'Annuler', en: 'Cancel' },
  'config.back_tooltip': { fr: 'Retour au Tableau de bord', en: 'Back to Dashboard' },

  // Windows Update extra
  'wu.select_updates': { fr: 'Sélectionner MàJ', en: 'Select Updates' },
  'wu.select_all': { fr: 'Tout sélectionner', en: 'Select All' },
  'wu.deselect_all': { fr: 'Tout désélectionner', en: 'Deselect All' },
  'wu.auto_reboot': { fr: 'Auto-reboot', en: 'Auto-reboot' },
  'wu.all_up_to_date_notice': { fr: 'Tous les pilotes Windows Update sont à jour. Cochez les pilotes ci-dessous pour forcer une réinstallation (réparation de périphérique).', en: 'All Windows Update drivers are up to date. Check drivers below to force a reinstallation (device repair).' },
  'wu.check_all_reinstall': { fr: 'Tout cocher pour réinstaller', en: 'Check all to reinstall' },
  'wu.searching_servers': { fr: 'Interrogation des serveurs Microsoft Update en cours...', en: 'Querying Microsoft Update servers in progress...' },
  'wu.no_drivers_in_tab': { fr: 'Aucun pilote dans cet onglet', en: 'No drivers in this tab' },
  'wu.no_drivers_tab_desc': { fr: 'Tous les pilotes distribués par Microsoft Update pour cette machine sont installés.', en: 'All drivers distributed by Microsoft Update for this machine are installed.' },
  'wu.to_reinstall': { fr: 'À réinstaller', en: 'To reinstall' },
  'wu.to_install': { fr: 'À installer', en: 'To install' },
  'wu.not_selected': { fr: 'Non sélectionné', en: 'Not selected' },
  'wu.downloading': { fr: 'Téléchargement...', en: 'Downloading...' },
  'wu.ready_to_install': { fr: 'Prêt à installer', en: 'Ready to install' },
  'wu.installing_status': { fr: 'Installation...', en: 'Installing...' },
  'wu.installed_badge': { fr: 'Installé', en: 'Installed' },
  'wu.failed_badge': { fr: 'Échec', en: 'Failed' },
  'wu.exec_journal': { fr: "Journal d'exécution", en: 'Execution Log' },
  'wu.waiting_op': { fr: "En attente d'une opération...", en: 'Waiting for operation...' },
  'wu.reboot_required_desc': { fr: 'Redémarrage requis pour appliquer les pilotes', en: 'Reboot required to apply drivers' },
  'wu.reboot_pc_btn': { fr: 'Redémarrer le poste', en: 'Restart PC' },
  'wu.install_reinstall_count': { fr: 'Installer / Réinstaller ({count})', en: 'Install / Reinstall ({count})' },
  'wu.install_in_progress': { fr: 'Installation en cours ({pct}%)...', en: 'Installation in progress ({pct}%)...' },
  'wu.install_success': { fr: 'Installation réussie', en: 'Installation successful' },
  'wu.install_finished_errors': { fr: 'Terminé (Erreurs)', en: 'Finished (Errors)' },

  // NAS Drivers extra
  'nas.header_title': { fr: 'Gestionnaire des Pilotes Réseau / NAS', en: 'Network / NAS Driver Manager' },
  'nas.header_subtitle': { fr: 'Sélection et injection ciblée par nom et catégorie de périphérique', en: 'Selection and targeted injection by device name & category' },
  'nas.copy_logs_btn': { fr: 'Copier logs', en: 'Copy Logs' },
  'nas.brand_label': { fr: 'MARQUE :', en: 'BRAND:' },
  'nas.detected_model_label': { fr: 'MODÈLE DÉTECTÉ :', en: 'DETECTED MODEL:' },
  'nas.nas_server_label': { fr: 'Serveur NAS :', en: 'NAS Server:' },
  'nas.scan_btn': { fr: 'Scan', en: 'Scan' },
  'nas.index_json_btn': { fr: 'Index .json', en: 'Index .json' },
  'nas.indexing_status': { fr: 'Indexation...', en: 'Indexing...' },
  'nas.tab_import_title': { fr: '1. Importer & Installer les Pilotes', en: '1. Import & Install Drivers' },
  'nas.tab_export_title': { fr: '2. Exporter vers le NAS (DISM)', en: '2. Export to NAS (DISM)' },
  'nas.tab_tools_title': { fr: '3. Gestionnaire de Périphériques', en: '3. Device Manager' },
  'nas.selected_model_footer': { fr: 'Modèle sélectionné :', en: 'Selected model:' },
  'nas.choose_drivers_btn': { fr: 'Choisir les pilotes ({model})', en: 'Choose drivers ({model})' },
  'nas.pnputil_running': { fr: 'Injection PnPUtil en cours...', en: 'PnPUtil injection in progress...' },
  'nas.install_success_count': { fr: 'Installation réussie ({count})', en: 'Installation successful ({count})' },
  'nas.retry_error_count': { fr: 'Erreur - Réessayer ({count})', en: 'Error - Retry ({count})' },
  'nas.install_selected_count': { fr: 'Installer les pilotes sélectionnés ({count})', en: 'Install selected drivers ({count})' },
  'nas.export_running': { fr: 'Exportation DISM en cours...', en: 'DISM export in progress...' },
  'nas.export_success_label': { fr: 'Exportation réussie', en: 'Export successful' },
  'nas.start_export_nas_btn': { fr: "Lancer l'exportation vers le NAS", en: 'Start Export to NAS' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English ('en') with priority: sessionStorage > localStorage app_language > localStorage app-tauri-config > default 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const sessionLang = sessionStorage.getItem('app_session_lang');
      if (sessionLang === 'fr' || sessionLang === 'en') {
        return sessionLang;
      }
      const localLang = localStorage.getItem('app_language');
      if (localLang === 'fr' || localLang === 'en') {
        return localLang;
      }
      const savedConfig = localStorage.getItem('app-tauri-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.defaultLanguage === 'fr' || parsed.defaultLanguage === 'en') {
          return parsed.defaultLanguage;
        }
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      sessionStorage.setItem('app_session_lang', lang);
      localStorage.setItem('app_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    const entry = translations[key];
    let result = entry ? entry[language] : (fallback || key);

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
