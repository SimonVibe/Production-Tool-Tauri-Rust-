/**
 * Utility for localizing diagnostic and console log messages between French and English.
 * Translates backend messages, hardware status logs, driver/DISM/PnPUtil logs, 
 * Windows Update and BIOS flash logs in real time.
 */

export function translateLogMessage(msg: string, lang: 'fr' | 'en'): string {
  if (lang !== 'en' || !msg) return msg;

  let text = msg;

  // 1. System core & environment initialization
  text = text
    .replace(/^System Core Initialisé:\s*/i, 'System Core Initialized: ')
    .replace(/\bSimulateur Web \/ Local\b/gi, 'Web / Local Simulator')
    .replace(/\bTauri \(Rust \+ WebView2\)\b/gi, 'Tauri (Rust + WebView2)')
    .replace(/^Initialisation du système\.\.\./i, 'System initialization...');

  // 2. Network connectivity & credentials
  text = text
    .replace(/^Réseau auto-connecté\s*/i, 'Network auto-connected ')
    .replace(/^Détection réseau:\s*/i, 'Network detection: ')
    .replace(/Simulé:\s*Connecté au réseau\./i, 'Simulated: Connected to network.')
    .replace(/Identifiants invalides \(Simulation\)/i, 'Invalid credentials (Simulation)')
    .replace(/Identifiants réseau sauvegardés dans config\.json/i, 'Network credentials saved in config.json')
    .replace(/Connexion réseau établie avec succès/i, 'Network connection established successfully')
    .replace(/Erreur lors de la connexion réseau/i, 'Error connecting to network')
    .replace(/Connecté au réseau\./i, 'Connected to network.')
    .replace(/Non connecté au réseau/i, 'Not connected to network');

  // 3. Configuration & Hardware / Security refresh
  text = text
    .replace(/Configuration sauvegardée avec succès/i, 'Configuration saved successfully')
    .replace(/Actualisation forcée du matériel et de la sécurité\.\.\./i, 'Forced hardware and security refresh...')
    .replace(/Spécifications et sécurité actualisées avec succès/i, 'Specifications and security successfully refreshed')
    .replace(/^Erreur lors de l'actualisation:\s*/i, 'Error during refresh: ')
    .replace(/^Sécurité matérielle actualisée/i, 'Hardware security refreshed')
    .replace(/\(TPM:\s*(Oui|Non),\s*Secure Boot:\s*(Actif|Inactif),\s*UEFI:\s*(Oui|Non)\)/i, 
      (_match, tpm, sb, uefi) => `(TPM: ${tpm === 'Oui' ? 'Yes' : 'No'}, Secure Boot: ${sb === 'Actif' ? 'Active' : 'Inactive'}, UEFI: ${uefi === 'Oui' ? 'Yes' : 'No'})`
    );

  // 4. Command execution & actions
  text = text
    .replace(/^Lancement de:\s*/i, 'Launching: ')
    .replace(/^Échec du lancement:\s*/i, 'Launch failed: ')
    .replace(/^Action exécutée:\s*/i, 'Action executed: ')
    .replace(/^Exception lors du lancement:\s*/i, 'Exception during launch: ')
    .replace(/^Simulation\s*:\s*/i, 'Simulation: ')
    .replace(/Commande exécutée via Rust Core/i, 'Command executed via Rust Core')
    .replace(/\[Tauri Simulator\]\s*Commande\s*'(.*?)'\s*\((.*?)\)\s*exécutée avec succès en backend Rust\./i, 
      "[Tauri Simulator] Command '$1' ($2) executed successfully in Rust backend."
    );

  // 5. Action names in launch logs
  text = text
    .replace(/\bGestionnaire de périphériques\b/g, 'Device Manager')
    .replace(/\bScan PnP\b/g, 'PnP Scan')
    .replace(/\bLancer SDIO\b/g, 'Launch SDIO')
    .replace(/\bOuvrir Windows Update\b/g, 'Open Windows Update')
    .replace(/\bOuvrir dossier\b/g, 'Open folder')
    .replace(/\bRedémarrage\b/g, 'Restart')
    .replace(/\bApplication Batterie\b/g, 'Battery Application')
    .replace(/\bApp Externe\b/g, 'External App');

  // 6. Device management & PnPUtil logs
  text = text
    .replace(/Ouverture du Gestionnaire de périphériques\s*\(devmgmt\.msc\)\.\.\./i, 'Opening Device Manager (devmgmt.msc)...')
    .replace(/Ouverture du Gestionnaire de périphériques/i, 'Opening Device Manager')
    .replace(/Gestionnaire de périphériques ouvert\./i, 'Device Manager opened.')
    .replace(/Lancement de pnputil \/scan-devices\.\.\./i, 'Running pnputil /scan-devices...')
    .replace(/Scan des périphériques PnP déclenché\./i, 'PnP device scan triggered.')
    .replace(/Erreur lors du scan PnP/i, 'Error during PnP scan')
    .replace(/Erreur PnPUtil\s*:\s*/i, 'PnPUtil error: ')
    .replace(/Erreur injection PnPUtil/i, 'PnPUtil injection error')
    .replace(/Échec de l'opération/i, 'Operation failed')
    .replace(/Échec de relance en administrateur\s*:\s*/i, 'Failed to relaunch as administrator: ')
    .replace(/Lancement de l'utilitaire SDIO\.\.\./i, 'Launching SDIO utility...')
    .replace(/Ouverture de Windows Update\.\.\./i, 'Opening Windows Update...')
    .replace(/Exploration du dossier\s*:\s*/i, 'Exploring folder: ');

  // 7. NAS Drivers, Catalog & DISM logs
  text = text
    .replace(/Veuillez spécifier un chemin NAS valide pour générer l'index\./i, 'Please specify a valid NAS path to generate index.')
    .replace(/Génération de l'index centralisé 'index\.json' \(Optimisation Rust #3\) sur\s*:\s*/i, "Generating centralized index 'index.json' (Rust Optimization #3) on: ")
    .replace(/Catalogue actualisé\s*:\s*(\d+)\s*modèle\(s\) répertorié\(s\)\./i, 'Catalog updated: $1 model(s) cataloged.')
    .replace(/Erreur lors de la génération de l'index\s*:\s*/i, 'Error generating index: ')
    .replace(/Erreur génération index\.json/i, 'Error generating index.json')
    .replace(/Matériel détecté\s*:\s*/i, 'Detected hardware: ')
    .replace(/Numéro de série\s*:\s*/i, 'Serial number: ')
    .replace(/Scan du catalogue NAS\s*:\s*/i, 'Scanning NAS catalog: ')
    .replace(/Pack correspondant détecté pour ce poste\s*:\s*/i, 'Matching pack detected for this machine: ')
    .replace(/Aucun pack de pilotes exactement nommé\s*"(.*?)"\s*trouvé sur le NAS\./i, 'No driver pack exactly named "$1" found on the NAS.')
    .replace(/Vous pouvez sélectionner un autre pack compatible ou exporter ce poste avec DISM\./i, 'You can select another compatible pack or export this machine using DISM.')
    .replace(/(\d+)\s*pack\(s\) modèle\(s\) répertorié\(s\) sur le serveur NAS\./i, '$1 model pack(s) cataloged on the NAS server.')
    .replace(/Erreur lors du scan\s*:\s*/i, 'Error during scan: ')
    .replace(/Analyse des fichiers \.inf du dossier\s*:\s*/i, 'Analyzing .inf files in folder: ')
    .replace(/(\d+)\s*pilote\(s\) \.inf analysé\(s\) avec succès dans le dossier\./i, '$1 .inf driver(s) successfully analyzed in folder.')
    .replace(/Erreur lors de l'analyse des pilotes\s*:\s*/i, 'Error analyzing drivers: ')
    .replace(/Aucun pilote sélectionné pour l'installation\./i, 'No drivers selected for installation.')
    .replace(/Lancement de l'installation de (\d+) pilote\(s\) sélectionné\(s\)\.\.\./i, 'Starting installation of $1 selected driver(s)...')
    .replace(/Installation globale du dossier\s*:\s*/i, 'Full folder installation: ')
    .replace(/Installation ciblée de (\d+) fichier\(s\) \.inf/i, 'Targeted installation of $1 .inf file(s)')
    .replace(/Installation des pilotes terminée\./i, 'Driver installation complete.')
    .replace(/Veuillez spécifier un chemin de destination\./i, 'Please specify a destination path.')
    .replace(/Erreur lors de la vérification du dossier\s*:\s*/i, 'Error checking folder: ')
    .replace(/Lancement de l'exportation DISM vers\s*:\s*/i, 'Starting DISM export to: ')
    .replace(/\(Écrasement\s*:\s*Oui\)/i, '(Overwrite: Yes)')
    .replace(/\(Écrasement\s*:\s*Non\)/i, '(Overwrite: No)')
    .replace(/^Commande\s*:\s*/i, 'Command: ')
    .replace(/Tous les pilotes tiers ont été exportés avec succès vers\s*:\s*/i, 'All third-party drivers were successfully exported to: ')
    .replace(/⚡ Indexation instantanée \(< 0\.1s\)\s*:\s*manifest\.json et index\.json actualisés\./i, '⚡ Instant indexing (< 0.1s): manifest.json and index.json updated.')
    .replace(/Erreur DISM\s*:\s*/i, 'DISM error: ')
    .replace(/Erreur export DISM/i, 'DISM export error')
    .replace(/Échec de l’exportation|Échec de l'exportation/i, 'Export failed')
    .replace(/Veuillez saisir un nom de dossier valide\./i, 'Please enter a valid folder name.')
    .replace(/Rapport HTML généré avec succès sur le Bureau/i, 'HTML report successfully generated on Desktop');

  // 8. BIOS & Firmware flash logs
  text = text
    .replace(/Compte à rebours de redémarrage automatique annulé par l'utilisateur\./i, 'Automatic reboot countdown cancelled by user.')
    .replace(/Lancement de la commande de redémarrage de la machine \(shutdown -r -t 0\)\.\.\./i, 'Executing system reboot command (shutdown -r -t 0)...')
    .replace(/Redémarrage automatique programmé dans (\d+) secondes\.\.\./i, 'Automatic reboot scheduled in $1 seconds...')
    .replace(/RECHERCHE DES FIRMWARES & BIOS DISPONIBLES \(WINDOWS UPDATE \/ UEFI\)/i, 'SEARCHING FOR AVAILABLE FIRMWARES & BIOS (WINDOWS UPDATE / UEFI)')
    .replace(/DÉMARRAGE DU FLASHAGE BIOS \/ FIRMWARE/i, 'STARTING BIOS / FIRMWARE FLASH')
    .replace(/DÉMARRAGE DE LA MISE À JOUR BIOS MANUELLE/i, 'STARTING MANUAL BIOS UPDATE')
    .replace(/Fichier cible\s*:\s*/i, 'Target file: ')
    .replace(/Type détecté\s*:\s*/i, 'Detected type: ')
    .replace(/Élévation de privilèges administrateur \(RunAs\)\.\.\./i, 'Elevating administrator privileges (RunAs)...')
    .replace(/Mise à jour BIOS manuelle exécutée avec succès !/i, 'Manual BIOS update executed successfully!')
    .replace(/Un redémarrage est recommandé pour finaliser l'application du microprogramme BIOS\./i, 'A reboot is recommended to finalize the BIOS firmware application.')
    .replace(/Un redémarrage de la machine est requis pour que le BIOS s'applique au niveau UEFI\./i, 'A system restart is required for the BIOS to apply at the UEFI level.')
    .replace(/Aucun nouveau firmware BIOS trouvé sur Windows Update\. Le BIOS est à jour\./i, 'No new BIOS firmware found on Windows Update. BIOS is up to date.')
    .replace(/(\d+)\s*package\(s\) de firmware BIOS identifié\(s\)\s*:\s*/i, '$1 package(s) of BIOS firmware identified: ')
    .replace(/Firmware\(s\) BIOS UEFI installé\(s\) et programmé\(s\) avec succès\./i, 'UEFI BIOS firmware(s) installed and scheduled successfully.')
    .replace(/Échec ou avertissement lors de l'installation du firmware\./i, 'Failure or warning during firmware installation.')
    .replace(/Erreur critique\s*:\s*/i, 'Critical error: ')
    .replace(/Fichier BIOS sélectionné\s*:\s*/i, 'Selected BIOS file: ')
    .replace(/Erreur lors de la sélection du fichier\s*:\s*/i, 'Error selecting file: ')
    .replace(/Échec du flashage manuel\s*:\s*/i, 'Manual flash failed: ')
    .replace(/Matériel\s*:\s*/i, 'Hardware: ')
    .replace(/Version BIOS active\s*:\s*/i, 'Active BIOS version: ')
    .replace(/Attention : L'ordinateur est sur batterie\. Veuillez brancher le chargeur secteur avant de flasher le BIOS\./i, 'Warning: Computer is on battery. Please connect AC charger before flashing BIOS.')
    .replace(/Interrogation de Microsoft Update Catalog\.\.\./i, 'Querying Microsoft Update Catalog...')
    .replace(/Mode Force\/Toutes versions\s*:\s*OUI/i, 'Force mode / All versions: YES')
    .replace(/Mode Force\/Toutes versions\s*:\s*NON/i, 'Force mode / All versions: NO')
    .replace(/Mode Force\/Toutes versions\s*:\s*/i, 'Force mode / All versions: ')
    .replace(/Préparation du composant Windows Update Installer COM\.\.\./i, 'Preparing Windows Update Installer COM component...')
    .replace(/Échec critique lors de l'installation\s*:\s*/i, 'Critical failure during installation: ')
    .replace(/Échec lors de la recherche des firmwares\s*:\s*/i, 'Failed while searching for firmwares: ')
    .replace(/Impossible d'exécuter l'installation du firmware/i, 'Unable to execute firmware installation')
    .replace(/Erreur d'exécution/i, 'Execution error')
    .replace(/Erreur lors du flashage manuel/i, 'Error during manual flash');

  // 9. Windows Update logs
  text = text
    .replace(/=== RECHERCHE DES PILOTES VIA WINDOWS UPDATE ===/i, '=== SEARCHING FOR DRIVERS VIA WINDOWS UPDATE ===')
    .replace(/RECHERCHE DES PILOTES VIA WINDOWS UPDATE/i, 'SEARCHING FOR DRIVERS VIA WINDOWS UPDATE')
    .replace(/Initialisation de Microsoft\.Update\.Session \(recherche globale en cours\)\.\.\./i, 'Initializing Microsoft.Update.Session (global search in progress)...')
    .replace(/Démarrage de l'installation Windows Update pour (\d+) pilote\(s\)\.\.\./i, 'Starting Windows Update installation for $1 driver(s)...')
    .replace(/Téléchargement et installation séquentielle via Microsoft Update Agent\.\.\./i, 'Downloading and sequential installation via Microsoft Update Agent...')
    .replace(/Aucun pilote supplémentaire en attente sur Windows Update\. Le système est à jour\./i, 'No additional drivers pending on Windows Update. System is up to date.')
    .replace(/Échec de la recherche\s*:\s*/i, 'Search failed: ')
    .replace(/Redémarrage automatique planifié dans (\d+) secondes\.\.\./i, 'Automatic reboot scheduled in $1 seconds...')
    .replace(/pilote\(s\) détecté\(s\)/i, 'driver(s) detected')
    .replace(/mise\(s\) à jour en attente sélectionnée\(s\) par défaut/i, 'pending update(s) selected by default')
    .replace(/mise\(s\) à jour en attente/i, 'pending update(s)')
    .replace(/déjà installé\(s\)/i, 'already installed')
    .replace(/Tous sont actuellement installés\. Vous pouvez cocher n'importe quel pilote pour forcer sa réinstallation\./i, 'All are currently installed. You can check any driver to force its reinstallation.')
    .replace(/Redémarrage requis pour appliquer les pilotes/i, 'Reboot required to apply drivers')
    .replace(/\(Périphérique\)/i, '(Device)');

  // 10. General system errors and status keywords
  text = text
    .replace(/Erreur lors de l’exécution Tauri|Erreur lors de l'exécution Tauri/i, 'Error during Tauri execution')
    .replace(/Erreur d’exécution du diagnostic de sécurité|Erreur d'exécution du diagnostic de sécurité/i, 'Error executing security diagnostics')
    .replace(/Erreur installation Windows Update/i, 'Windows Update installation error')
    .replace(/Erreur installation pilotes ciblés/i, 'Targeted driver installation error')
    .replace(/Une erreur inattendue est survenue/i, 'An unexpected error occurred')
    .replace(/\bErreur inconnue\b/gi, 'Unknown error')
    .replace(/\bInconnue\b/g, 'Unknown')
    .replace(/\bOui\b/g, 'Yes')
    .replace(/\bNon\b/g, 'No')
    .replace(/\bActif\b/g, 'Active')
    .replace(/\bInactif\b/g, 'Inactive');

  return text;
}
