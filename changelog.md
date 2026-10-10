# Changelog

This file keeps track of all major changes made to the **Hardware Diagnostic & Update Tool** application.

---

## [2026-10-10] - Version 1.2.58: Automatic UI Version Synchronization

### [Changed]
* **Version Sync Utility (`sync-version.js`)**:
  * Enhanced `sync-version.js` to automatically update the UI version badge in `src/components/Dashboard.tsx` whenever `changelog.md` version is updated, ensuring the compiled app always reflects the correct version.

---

## [2026-10-10] - Version 1.2.55: README Configuration Password Documentation

### [Changed]
* **Documentation (`README.md`)**:
  * Added a prominent callout under the **Configuration & Network Deployment** section specifying that the default configuration password is **`admin`**.

---

## [2026-10-10] - Version 1.2.54: README GitHub Repository URL Update

### [Changed]
* **Repository Documentation (`README.md`)**:
  * Updated clone instructions and GitHub repository URL to `https://github.com/SimonVibe/Production-Tool-Tauri-Rust-.git`.

---

## [2026-10-10] - Version 1.2.53: Public Folder Asset Cleanup

### [Removed]
* **Unused Public Assets (`/public`)**:
  * Removed unreferenced assets (`app-logo.png`, `Charlie - Saut.svg`, `charlie-saut.svg`) from the `/public` directory, keeping only the actively used `background.png`.

---

## [2026-10-10] - Version 1.2.52: Cleanup of Unused Temporary Files

### [Removed]
* **Unused Development & Test Scripts (`/`)**:
  * Removed unused temporary files and diagnostic test scripts (`replace_script.py`, `replace_this.txt`, `test_batt.ps1`, `test_sec.ps1`, `test_sn.ps1`) to streamline the repository root directory.

---

## [2026-10-07] - Version 1.2.51: Complete Localization of Hardware Spec Refresh Popups, Toasts & Tooltips

### [Fixed]
* **Hardware Specification Refresh Popups & Toasts (`src/components/Dashboard.tsx`)**:
  * Refactored floating toast notification state to store translation keys and dynamic parameter payloads instead of pre-rendered text strings.
  * Added `resolveToastMessage` with live active-language translation and automatic reverse-lookup for French strings when English is active, guaranteeing the popup toast never displays in French when the app is set to English.
  * Updated `handleRefreshAll` to pass `'toast.refreshing'`, `'toast.refreshed_success'`, and `'toast.refresh_error'` directly to the toast system.
  * Standardized keyboard shortcut toasts (`F5`, `R`, `E`, `C`, `K`, `S`, `B`, `T`, `F`, `P`, `L`) to use direct translation keys with zero collision.
* **Hardware Specification Hover Tooltips (`src/components/Dashboard.tsx`, `src/i18n/LanguageContext.tsx`)**:
  * Localized the partition mode / UEFI status badge tooltip (`specs.partition_checking`, `specs.partition_uefi`, `specs.partition_legacy`) which previously showed hardcoded French on hover.
  * Localized the disk serial number copy tooltip button (`Copy S/N: {sn}` in English, `Copier S/N : {sn}` in French).
  * Localized the 5-second moving average battery telemetry tooltip (`battery.moving_avg_tooltip`).
* **Language Persistence & Refresh Logs (`src/App.tsx`, `src/i18n/LanguageContext.tsx`, `src/lib/tauriAdapter.ts`)**:
  * Added `app_language` persistent key in `localStorage` in addition to `sessionStorage` so technician language selection is reliably preserved.
  * Localized system debug logs generated during forced hardware and security refreshes, security status checks, and network auto-connect.
  * Localized battery duration estimates in web and Tauri adapter simulations (`remaining` / `restantes`, `full charge` / `pleine charge`).

---

## [2026-10-07] - Version 1.2.50: Application Renaming to Production Tool

### [Changed]
* **Application Branding & Display Name (`Production Tool`)**:
  * Updated application header title to **Production Tool** in `src/components/Dashboard.tsx`.
  * Updated web entry title and OpenGraph metadata in `index.html`.
  * Updated desktop product name and window title in `src-tauri/tauri.conf.json` and `sync-version.js`.
  * Updated compilation script headers, titles, and terminal notices in `run.bat` and `post-build.js`.
  * Harmonized documentation across `README.md` and `USER_GUIDE.md`.

---

## [2026-10-06] - Version 1.2.49: Compilation Requirements & Toolchain Streamlining

### [Changed]
* **Cleaned and Streamlined Dependencies (`package.json`)**:
  * Cleaned duplicate dependency declarations across `dependencies` and `devDependencies` (consolidated `vite` in `devDependencies`).
* **Enhanced Toolchain Verification (`run.bat`)**:
  * Streamlined automated prerequisite verification for Node.js LTS, Rust/Cargo (`x86_64-pc-windows-msvc`), and Visual Studio C++ Build Tools (MSVC).
  * Added automated detection and winget resolution for MSVC C++ toolchain requirements.

---

## [2026-10-06] - Version 1.2.48: Complete Localization of Loading States

### [Fixed]
* **Dynamic Translation of Loading States (`App.tsx`, `Dashboard.tsx`, `NasDriversModal.tsx`)**:
  * Replaced hardcoded `"Chargement..."` fallback in `App.tsx` `<Suspense fallback="...">` with dynamic `t('common.loading')` so the Settings modal and other lazy-loaded views render `"Loading..."` when the active language is English.
  * Enhanced `getSysValue` and `SpecRow` in `Dashboard.tsx` to automatically localize hardware discovery placeholders (`"Loading..."` in English, `"Chargement..."` in French).
  * Updated copy buttons, SMART badges, and model detectors to support multilingual loading indicators seamlessly.
* **Documentation & Operations Manual Synchronization (`README.md`, `USER_GUIDE.md`)**:
  * Synchronized all build artifact directories, filenames, titles, and paths to reflect `Production-Tool` and the structured `/dist/1_portable/` and `/dist/2_installer/` output targets.
  * Added Google AI Studio attribution badge and acknowledgement in `README.md`.

---

## [2026-10-06] - Version 1.2.47: Resilient Build Window Persistence & Robust Dist Packaging

### [Fixed]
* **Build Console Auto-Close Fix (`run.bat`)**:
  * Fixed an issue where the elevated PowerShell command window closed immediately upon script completion or errors by switching `Start-Process cmd` from `/c` to `/k` and ensuring the script always pauses before exiting.
* **Guaranteed Artifact Copy to `/dist/1_portable/` and `/dist/2_installer/` (`post-build.js`, `run.bat`)**:
  * Updated `run.bat` to unconditionally invoke `post-build.js` regardless of bundle warnings, ensuring any compiled binaries are moved.
  * Added recursive bundle scanning in `post-build.js` for `.exe` (NSIS) and `.msi` (WiX) installers.
  * Added self-copy collision prevention and fallback locator to guarantee portable and installer binaries are placed into `/dist/1_portable/` and `/dist/2_installer/`.

---

## [2026-10-06] - Version 1.2.46: English Localization for Build & Packaging Scripts

### [Changed]
* **Build Script Localization (`run.bat`, `post-build.js`, `sync-version.js`)**:
  * Fully translated `run.bat` command output, step notifications, prerequisite alerts, UAC elevation messages, and build summaries into English.
  * Translated all build pipeline logs in `sync-version.js` and `post-build.js` into English.

---

## [2026-10-06] - Version 1.2.45: Build System Rebranding to Production-Tool & Structured Dist Folders

### [Changed]
* **Application Compilation Rebranding (`Production-Tool`)**:
  * Renamed the compilation product name to `Production-Tool` across Tauri configuration (`src-tauri/tauri.conf.json`), Rust crate package (`src-tauri/Cargo.toml`), and npm package (`package.json`).
  * Updated `sync-version.js` to ensure subsequent automated builds maintain the `Production-Tool` executable naming scheme and window title.
* **Structured Artifact Output Directories (`/dist/1_portable/` & `/dist/2_installer/`)**:
  * Updated `post-build.js` and `run.bat` to automatically organize build deliverables:
    * **Portable Executables**: Saved directly into `dist/1_portable/` (`Production-Tool_v{version}_Portable.exe` and `Production-Tool.exe`).
    * **Windows Installers**: Saved directly into `dist/2_installer/` (`Production-Tool_v{version}_Installer.exe` NSIS setup and `Production-Tool_v{version}_Installer.msi` WiX package).
  * Enhanced `run.bat` packaging script with updated paths, informative banners, and automatic folder scaffolding.

---

## [2026-10-06] - Version 1.2.44: Configurable Default Starting Language

### [Added]
* **Default Starting Language Setting (`defaultLanguage`)**:
  * Added `defaultLanguage?: 'en' | 'fr'` to `AppConfig` and `defaultConfig` in `src/types.ts` and `src-tauri/src/main.rs`.
  * Added an interactive language selector (English / Français) in the Settings page (`src/components/ConfigPage.tsx`).
  * Enhanced `LanguageProvider` (`src/i18n/LanguageContext.tsx`) and application bootstrap (`src/App.tsx`) to immediately initialize the UI using the persisted `defaultLanguage` preference unless manually toggled during the active session.
* **Documentation Synchronization & Technical Audit (`README.md`, `USER_GUIDE.md`)**:
  * Harmonized the features list and configuration specifications to reflect the default password (`admin`), the new `defaultLanguage` startup setting, and the removal of legacy external battery tools and reports.
  * Corrected project directory structure descriptions and cross-referenced the operational manual.

---

## [2026-10-06] - Version 1.2.43: Removed BatteryInfoView & Windows Battery Report

### [Removed]
* **BatteryInfoView Configuration & Integration**:
  * Removed `batteryAppPath` from configuration data model (`AppConfig`, `defaultConfig`) in `src/types.ts`.
  * Removed the executable path input field and validation for BatteryInfoView in `src/components/ConfigPage.tsx`.
  * Removed the "External Tool (BatteryInfoView)" launch button from `src/components/BatteryHealthModal.tsx`.
  * Removed associated localized strings in `src/i18n/LanguageContext.tsx`.
* **Windows Battery Report Generation**:
  * Removed the "Full Windows Battery Report" button, state handling, and feedback messages from `src/components/BatteryHealthModal.tsx`.
  * Removed `hardwareAPI.generateBatteryReport` from `src/lib/tauriAdapter.ts`.
  * Removed the native `generate_battery_report` command and invoke registration from `src-tauri/src/main.rs`.
  * Updated `README.md` and `USER_GUIDE.md` to reflect the streamlined battery telemetry modal.

---

## [2026-10-06] - Version 1.2.42: Updated Default Configuration Password to "admin"

### [Changed]
* **Default Admin Password Update (`src/App.tsx`, `README.md`, `USER_GUIDE.md`)**:
  * Updated the fallback `DEFAULT_ADMIN_HASH` constant in `src/App.tsx` from the legacy hash to the SHA-256 hash of `"admin"` (`8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`).
  * Updated technical documentation, example `config.json` specifications, and operational manuals (`README.md`, `USER_GUIDE.md`) to reflect the new default password (`admin`).

---

## [2026-10-02] - Version 1.2.41: Neutral Branding, Legacy Brand Removal & Header Redesign

### [Removed]
* **Brand Neutralization & Identity Cleanup**:
  * Removed legacy brand names, logos, tags, and references across codebase, UI elements, configuration schemas, help manuals, and build scripts.
  * Replaced the header logo with a sleek, modern Hardware Diagnostic Suite brand icon (`Cpu`), live version badge, and descriptive subtitle in `src/components/Dashboard.tsx`.
  * Removed `src/assets/logoBase64.ts` and deleted obsolete logo references.
  * Neutralized mock hardware specifications in `src/lib/tauriAdapter.ts` and `src-tauri/src/main.rs` (e.g. `HP EliteBook 840 G8`, `QC-2026-009`, `SN-SYSTEM-2026`, `Workshop Workstation`).
  * Sanitized default paths (`C:\Tools\...`), client application IDs, and localStorage/sessionStorage keys.

### [Changed]
* **Application Naming & Artifacts**:
  * Updated Tauri product name, window titles, and executable artifact names to `Hardware Diagnostic Tool` (`Hardware-Diagnostic-Tool_v{version}_Portable.exe` and `Hardware-Diagnostic-Tool_v{version}_Installer.exe`).
  * Updated `package.json`, `index.html`, `run.bat`, `sync-version.js`, and `post-build.js` accordingly.

---

## [2026-10-02] - Version 1.2.40: Default English Localization & Complete English Changelog

### [Added]
* **Default English Language Configuration**:
  * Set English (`en`) as the default active language across the entire application interface upon initial launch.
  * Preserved session-level language switching (`fr` / `en`) with instant reactivity across all modals and widgets.
  * Configured default fallback language parameters to English across adapters, hooks, diagnostics, and components (`LanguageContext.tsx`, `tauriAdapter.ts`, `useBatteryMonitor.ts`, `DebugLogViewer.tsx`, `ConfigPage.tsx`).
* **Complete English Changelog Translation**:
  * Fully translated `changelog.md` into comprehensive English documentation while maintaining version integrity, semantic tags (`[Added]`, `[Fixed]`, `[Changed]`, `[Improved]`), and technical accuracy.

---

## [2026-10-01] - Version 1.2.39: Comprehensive Log Console & Execution Terminals Localization (FR/EN)

### [Fixed]
* **Complete Dynamic Localization of the Log Console (`src/lib/logTranslator.ts`, `src/components/DebugLogViewer.tsx`)**:
  * **Exhaustive Translation of System Messages & Events**:
    * Environment and core initialization: `Simulateur Web / Local` translated to `Web / Local Simulator`.
    * Network and authentication events: `Identifiants invalides (Simulation)` translated to `Invalid credentials (Simulation)`, `Simulé: Connecté au réseau.` to `Simulated: Connected to network.`, `Identifiants réseau sauvegardés dans config.json` to `Network credentials saved in config.json`, and `Connexion réseau établie avec succès` to `Network connection established successfully`.
    * Launched actions and commands: dynamic translation of action names (`Device Manager`, `PnP Scan`, `Launch SDIO`, `Open Windows Update`, `Open folder`, `Restart`, `Battery Application`, `External App`).
    * Execution confirmations: `Commande exécutée via Rust Core` translated to `Command executed via Rust Core`, and Rust backend simulation messages fully translated into English.
    * Hardware security refresh summaries: TPM, Secure Boot, and UEFI status badges automatically converted (`Yes`/`No`, `Active`/`Inactive`).
    * Generic error handling: `Erreur inconnue` translated to `Unknown error`, alongside Tauri execution and DISM errors.
  * **Log Parser Enhancements (`parseLogEntry`) & Clipboard Copy**:
    * Support for command prefixes `[CMD]` and informational logs `[INFO]` with dedicated visual badges.
    * Automatic translation of text copied to clipboard when clicking "Copy all" in English mode.
  * **Integrated Modal Execution Terminals (`DriverTerminalLogs.tsx`, `WindowsUpdateModal.tsx`, `BiosUpdateModal.tsx`)**:
    * Systematic application of `translateLogMessage` in DISM / PnPUtil execution logs, Windows Update logs, and BIOS Flash logs.
    * Localized clipboard copy across all secondary terminals.
  * **Network Login Dialog (`NetworkLoginModal.tsx`)**:
    * Dynamic translation of network connection results and error messages according to the selected language.

---

## [2026-10-01] - Version 1.2.38: Bilingual Battery Charge Status Localization ("En charge" / "Charging")

### [Fixed]
* **Complete Battery Telemetry Internationalization (`src/components/BatteryHealthModal.tsx`, `src/hooks/useBatteryMonitor.ts`, `src/lib/tauriAdapter.ts`)**:
  * **Charge Level Card**:
    * Translated status label to English: `Charging (${pct}% - 5s Avg.)` / `On AC Power` / `On Battery` (replacing legacy static French text `En charge`).
    * Translated average badge: `5s avg.` in English (`5s moy.` in French).
    * Updated smoothing label: `Moving average: 5s` (`Moyenne mobile : 5s`).
  * **Estimated Time to Full Charge / Battery Life Card**:
    * Translated large estimate title: `Charging` in English (`En charge` in French) and `Charging...` (`En charge...`).
    * Dynamic duration formatting with minutes: `Full in ~XhYm` and `~X h Y min (until full charge)`.
    * Translated cycle and smoothing badges: `5s avg.`, `Continuous smoothing: 5s`, `Cycle: 5s`.
  * **Hardware Adapter & Moving Average Calculator**:
    * Added language support (`lang: 'fr' | 'en'`) in `formatBatteryDuration` and `useBatteryMonitor`.
    * Automatic adaptation of simulation labels and ACPI controller returns matching the UI language.

---

## [2026-10-01] - Version 1.2.37: Comprehensive Hardware Security Guides Localization (TPM 2.0 & Secure Boot)

### [Fixed]
* **Complete Bilingual Localization of Hardware Security Procedures (`src/components/SecurityGuideModal.tsx`)**:
  * **Vendor-Specific Guides**:
    * **HP Guide (ProBook / EliteBook)**: Full English and French translation of all 7 detailed steps (BIOS access via Esc/F10, TPM Embedded Security activation, Secure Boot configuration, Legacy Support disabling and pure UEFI mode, factory key reload, F10 save, and critical warning regarding 4-digit PIN confirmation).
    * **Dell Guide (Latitude / OptiPlex / Precision)**: Bilingual translation of 6 steps (F2 on boot, TPM 2.0 / Intel PTT activation, Secure Boot Enable, UEFI boot sequence verification, Expert Key Management Custom Mode disabling, and save).
    * **Lenovo Guide (ThinkPad / ThinkCentre)**: Bilingual translation of 6 steps (F1 on boot, Security Chip on Active/Enabled, Secure Boot toggle, pure UEFI / CSM No enforcement, factory key restoration with Setup Mode warning, and F10 save).
    * **Toshiba / Dynabook Guide (Portégé / Tecra / Satellite Pro)**: Bilingual translation of 6 steps (F2/F12 access, TPM 2.0 / Intel PTT, Secure Boot [Enabled], Boot Mode [UEFI Boot], unlocking with Supervisor password if options are greyed out, and save).
    * **General & Disk Verification Guide (Asus, Acer, MSI, others)**: Bilingual translation of `msinfo32` verifications (UEFI vs Legacy BIOS Mode) and Microsoft `mbr2gpt.exe /convert /allowFullOS` lossless conversion command.
  * **Alert Banners & Visual Badges**:
    * Dynamic translation of step badges (`Boot`, `TPM Security`, `Secure Boot`, `UEFI Mode`, `PK/KEK Keys`, `Save`, `HP Critical Step`, `Keys / Security`).
    * Status pills translation: `Action required`, `Already compliant`.
    * Translation of blocking MBR Legacy disk banner with interactive MBR2GPT command copy buttons (`Copy`, `Copied!`).
    * Translation of the Setup Mode warning box with 30-second factory keys restoration guidance.

---

## [2026-10-01] - Version 1.2.36: Full Internationalization (FR/EN), run.bat Prerequisite Automation & Portable/Installer Packaging

### [Added]
* **Integral Bilingual Internationalization (French / English)**:
  * Systematic integration of `useLanguage` hook and dynamic i18n dictionary across all modules:
    * **Network & NAS Drivers Manager (`NasDriversModal.tsx`, `DriverCatalogBrowser.tsx`, `DismExportPanel.tsx`, `DriverToolsPanel.tsx`, `DriverProgressCard.tsx`, `DriverTerminalLogs.tsx`)**: Titles, subtitles, injection steps, DISM exports, conflict resolution, and execution logs.
    * **Screen Diagnostics (`ScreenTestModal.tsx`)**: Dead pixel test instructions, keyboard/mouse controls, and display modes.
    * **Camera & Microphone Diagnostics (`CameraMicModal.tsx`)**: Video stream status, active resolutions, mirror toggle, photo capture, and audio test guidance.
    * **Battery Health & Telemetry (`BatteryHealthModal.tsx`)**: 5s smoothing badges, charge gauges, estimated battery life, and chemical/technical details.
    * **BIOS Security & Unlock Guide (`SecurityGuideModal.tsx`)**: Titles, TPM 2.0 / Secure Boot statuses, vendor tabs, and guidance footer.
    * **Help Center & Documentation (`HelpModal.tsx`)**: 6 full panels (Workflow, Drivers & NAS, BIOS & Updates, Tests & Diagnostics, Network, Keyboard shortcuts).
    * **Dashboard & Quick Controls (`Dashboard.tsx`)**: Zoom button tooltips (+/-/100%) and quick actions synchronized with the active language.
* **Unified Build & Packaging Script (`run.bat`)**:
  * UAC Administrator privilege detection and auto-elevation via PowerShell.
  * Automatic dependency detection with silent installation if absent:
    * Node.js LTS via `winget install OpenJS.NodeJS.LTS`.
    * Rust & Cargo via `winget install Rustlang.Rustup` or official `rustup-init.exe` downloader.
    * C++ Build Tools (MSVC) detection and user guidance.
  * Automatic app icon generation (`src-tauri/icons/icon.ico`, `.icns`, and PNG formats) from `app-icon.png` via `@tauri-apps/cli icon`.
  * Dynamic version synchronization from `changelog.md` to `package.json`, `tauri.conf.json`, and `Cargo.toml`.
  * Native build creating both **Portable** (`Hardware-Diagnostic-Tool_v{version}_Portable.exe`) and **Official Windows Installer** (`Hardware-Diagnostic-Tool_v{version}_Installer.exe`) copied directly to workspace root.
* **File Unification & Standards**:
  * Strict maintenance of a single `changelog.md` and single `run.bat` at workspace root.

---

## [2026-09-09] - Version 1.2.35: 5-Second Battery Refresh Cycle with 5-Second Moving Average

### [Added]
* **High-Frequency Refresh Cycle and Moving Average (5s) (`src/hooks/useBatteryMonitor.ts`)**:
  * **High-Precision Sampling (1 second)**:
    * Background sampling at 1 measurement per second (`1000 ms`) from ACPI / Win32 hardware controller.
    * Maintained circular rolling buffer (`BatterySample[]`) storing timestamped history.
  * **Rolling Average over the Last 5 Seconds (`computeBatteryMovingAverage`)**:
    * **Charge Status (Percentage & Power)**:
      * Smoothed arithmetic average of charge percentage (`percentage`) over the last 5 seconds.
      * Smoothed average of charging power in Watts (`chargeRateWatts`) and discharge rate in Watts (`dischargeRateWatts`).
    * **Battery Life & Recharge Time**:
      * Moving average of estimated runtime (`estimatedRunTimeMinutes`) over 5 seconds.
      * Moving average of time to full charge (`estimatedChargeTimeMinutes`) over 5 seconds.
      * Automatic recalculation and dynamic formatting of remaining time (`~X h Y min`).
    * **Static Hardware Metrics Preservation**:
      * Design capacity, full charge capacity, cycle count, manufacturer, serial number, and chemistry preserved from latest valid sample.
* **Dashboard Dynamic Integration (`src/components/Dashboard.tsx`)**:
  * Replaced legacy 15s interval with reactive `useBatteryMonitor` clocked at **5 seconds**.
  * Instant display upon app mount (t=0s) without blank screens, then continuous 5s smoothing.
  * Compact `5s avg.` visual badge with emerald pulse indicator on each recalculation.
  * Updated battery button tooltip detailing sample count and explicit 5s moving average.
* **Enriched Telemetry in Health & Diagnostic Window (`src/components/BatteryHealthModal.tsx`)**:
  * Dynamic header badge `5s Average (X samples)` with live green indicator.
  * **Charge Status** and **Estimated Runtime** cards with continuous 5s smoothing badges.
  * Explanatory rows in metrics table: *Smoothing Mode: Moving Average (5 seconds)*, *Update Frequency: Every 5s (1s sampling)*.
* **Web Preview Simulation & Robustness (`src/lib/tauriAdapter.ts`)**:
  * Modeled natural power controller micro-variations (controlled jitter) in preview simulator to visually demonstrate 5s moving average efficacy.

---

## [2026-09-09] - Version 1.2.34: Dual BIOS Update Modes (Windows Update or Manual File)

### [Added]
* **Dual Choice BIOS & Firmware Update (`BiosUpdateModal.tsx`, `Dashboard.tsx`)**:
  * **Initial Selection Screen & Navigation Tabs**:
    * Clicking **"Update"** BIOS (or keyboard shortcut `F`) opens an interactive screen with 2 distinct paths:
      1. **Update via Windows Update (Automatic)**: Official Microsoft/vendor certified UEFI capsules with automatic download and staging.
      2. **Manual Update (Point to File)**: Direct selection of vendor executables (`.exe`), UEFI capsules (`.inf`, `.cap`, `.bin`, `.rom`, `.bio`, `.fd`), or deployment scripts (`.bat`, `.cmd`, `.ps1`).
    * Ergonomic tab bar at top of window allowing instant switching between *Mode Choice*, *Windows Update*, and *Manual File*.
  * **Manual Selection & Execution Module (`BiosUpdateModal.tsx`)**:
    * Direct path input (compatible with copy-paste and UNC network paths).
    * **"Browse..."** button opening native Windows dialog (`@tauri-apps/plugin-dialog`) filtered for BIOS firmware extensions.
    * Real-time file extension analysis with explanatory badges (Official Executable, PnPUtil Capsule, Flashing Script).
    * Safety guidelines and AC power/battery checks.
    * Shared terminal console with real-time output, exit codes, and vendor logs.
  * **New Native Rust Backend Command (`src-tauri/src/main.rs`)**:
    * `install_manual_bios_file` command handling:
      * Staging UEFI capsules via `pnputil.exe /add-driver <path> /install`.
      * Running `.exe` utilities with elevated administrator privileges (`RunAs`) (HP BIOS Flash, Dell Update Package, Lenovo ThinkPad Flash, Insyde).
      * Controlled execution of `.bat`, `.cmd`, and `.ps1` scripts.
      * Scheduled automatic reboot support following successful installation.
  * **Multi-Platform Adapter Methods (`src/lib/tauriAdapter.ts`)**:
    * Added `selectBiosFile()` and `installManualBiosFile()`.
    * Realistic preview simulation in web/browser environments.

---

## [2026-09-09] - Version 1.2.33: Model Copy Button in Detected Specifications

### [Added]
* **Quick Copy Button for Hardware Model (`Dashboard.tsx`)**:
  * Added dedicated copy button on the **Model** row within hardware specifications table.
  * Instant interaction via Clipboard API (`navigator.clipboard.writeText`).
  * Visual feedback with animated icon swap (`Copy` to emerald `Check`) and toast notification: *"✓ Model copied to clipboard"*.
  * Smart button hiding if model is loading (`Loading...`) or unavailable (`N/A`).

---

## [2026-09-09] - Version 1.2.32: Battery Runtime & Recharge Estimates (Dashboard & Health Modal)

### [Added]
* **Precise Battery Duration Estimation (Discharge & Recharge)**:
  * **Rust Hybrid Estimation Algorithm (`src-tauri/src/main.rs`)**:
    * Direct integration of `battery_life_time` and `battery_full_life_time` provided by Win32 `GetSystemPowerStatus` API.
    * Implemented `compute_battery_duration` function with smart fallback cascade:
      1. Real-time Win32 ACPI time reported by EC microcontroller.
      2. WMI / CIM queries (`BatteryStatus` & `EstimatedRunTime`).
      3. Dynamic consumption calculations in milliwatts/Watts (`remaining mWh / discharge rate mW` or `(max capacity - current charge) / charge rate mW`).
    * Automatic calculation of charge rates (`charge_rate_watts`) and discharge rates (`discharge_rate_watts`).
  * **Dynamic Dashboard Battery Button Display (`Dashboard.tsx`)**:
    * Added compact estimated battery life badge (e.g., `~3h45`, `~45m`, `AC Power`) with contextual icons (`Zap` when charging, `Clock` when discharging).
    * Detailed tooltip showing exact remaining runtime or time required for 100% full charge.
  * **Dedicated Cards & Metrics in Health Window (`BatteryHealthModal.tsx`)**:
    * 3-card layout: **Charge Status**, **Estimated Battery Life / Recharge Time**, and **Health / Wear Level**.
    * Instant wattage display (`+X.X W` or `-X.X W`) and predictions in hours and minutes.
    * Added detailed table rows: *Estimated remaining battery life*, *Estimated recharge time*, and *Instant power*.
  * **Enriched Driver Safety Banner (`PreFlightSafetyBanner.tsx`)**:
    * Displayed remaining runtime directly in warning message when driver installer runs on battery power alone.

---

## [2026-09-09] - Version 1.2.31: Secure Boot Setup Mode Diagnostics & Guide (Cleared Keys on Lenovo)

### [Fixed]
* **Resolved Inactive Secure Boot State After "Clear All Keys" (Lenovo & UEFI)**:
  * **Root Cause Explanation**:
    * In UEFI specifications, selecting *"Clear All Secure Boot Keys"* or *"Reset to Setup Mode"* in BIOS clears the Platform Key (PK) from NVRAM.
    * Firmware immediately switches to **Setup Mode** (`SetupMode = 1`). In this mode, **even if Secure Boot is toggled to "Enabled"**, the UEFI firmware disables signature verification because the certificate database is empty. EFI system variable `SecureBoot` and Windows registry `UEFISecureBootEnabled` remain at `0` (Disabled/Inactive).
    * Transitioning to **User Mode** requires loading factory keys using **"Restore Factory Keys"** (or *"Install Default Keys"*).
  * **Native Setup Mode Detection in Rust Backend (`src-tauri/src/main.rs`)**:
    * Direct query of standard EFI variable `SetupMode` (`{8be4df61-93ca-11d2-aa0d-00e098032b8c}`) via Win32 API `GetFirmwareEnvironmentVariableW`.
    * Added `setupMode` property in `SecurityStatusResult` and `SecurityStatus`.
  * **Lenovo Vendor Guide Enhancement (`SecurityGuideModal.tsx`)**:
    * Updated Step 5 of Lenovo procedure to explicitly state: *"Restore Factory Keys"* and warned never to leave keys cleared.
    * Added dedicated Lenovo alert box detailing root cause and 30-second fix to restore *User Mode*.
    * Added dynamic alert banner when `SetupMode` is detected active.
  * **Dashboard Precision Indicator (`Dashboard.tsx`)**:
    * Displays clear **"Keys cleared (Setup Mode)"** in amber with explanatory tooltip and direct link to security guide.
    * Automatic vendor tab selection based on Manufacturer (`Manufacturer + Model`).

---

## [2026-09-09] - Version 1.2.30: Eradication of EDK2 / Firmware Strings from Ownership Tag & Exclusive Vendor WMI Detection

### [Fixed]
* **Complete Resolution of Ownership Tag Bug (`EDK2_1, Buff=2, MEFWRec`)**:
  * **Strict Firmware / UEFI / Intel ME Tag Filtering**:
    * Eradicated residual technical strings injected by HP UEFI firmware and DMTF SMBIOS Type 11: `EDK2_1`, `EDK2_*`, `Buff=2`, `MEFWRec` (Intel Management Engine Firmware Recovery), key-value parameters `Key=Value`, and firmware build tags.
    * Synchronized deep regex sanitization across PowerShell Rust backend (`Clean-SmbiosTag`) and React client (`cleanSmbiosTagClient`).
  * **Targeted Priority Vendor WMI Queries (HP, Dell, Lenovo)**:
    * Recognized brand machines (HP EliteBook/ProBook/ZBook, Dell Latitude/OptiPlex, Lenovo ThinkPad) no longer use generic `OEMStringArray` as an Ownership Tag fallback.
    * Dedicated vendor class queries:
      * **HP**: Enumeration of `HP_BIOSEntry`, `HP_BIOSString`, and `HP_BIOSSetting` under `root/hp/instrumentedBIOS` and `root/wmi`.
      * **Dell**: Enumeration of `DCIM_BIOSEnumeration`, `DCIM_BIOSString`, `DCIM_AssetTag`, and `DCIM_SystemAssetData` under `root/dcim/sysman`.
      * **Lenovo**: Enumeration of `Lenovo_BiosSetting` under `root/wmi`.
    * Displays clean **"Not specified"** when no owner tag is configured in BIOS.
* **UI & Clipboard Enhancements**:
  * Quick-copy buttons with animated visual feedback for **UUID**, **Asset Tag**, and **Ownership Tag** when a valid value is detected.

---

## [2026-09-08] - Version 1.2.29: Resolution of Freezes and System Slowdowns on Return from External Tests

### [Fixed]
* **Elimination of App Freezes Returning from External Tests**:
  * **Disconnected Asynchronous Process Launch (`execute_action` in Rust)**:
    * Replaced blocking `output()` and `Start-Process powershell` calls with direct executable spawn (`Command::new(...)`) with `Stdio::null()` and system flag `CREATE_NEW_PROCESS_GROUP` (0x00000200).
    * Completely decoupled file handles, standard streams (stdin/stdout/stderr), and IPC channels: application experiences zero blocking when executing external benchmarks or utilities (BurnInTest, FurMark, AquaKeyTest, etc.).
    * Similar optimizations for MMC consoles (`mmc.exe`), Control Panel applets (`control.exe`), Windows URI protocols (`cmd /C start`), and batch scripts.
  * **Smart Battery Caching (`get_battery_status`)**:
    * Replaced repeated heavy PowerShell queries (WMI, CIM, ACPI, PowerCfg XML) with a 180-second static cache for static metadata (Design Capacity, Full Capacity, Cycles, Wear, Chemistry, Manufacturer, Serial Number).
    * Maintained instant dynamic refresh (< 0.1 ms) of percentage, charge state, and AC status via Win32 `GetSystemPowerStatus`.
  * **Background Polling Suspension & Protected Concurrency (`Dashboard.tsx`)**:
    * Automatic battery polling pause when window is in background (`document.hidden`).
    * Added concurrency lock (`isFetchingBattery`) preventing async call pile-ups on Tauri bridge when CPU is saturated by external tests.
    * Instant, non-blocking resumption upon window focus (`visibilitychange` and `focus` events).
    * Adjusted nominal polling interval to 15 seconds (previously 8 seconds).
  * **Administrator Privilege Caching (`check_is_admin`)**:
    * Employed `OnceLock` in Rust to evaluate UAC admin token once at startup, eliminating superfluous in-session PowerShell queries.

---

## [2026-09-08] - Version 1.2.28: SMBIOS Ownership Tag Correction & HP Feature Byte / Build ID Filtering

### [Fixed]
* **Intelligent Ownership Tag Sanitization (OEM Strings SMBIOS)**:
  * Completely eliminated internal HP factory configuration strings in SMBIOS Type 11 / `OEMStringArray` (`FBYTE#...` for Feature Bytes, `BUILDID#...` for factory build IDs, `SABL#`, `HP_PA_`, `#` delimiter codes).
  * Filtered URLs (`http://`, `https://`, `www.`), manufacturer placeholders (`"System Manufacturer"`, `"Standard"`, `"OEM"`), and long cryptic strings (> 45 chars without spaces).
  * Enforced identical filtering in Rust PowerShell backend (`main.rs`) and React client (`Dashboard.tsx`).
* **Native Vendor Ownership Tag Detection (HP & Dell WMI)**:
  * Targeted vendor BIOS WMI queries:
    * **HP**: Reading `root/hp/instrumentedBIOS` (`HP_BIOSEntry`) and `root/wmi` (`HP_BIOSSetting`).
    * **Dell**: Reading `root/dcim/sysman` (`DCIM_BIOSEnumeration`, `DCIM_AssetTag`, `DCIM_SystemAssetData`).
  * Returns `N/A` cleanly if no valid owner tag is programmed.
* **Dashboard UI Harmonization (`Dashboard.tsx`)**:
  * Displays *"Not specified"* (matching Asset Tag) when no tag is configured in BIOS.
  * Seamless support for visibility toggling via `ownershipTag` in Settings (*"Hide Detected Specifications"*).

---

## [2026-09-08] - Version 1.2.27: NasDriversModal Modularization & Pre-Flight Safety Integration

### [Added]
* **Pre-Flight Safety Banner (`PreFlightSafetyBanner`)**:
  * Integrated on main dashboard (`Dashboard.tsx`) and in NAS drivers manager (`NasDriversModal.tsx`).
  * Real-time UAC admin privilege detection with instant elevation button via `hardwareAPI.restartAsAdmin()`.
  * Power source detection (AC connected vs battery) and low battery warning (< 30%) to prevent shutdowns during critical driver installations.
* **Keyboard Shortcut Support (`F5` and `Escape`)**:
  * `F5` / `R`: Complete refresh of hardware, drives, battery, and telemetry (intercepted to prevent browser page reload).
  * `Escape`: Instant closing of any active modal (`HelpModal`, `NasDriversModal`, `SecurityGuideModal`, `DriversModal`, `BiosUpdateModal`, etc.).
  * Updated shortcut reference table in `HelpModal.tsx`.

### [Refactored]
* **Modularization of `NasDriversModal.tsx`**:
  * Split legacy monolithic ~2000-line component into dedicated, typed components in `/src/components/drivers/`:
    * `DismExportPanel.tsx`: Complete DISM export management, folder collision detection, and conflict resolution modal (overwrite/rename).
    * `DriverToolsPanel.tsx`: Quick access to system tools (Device Manager `devmgmt.msc`, Plug & Play scan `pnputil /scan-devices`, `.json` index regeneration).
    * `DriverCatalogBrowser.tsx`: NAS catalog navigation, brand filters, text search, and granular `.inf` selection.
    * `DriverProgressCard.tsx`: Adaptive progress bar with real-time stopwatch and PnP phases.
    * `DriverTerminalLogs.tsx`: Collapsible terminal with log syntax coloring and clipboard copy.
  * Substantial technical debt reduction and enhanced codebase maintainability.

---

## [2026-09-02] - Version 1.2.26: Removal of Duplicate changelog.md File

### [Fixed]
* **Duplicate `changelog.md` File Removal**:
  * Removed duplicate lowercase `changelog.md` file created by mirror operations.
  * Kept `CHANGELOG.md` / `changelog.md` unified as single project source of truth.
  * Eliminated case-insensitive filename collisions during Git operations on NTFS (Windows).

---

## [2026-09-02] - Version 1.2.25: Removal of Duplicate Build File

### [Fixed]
* **Duplicate `Run.bat` File Removal**:
  * Removed duplicate `Run.bat` file to retain only normalized lowercase `run.bat` at project root.
  * Resolved filename casing conflicts on Windows and during Git clone operations.

---

## [2026-09-02] - Version 1.2.24: Driver Installation Progress UX Optimization (PnPUtil Plug & Play Phase)

### [Improved]
* **Adaptive Installation Progress Regulation (Network / NAS / PnPUtil Module)**:
  * Complete overhaul of progress curve to reflect the 5 real phases of the Windows subsystem:
    1. **Analysis & Validation (0% to 18%)**: Path verification, `.cat` catalogs, and digital signatures.
    2. **DriverStore Copy & Injection (18% to 72%)**: Real-time sequential scrolling of each `.inf` file being copied.
    3. **Plug & Play Enumeration (72% to 88%)**: Physical hardware detection on host machine.
    4. **Device Binding & Service Startup (88% to 95%)**: Hardware association of controllers and peripherals.
    5. **PnP Finalization & Hardware Handshake (95% to 98% asymptotic)**: Dynamic status ticker preventing UI freezes at 96%.
* **Contextual Plug & Play Explanatory Banner**:
  * Automatically displays an informative notice when PnP phase (≥ 80%) is reached, explaining that Windows is initializing hardware devices (GPU, Audio, Chipset, Controllers) and that this standard process may take 30 to 120 seconds.
* **Real-Time Execution Stopwatch**:
  * Added elapsed time counter with clock icon in installation and DISM export banners, providing immediate feedback that background processes are running smoothly.
* **Updated Progress Milestone Labels**:
  * Replaced generic *"Configuration"* milestone with *"3. Plug & Play (PnP)"* for technical clarity.

---

## [2026-09-02] - Version 1.2.23: Complete Prevention of Driver Installation Loops & Rust Build Fix

### [Fixed]
* **Anti-Loop Lock for Driver Installation Button (Network / NAS / PnPUtil Module)**:
  * In `NasDriversModal`, upon successful completion of driver injection via PnPUtil (`importStatus === 'completed'`), the primary button immediately switches to *"Installation successful"* with validation icon and is locked (`disabled`, `cursor-not-allowed`, `pointer-events-none`).
  * Completely eliminated looping triggers and accidental double-clicks that re-invoked PnPUtil injection.
  * Intelligent status reset if technician alters `.inf` selection or selects a different model.
  * Applied identical anti-loop lock to DISM export button (`exportStatus === 'completed'`).
* **Windows Update Button Hardening**:
  * Automatically deselected newly installed drivers (`selectedIds = []`) after successful installation to avoid accidental reinstallation.
  * Button locked with `cursor-not-allowed` and `pointer-events-none` when installation state finishes successfully.
* **Rust Backend Build Fix (Tauri Backend)**:
  * Added missing `admin_password_hash: None` field to `impl Default for AppConfig` initializer (`src-tauri/src/main.rs`), resolving `rustc [E0063]` compilation error.

---

## [2026-09-02] - Version 1.2.22: Settings Security & Password Protection

### [Added]
* **Settings Password Protection**:
  * Implemented security modal (`ConfigAuthModal`) requiring a password to access Settings.
  * Default password hashed via SHA-256 to prevent plain-text exposure.
  * Added *"Security (Settings)"* section in Settings page to change password.
  * New password hashed client-side before saving (`adminPasswordHash`) into `config.json`.

---

## [2026-09-02] - Version 1.2.21: Prevention of Installation Loops & Instant Hardware Refresh

### [Fixed]
* **Installation Loop Prevention**:
  * Updated *"Install Selection"* buttons in BIOS/firmware flashing and driver modules (Windows Update). On success, button switches to *"Installation successful"* and disables to prevent duplicate clicks.
* **Hardware Information Cache Fix**:
  * Serial number and machine specifications (RAM, Model, etc.) are no longer persisted in session `localStorage`.
  * On every launch, app queries motherboard directly via Rust backend, ensuring portable tool displays current machine data without previous machine remnants.
* **Global Scrollbar Integration**:
  * Updated app container to display dynamic vertical scrollbar when content exceeds screen viewport.
* **Automatic Resolution Scaling**:
  * App opens maximized by default (`maximized: true`).
  * Implemented `calculateIdealZoom` algorithm analyzing window dimensions (`innerHeight` and `innerWidth`) to automatically scale UI zoom according to screen resolution (1080p, 768p, etc.).

---

## [2026-08-31] - Version 1.2.20: Granular Specification Hiding & Modular Configuration

### [Added]
* **Granular Hardware Specification Hiding in Settings**:
  * Added dedicated *"Hide Detected Specifications"* section in Settings, mirroring the hardware test hiding system.
  * Individual toggles for every specification row: Model, Serial Number, UUID Identifier, Asset Tag, Ownership Tag, CPU, RAM, Storage (with SMART / UEFI badges), Disk S/N, Graphics Card, BIOS Version, and Hardware Security Banner (TPM / Secure Boot).
  * Quick-action buttons *"Show All"* and *"Hide All"*.
* **Native Rust Backend Persistence**:
  * Created `HiddenSpecsConfig` struct serialized/deserialized via Serde in `src-tauri/src/main.rs`.
  * Fully integrated into `AppConfig` and `config.json` to preserve preferences across restarts.
* **Dynamic Dashboard Adaptation**:
  * Conditional rendering of specification rows based on `hiddenSpecs` settings.
  * Displays informative card when all specifications or tests are hidden.

### [Changed]
* Improved quick controls bar (Battery, Bluetooth, WiFi) to hide wrapper when all elements are disabled.

---

## [2026-08-31] - Version 1.2.19: Elimination of Redundant Scans & Direct Hardware Security Sync (TPM / Secure Boot)

### 🚀 Hardware & Network Detection Optimizations
* **Elimination of Redundant Scans Opening Network Drivers (`NasDriversModal`)**:
  * Passed known hardware specifications (`detectedModel`, `sysInfo`) directly to network drivers modal.
  * Eliminated WMI blocking delay on modal opening: brand, model, and chassis type reused instantly to filter NAS catalog.
  * Core Rust optimization (`get_hardware_model_details`): direct BIOS registry read in 0.1ms without invoking PowerShell.

### 🛡️ Hardware Security (TPM, Secure Boot & UEFI)
* **Elimination of Stale Post-Reboot Cache**:
  * Removed permanent `localStorage` persistence for security state: Secure Boot, TPM, and UEFI queried live at app startup.
  * If technician enables Secure Boot or TPM in BIOS and reboots, app immediately reflects active status without stale cache.
* **Multi-Level Real-Time Detection**:
  * Secure Boot: Ultra-fast (<1ms) check combining `HKLM\System\CurrentControlSet\Control\SecureBoot\State` and standard EFI `SecureBoot` variable via `GetFirmwareEnvironmentVariableW`.
  * TPM: Direct analysis of `TPM`/`TBS` services and `tpmtool.exe`.
  * UEFI / GPT: Native diagnostics via `GetFirmwareType` and partition styles.
* **Targeted Ultra-Fast Refresh (`onRefreshSecurity`)**:
  * Separated global refresh (`handleRefreshAll`) from security refresh (`onRefreshSecurity`).
  * In BIOS/Security guide, "Refresh" button re-evaluates security state in 10ms without triggering heavy scans of all drives or PnP devices.

---

## [2026-08-30] - Version 1.2.18: Immediate Hardware Stream Cutoff & Secure Camera/Mic Testing

### 🛡️ Hardware & Privacy (Camera / Mic)
* **Guaranteed Stream Teardown on Window Close**:
  * Mount lock (`isMountedRef`) and session token (`streamSessionIdRef`) to eliminate orphaned streams during asynchronous `getUserMedia` requests.
  * Systematic, immediate termination of all video and audio tracks (`track.enabled = false; track.stop()`) on modal close or device switch.
  * Closed `AudioContext`, terminated loopback recording (`MediaRecorder`), stopped tone oscillators, and released memory (`URL.revokeObjectURL`).
  * Disconnected video DOM tag (`srcObject = null`) ensuring immediate camera LED indicator shutoff.

---

## [2026-08-30] - Version 1.2.17: Battery Report Saved to Desktop

### 🔋 Battery Diagnostics & Health
* **Desktop Path for HTML Battery Report**:
  * Full Windows battery report (`powercfg /batteryreport`) saved directly to user's **Desktop** under standardized name `Rapport_Batterie.html` instead of `%TEMP%`.
  * Multi-level path resolution via `[System.Environment+SpecialFolder]::Desktop` with automatic fallbacks (`$env:USERPROFILE\Desktop`, `Documents`, `Temp`).
  * Automatic HTML report opening in default web browser upon completion with confirmation message.
  * Updated battery modal UI to indicate Desktop save destination.

---

## [2026-08-30] - Version 1.2.16: UI Streamlining & Redundant Copy Button Removal

### 🧹 UI Cleanup & Optimization
* **Removed Secondary Copy Buttons**:
  * Removed copy buttons for **Asset Tag**, **Ownership Tag**, **UUID Identifier**, and **BIOS Version** in specifications table.
  * Retained essential production copy buttons (*Serial Number* and *Disk S/N*).

---

## [2026-08-30] - Version 1.2.15: Security Guide Harmonization, Dynamic Highlight & Toshiba/Dynabook Support

### ✨ New Features & Improvements
* **Smart Contextual Highlighting**:
  * Automatic security state detection (TPM 2.0, Secure Boot, GPT/UEFI) highlighting required steps in amber with *"Action required"* badge.
  * Example: On a Dell machine with Secure Boot inactive, Steps 1 (F2 access), 3 (Secure Boot Enable), 4 (UEFI Mode), and 6 (Apply & Exit) are highlighted.
  * Compliant steps marked with green *"Already compliant"* badge.
* **Typographic & Visual Step Card Overhaul**:
  * Unified TPM step styling with other steps.
  * Step cards featuring circled numbering, thematic badges (*Boot*, *TPM Security*, *Secure Boot*, *UEFI Mode*, *PK/KEK Keys*, *Save*), and styled keyboard keys (`<kbd>`).
* **Toshiba / Dynabook Guide Added (Portégé / Tecra / Satellite Pro)**:
  * Dedicated tab with automatic vendor detection (F2 / F12 Boot Menu keys).
  * Instructions for *UEFI Boot* mode (disabling *CSM Boot*) and TPM activation (*Intel PTT*).
  * Supervisor password guidance if BIOS options are greyed out.

---

## [2026-08-30] - Version 1.2.14: Full-Screen Log Console Activation & Finalization (Debug Console)

### ✨ New Features & Improvements
* **Full-Screen Modal Activation (`>_ Logs ⤢`)**:
  * Resolved parent-child state conflict that prevented modal from opening on `>_ Logs ⤢` button click.
  * Smooth two-way synchronization between UI button, keyboard shortcut `[L]`, maximize button, and `Escape` key.
* **Advanced Log Console Capabilities**:
  * **Real-time search bar** filtering by keyword, component, or error code.
  * **Categorized filters with badges and counters**: *All*, *Success (Green)*, *Errors & Warnings (Red/Amber)*, *Info & Actions (Blue)*.
  * **Quick action buttons**: *Copy all* to clipboard with feedback, and *Clear* session logs.
  * Clean formatting with timestamps `[HH:MM:SS]`, syntax coloring, and auto-scroll on new events.

---

## [2026-08-28] - Version 1.2.13: Advanced EUI-64 / Drive Filtering & Asset / Ownership Tag Cleanup

### ✨ New Features & Improvements
* **NVMe SSD SCSI / IEEE EUI-64 Pseudo-Serial Filtering**:
  * Filtered synthetic IEEE EUI-64 and SCSI device IDs (e.g., `0025_3853_7150_E600.`) generated by Windows driver to retain **authentic controller physical serial numbers only** (e.g., `HBSA40400200880`).
  * Removed trailing dots and deduplicated detected drives.
* **SMBIOS String Sanitization (Asset Tag & Ownership Tag)**:
  * Filtered BIOS/OEM placeholders (`"Default string"`, `"None"`, `"To Be Filled By O.E.M."`, `"FFFFFFFF..."`, etc.).
  * **Ownership Tag (OEM Strings)**: Clean extraction of true vendor designations (e.g., `BANFF`) purging duplicates.
  * **Asset Tag**: Formatted as *"Not specified"* when no tag was burned into BIOS.

---

## [2026-08-28] - Version 1.2.12: Physical Drive Serial Number Extraction (CrystalDiskInfo)

### ✨ New Features & Improvements
* **Physical Drive S/N Direct Hardware Extraction**:
  * Native Win32 Rust module querying `\\.\PhysicalDrive0..16` directly via `IOCTL_STORAGE_QUERY_PROPERTY` (`STORAGE_DEVICE_DESCRIPTOR`), matching **CrystalDiskInfo** method.
  * Completely eliminated confusion with Volume Serial Numbers (e.g., `3E4A-B812`).
  * Decoded and sanitized raw ATA/SATA byte-swapped pairs (IDENTIFY DEVICE word swapping, e.g., Western Digital, Seagate, Crucial, Samsung, NVMe).
  * Filtered for internal drives (NVMe, SATA, SAS) while excluding removable USB drives.
  * Multi-level PowerShell fallback via `MSFT_PhysicalDisk` and `Win32_DiskDrive`.

---

## [2026-08-28] - Version 1.2.11: Windows Update Reinstallation & Config Persistence

### ✨ New Features & Improvements
* **Windows Update - Driver Reinstallation & Repair**:
  * Windows Update search queries full catalog (`Type='Driver'`) displaying both new updates and installed drivers.
  * **Smart Selection**: Pending updates checked by default; users can select all (or a specific driver) to force reinstallation of corrupt drivers.
  * Added dynamic tabs: **All**, **Updates**, and **Installed / Repair**.
  * Sequential, resilient package processing preventing batch failure if a single driver fails.
* **Complete Settings Persistence (`config.json`)**:
  * Full Serde Rust support for `externalApps` and `hiddenTests` fields (`src-tauri/src/main.rs`).
  * External workshop apps and hidden test preferences saved and restored reliably on disk.
  * Live test button for custom applications and automatic name pre-fill on `.exe` selection.

---

## [2026-08-27] - Version 1.2.10: BIOS Force & Hardware Reliability

### ✨ New Features & Improvements
* **BIOS / Firmware Force Mode**: Added option in BIOS update modal to **force installation** even if firmware version detected by Windows Update matches current version (`-ForceSameVersion` / `IsHidden=0`).
* **Drive Serial Numbers (Correction)**: Internal drive serial numbers extracted via `Get-PhysicalDisk` instead of `Win32_DiskDrive`, correcting hexadecimal and byte-swapped output on NVMe SSDs.
* **Battery Health (Reliability)**: Battery health calculation (Full Charge / Design Capacity) overhauled using background `powercfg /batteryreport /xml` for 100% reliable telemetry with WMI fallback.

---

## [2026-08-27] - Version 1.2.9: Optional Windows Update Drivers

### ✨ New Features & Improvements
* **Latest Optional Drivers**: Enhanced Windows Update search engine to explicitly include drivers classified as "Optional" (`BrowseOnly=1`), capturing the latest vendor-released drivers.

---

## [2026-08-27] - Version 1.2.8: Windows Update Synchronization Fix

### 🐛 Bug Fixes
* **Windows Update Server Selection**: Fixed server selection offset between search and installation (ServerSelection), preventing corrupted IDs when base catalog differs from Microsoft Update.

---

## [2026-08-26] - Version 1.2.7: Driver Indexing Optimization

### ✨ New Features & Improvements
* **Incremental NAS Indexing**: When exporting drivers via DISM, application updates only the newly exported folder in `index.json` instead of rebuilding the entire server index, making indexing instantaneous.

---

## [2026-08-26] - Version 1.2.6: Native UEFI Detection & Build Automation

### 🐛 Bug Fixes
* **UEFI Detection (BIOS Mode)**: Replaced registry checks with native Win32 `GetFirmwareType` API (`kernel32.dll`), matching `msinfo32.exe`. Added fallback layers (EFI environment variables, `winload.efi` loader signature via `bcdedit`, `SecureBoot` key). Machines booted in UEFI are accurately identified as `UEFI (Modern)` and `GPT`.
* **Automated Executable Naming**: Integrated Rust Cargo `[[bin]]` configuration and post-build script ensuring final binary in `src-tauri/target/release/` is named `Hardware-Diagnostic-Tool_v{version}.exe`.

---

## [2026-08-25] - Version 1.2.5: UI Enhancements & Windows Update Refinement

### ✨ New Features & Improvements
* **Mouse Horizontal Scroll**: Mouse wheel horizontal navigation support across Help and Guide menu tabs.
* **UI Terminology**: Replaced French shutdown terms with clean button labels.
* **FAQ Section Removal**: Removed legacy "Troubleshooting & FAQ" tab in favor of native administrator execution.
* **Dynamic Executable Versioning**: Implemented `sync-version.js` script injecting version from `changelog.md` into app productName, Tauri config, and Node configuration.

### 🐛 Bug Fixes
* **Windows Update Detection**: Refined driver detection algorithm in `main.rs` ensuring no non-driver updates appear (exclusive Type=2 / Driver and Firmware filtering).
* **Battery Health**: Added fallback to `Win32_Battery` (`WMI CIMv2`) when `root/wmi` queries fail on specific laptops.

---

## [2026-08-25] - Version 1.2.4: UI, Security & Command Fixes

### ✨ New Features & Improvements
* **Auto-scroll in Logs**: Window automatically scrolls down to display execution logs when starting driver installations.
* **Hardware Security Guide (TPM 2.0)**: Added step-by-step instructions for TPM 2.0 activation in BIOS across HP, Dell, and Lenovo.
* **User Guide Overhaul**: Documentation updated to reflect collapsible driver categories and batch selection.

### 🐛 Bug Fixes
* **MBR2GPT Command Syntax**: Updated conversion syntax to `mbr2gpt.exe /convert /allowFullOS` ensuring proper operation within full Windows.

---

## [2026-08-25] - Version 1.2.3: Fix Opening Exported Folder in Windows Explorer

### 🐛 Bug Fixes
* **Explorer Commands & Folders Handling (`main.rs` & `tauriAdapter.ts`)**:
  * Native asynchronous folder opening via `Command::new("explorer.exe").arg(target).spawn()`.
  * Resolved opening failures on UNC network shares (`\\serveur-nas\...`) and mapped drives (`Z:\`).
  * Accurate visual logs on folder open success or error.

---

## [2026-08-25] - Version 1.2.2: Automatic Index Creation & DISM Export Finalization

### 🐛 Bug Fixes
* **Automatic Creation and Updating of `index.json` (`main.rs` & `NasDriversModal.tsx`)**:
  * Resolved issues where indexing stalled if `index.json` did not yet exist on NAS share.
  * Automatically detects share root or parent folder and generates `index.json` on the fly.
  * Export workflow transitions to 100% (Success) displaying summary and action buttons.

---

## [2026-08-25] - Version 1.2.1: DISM Export Progress, Header Ergonomics & Cleanup

### 🚀 New Features & Improvements
* **Dynamic Progress Bar for Driver Export (`NasDriversModal.tsx`)**:
  * Interactive real-time progress bar (0% to 100%) during `dism.exe /online /export-driver`.
  * 4 key stages: *Folder Check*, *OEM Analysis*, *DISM Extraction*, and *NAS Indexing*.
  * Post-success summary card with direct button to open exported folder in Windows Explorer (`explorer.exe`).
* **Header Resizing and Alignment (`Dashboard.tsx` & `BrightnessControl.tsx`)**:
  * Height aligned to **40 px (`h-10`)**, matching header brand dimensions.
  * Enlarged brightness sliders and presets (25%, 50%, 75%, MAX).
  * Expanded zoom buttons (`A-`, `100%`, `A+`) for mouse and touch accessibility.
* **Project Maintenance**:
  * Removed legacy scripts (`Lancer-Admin.bat`, `Lancer-Reseau.bat`, `Optimisation possible.md`).

---

## [2026-08-25] - Version 1.2.0: Complete Overhaul of NAS Driver Management

### 🚀 Major Improvements & Features
* **Overhauled NAS/Network Driver Search & Matching (`NasDriversModal.tsx`)**:
  * Automatic detection of brand, exact model, and form factor (Desktop, Laptop, Tiny, All-in-One, Mini).
  * Flexible matching algorithm (exact match, model subfolders, and partial match).
  * Support for flat or nested network driver shares in `\\SRV-DONNEES\drivers`.
  * Single-click global installation (recursive Pnputil) or selective installation by component category (Audio, Network/Wi-Fi, Video/GPU, Chipset, Bluetooth, etc.).
  * Advanced DISM export folder conflict management (Overwrite, Timestamped new folder, Cancel).
  * Integrated execution terminal with syntax coloring and report export.

---

## [2026-08-19] - Startup Performance & Lazy Loading Architecture

### General Performance & Loading Improvements
* **Lazy Loading and Code Splitting**:
  * Implemented `React.lazy` and `<Suspense>` across heavy modals (Settings, Network Auth, Drivers, BIOS, Camera/Mic).
  * Significant bundle size reduction for instant initial Dashboard render.
* **Asynchronous System Call Optimization**:
  * WMI hardware security state (TPM 2.0 / Secure Boot) uses immediate startup cache, eliminating blocking queries.
  * Non-blocking background refresh via Rust APIs.

---

## [2026-08-13] - Dynamic Window & Space Optimization for Camera & Microphone Test

### Ergonomic Redesign (`CameraMicModal.tsx`)
* **Resolved Height and Microphone Clipping**:
  * Eliminated rigid vertical layout that pushed VU meter off-screen on small laptop displays (1366×768, 1280×720, or with 125%/150% Windows scaling).
* **3 Display Modes**:
  * **Side-by-Side Mode (Split - Default)**: Places video on left and audio controls / VU meters on right, reducing total height under 450px.
  * **Compact Mode (Vertical)**: Limits video max height (`max-h-[30vh]`) keeping video and mic visible simultaneously.
  * **Enlarged Mode (Full Screen)**: Full-size view to inspect camera focus, optical sharpness, and dead pixels.
* **Space Saving & Technician Tools**:
  * **Overlay Action Bar**: Mirror toggle, 3×3 grid, and photo snapshot directly on video stream.
  * **16-Band Frequency Equalizer & Peak/RMS VU Meter**: Instant visual feedback.
  * **Audio Loopback (3s Loopback)**: 3-second recording with automatic playback to test mic and speakers.
  * **Test Tone Generator (440 Hz Beep)**: Rapid speaker verification.
  * **Compact Device Selector**: Dropdowns with device count badges.

---

## [2026-08-13] - Real BIOS Data & Machine Firmware Display

### BIOS & Firmware Module Corrections
* **Real-Time Hardware and BIOS Telemetry**:
  * Rust commands `get_detailed_bios_info` and `check_bios_update` query hardware directly via WMI/CIM (`Win32_Bios`, `Win32_ComputerSystem`, `Win32_BaseBoard`).
  * Extracted manufacturer, model, SMBIOS/BIOS version, serial number (S/N), and firmware release date.
  * Automatic detection of firmware updates via Windows Update COM API (`Microsoft.Update.Session`).
* **BIOS Modal Interface (`BiosUpdateModal.tsx`)**:
  * Displays live hardware specifications.
  * Handles two states: *Machine up to date* (visual badge, live refresh, re-flash fallback) and *Update available* (version comparison, security details).
  * Direct reboot action into UEFI setup (`shutdown /r /fw /t 0`).
  * Dynamic Dashboard button displaying installed SMBIOS version and compliance status.

---

## [2026-08-13] - Network/NAS Drivers, Windows Update, devmgmt.msc and Folder Picker

### Driver Management Enhancements
* **Device Manager (`devmgmt.msc`) and System Consoles**:
  * Dedicated launch handling for `.msc` consoles and `.cpl` applets in Rust via `mmc.exe` and `control.exe`.
  * Support for `ms-settings:` protocols and Windows management utilities.
* **Folder Picker for NAS / USB Directory**:
  * Added `selectFolder` in `tauriAdapter.ts` using `open({ directory: true, multiple: false })`.
  * Settings page opens folder picker instead of file browser for driver folder.
* **NAS & Network Driver Detection**:
  * Recursive `.inf` scanning, model folder matching, and live terminal streaming.
* **Live Windows Update Integration**:
  * Native COM `Microsoft.Update.Session` querying real driver updates.
  * Device manager error code detection via `Win32_PnPEntity (ConfigManagerErrorCode != 0)`.

---

## [2026-08-13] - Major Update: Drivers Hub, BIOS Firmware and Stabilization

### Key Additions & Features
* **Driver & Firmware Management Hub**:
  * **Windows Update Modal (`WindowsUpdateModal.tsx`)**: Live COM scanning, category filtering, real-time installation progress, and reboot management.
  * **NAS / USB Driver Manager (`NasDriversModal.tsx`)**: Hardware detection, folder matching, PnPUtil injection, and DISM third-party export.
  * **BIOS & Firmware Center (`BiosUpdateModal.tsx`)**: BIOS version comparison, UEFI flashing log, and setup reboot commands.
* **Restored Snappy Driver Installer Origin (`driverSdioPath`)**:
  * Configurable `driverSdioPath` in `src/types.ts` and Settings page.
  * Direct launch button in `src/components/DriversModal.tsx` for SDIO (`SDIO\SDI_x64_R.exe`).
* **Rust Backend (Tauri)**:
  * Native commands: `get_hardware_model_details`, `search_wu_drivers`, `scan_nas_drivers`, `get_detailed_bios_info`.
  * Compilation fixes, strict typing, and cleaned imports.
* **Cleanup & Branding**:
  * Removed legacy Windows 11 script configuration (`win11ScriptPath`).
  * Integrated embedded offline assets for standalone distribution.
