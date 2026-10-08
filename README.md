# Production Tool — Hardware Diagnostic & Configuration Suite

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg?logo=tauri)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg?logo=rust)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Built with Google AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-4285F4.svg?logo=google)](https://aistudio.google.com/)
[![Windows 10 / 11](https://img.shields.io/badge/Platform-Windows_10_%2F_11_(x64)-0078d4.svg?logo=windows)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

A high-performance, native hardware diagnostic, configuration, and driver deployment utility engineered for computer workshop technicians, IT refurbishing lines, and system maintenance.

Developed with **Google AI Studio** and built on **Tauri v2 (Rust + WebView2)** and **React 19**, the application compiles into both an ultra-lightweight **standalone Portable executable** (`dist/1_portable/Production-Tool_v{version}_Portable.exe`) and **official Windows Installers** (`dist/2_installer/Production-Tool_v{version}_Installer.exe` / `.msi`).

---

## Key Features

### 🖥️ Hardware Telemetry & Specification Discovery
- **Comprehensive System Overview**: Motherboard manufacturer, computer model, chassis form factor, processor (CPU), RAM, storage devices, graphics controller (GPU), SMBIOS/BIOS version, firmware release date, and unique system UUID.
- **Physical Drive Serial Numbers**: Queries physical drives via direct Win32 `IOCTL_STORAGE_QUERY_PROPERTY` commands (matching **CrystalDiskInfo** standards) with ATA/SATA byte-swapped pair decoding. Distinguishes authentic controller serials from Windows volume labels or synthetic SCSI IDs.
- **WMI Vendor Sanitization**: Targeted WMI querying for HP (`root/hp/instrumentedBIOS`), Dell (`root/dcim/sysman`), and Lenovo (`root/wmi`). Automatically purges firmware placeholders, EDK2 artifacts, and factory build strings from Asset Tags and Ownership Tags.
- **Instant Clipboard Actions**: Individual copy buttons with animated feedback for hardware model, serial number, drive serials, and system tags.

### 🛡️ Hardware Security & Windows 11 Compliance
- **Real-Time Security Audit**: Live multi-tier detection of **TPM 2.0** (`TPM`/`TBS` services and `tpmtool.exe`), **Secure Boot** (`HKLM` registry and standard EFI `SecureBoot` NVRAM variable), and **UEFI / GPT** partition styles via native `GetFirmwareType` API calls.
- **Setup Mode Diagnostics**: Live detection of UEFI `SetupMode` (`SetupMode = 1`) when Secure Boot keys have been erased in NVRAM, alerting technicians with clear guidance to restore factory keys.
- **Manufacturer-Specific BIOS Guides**: Interactive, bilingual walk-throughs for **HP** (ProBook / EliteBook), **Dell** (Latitude / OptiPlex / Precision), **Lenovo** (ThinkPad / ThinkCentre), **Toshiba / Dynabook** (Portégé / Tecra), and **General / Asus / Acer** boards.
- **Smart Contextual Highlighting**: Automatically highlights non-compliant steps in amber with *"Action required"* badges and flags already-configured settings with *"Already compliant"* badges.
- **Lossless Disk Conversion**: Integrated guide and copyable syntax for Windows `mbr2gpt.exe /convert /allowFullOS`.

### 🔋 Battery Health & Power Telemetry
- **5-Second Rolling Moving Average**: Background sampling every 1 second (`1000 ms`) with continuous 5-second smoothing (`windowMs = 5000`) for charge percentage, charge power (+Watts), discharge rate (-Watts), and time estimates.
- **Dynamic Duration Forecasting**: Calculates remaining runtime during discharge (`~X h Y min remaining`) and time required to reach full charge (`Full in ~XhYm`).
- **Detailed Controller Diagnostics**: Cycle count, design capacity, full charge capacity, wear level percentage, battery chemistry, voltage, and serial number.

### 📦 Driver Hub (NAS / Network & PnPUtil)
- **Automatic Model Matching**: Recursively scans network shares (e.g., `\\serveur-nas\Tech\Drivers`) or local USB media to automatically locate matching model driver packages.
- **Silent PnPUtil Driver Injection**: Injects `.inf` packages directly into the Windows DriverStore via `pnputil.exe /add-driver *.inf /subdirs /install`.
- **Realistic 5-Phase Progress Tracker**: Accurately tracks DriverStore copying, device binding, and Plug & Play hardware handshakes with a live stopwatch and anti-looping button protection.
- **DISM Third-Party Driver Export**: Exports all installed third-party drivers into a deployable folder using `dism.exe /online /export-driver` with folder conflict detection and instant indexing (`index.json` caching in < 100 ms).
- **Fast System Tool Access**: Direct launching of Device Manager (`devmgmt.msc`) and PnP hardware scans (`pnputil /scan-devices`).

### 🔄 Windows Update Driver & Firmware Management
- **Microsoft Update COM Session**: Native integration with `Microsoft.Update.Session` querying drivers, firmware updates, and optional driver rollouts (`BrowseOnly=1`).
- **Selective Installation & Repair Mode**: Automatically selects pending updates while allowing technicians to select installed drivers to force reinstallation and repair malfunctioning devices.
- **Resilient Batch Processing**: Sequential installation prevents an entire batch from failing if a single driver throws an error.

### ⚡ BIOS & Firmware Flashing Center
- **Dual-Mode Workflow**:
  1. **Automatic Mode**: Scans and installs certified UEFI capsule firmware via Windows Update.
  2. **Manual Mode**: Allows selecting local or network vendor executables (`.exe`), capsules (`.inf`, `.cap`, `.bin`, `.rom`, `.bio`, `.fd`), or deployment scripts (`.bat`, `.cmd`, `.ps1`).
- **Elevated Execution**: Automatically launches vendor flash utilities with administrative elevation (`RunAs`).
- **Safety Interlocks**: Enforces AC power connection and warns against flashing on low battery.
- **Reboot Automation**: Provides direct actions to restart into UEFI BIOS setup (`shutdown /r /fw /t 0`) or schedule automatic reboot countdowns.

### 🧪 Diagnostic Suite
- **Screen Test**: Dead pixel tester with full-screen solid RGB, white, and black color sweeps with keyboard/mouse navigation.
- **Camera & Microphone Diagnostics**: Live video preview, mirror toggle, 3×3 framing grid, snapshot capture, 16-band audio equalizer, 3-second audio loopback test, 440 Hz test tone, and 3 ergonomic window layouts (Split View, Compact, Full-Screen).
- **Immediate Hardware Cutoff**: Guaranteed release of all media streams, audio contexts, and camera LED indicators upon modal closure.

### 📋 Live Event Log & Execution Terminals
- **Integrated Debug Console**: Live terminal logging system events, network authentication, PnPUtil outputs, DISM progress, and execution codes.
- **Smart Filtering & Search**: Categorized filters (*All*, *Success*, *Errors & Warnings*, *Info & Actions*) with live search and timestamping.
- **Bilingual Log Translator**: Dynamic translation of system messages, execution statuses, and action labels in real time.
- **Clipboard Sync**: Copies formatted logs with tags and timestamps in the active language.

### ⚙️ Security & Customization
- **Password-Protected Settings**: Admin configuration locked behind SHA-256 password authentication (default password: `admin`).
- **Configurable Default Language**: Set the default starting language (`en` or `fr`) in Settings to automatically initialize the interface upon boot.
- **Granular Specification Hiding**: Customize which hardware rows are visible on the dashboard to streamline technician workflows.
- **External Workshop Apps**: Register custom external diagnostic or testing utilities (e.g., BurnInTest, FurMark, CPU-Z, SDIO) with direct testing buttons.
- **Bilingual Interface**: Full English and French localization with instant live session toggling in the header bar.

---

## System Requirements

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10 (Build 1809+ x64) / Windows 11 | Windows 10 / 11 64-bit |
| **Processor** | Intel Core 2 Duo / AMD Athlon 64 | Modern Dual-Core / Quad-Core |
| **RAM** | 2 GB RAM | 4 GB+ RAM |
| **Storage** | 150 MB free disk space | 500 MB free disk space |
| **Privileges** | Standard User (Auto-elevates to Administrator) | Administrator rights for driver/DISM features |
| **Dependencies** | Microsoft WebView2 Runtime (Built-in on Win 10/11) | Pre-installed |

---

## User Guide & Operations Manual

A detailed, step-by-step operational guide covering all technician workflows, BIOS unlock walk-throughs, battery telemetry, and driver deployment is available in:
👉 **[USER_GUIDE.md](USER_GUIDE.md)**

---

## Quick Start (One-Click Build Script)

The repository includes an all-in-one automation script: **`run.bat`**.

Right-click **`run.bat`** and choose **Run as administrator** (or double-click it; the script auto-elevates):

```bat
run.bat
```

### What `run.bat` Performs Automatically:
1. **UAC Elevation**: Automatically requests administrative privileges if needed.
2. **Prerequisite Verification & Silent Auto-Installation**:
   - Checks for **Node.js LTS** (installs automatically via `winget` if missing).
   - Checks for **Rust & Cargo** (installs automatically via `winget` or downloads `rustup-init.exe` if missing).
   - Verifies **C++ Build Tools (MSVC)** environment.
3. **Version Synchronization**: Reads the latest version tag from `changelog.md` and synchronizes `package.json`, `tauri.conf.json`, and `Cargo.toml`.
4. **Dependency Installation**: Runs `npm install` cleanly.
5. **Icon Generation**: Generates native Windows `.ico`, macOS `.icns`, and multi-resolution PNG icons from `app-icon.png`.
6. **Frontend Compilation**: Builds the React 19 / Vite bundle into `/dist`.
7. **Native Tauri Compilation & Packaging (`Production-Tool`)**:
   - Generates the **Portable Executable**: `dist/1_portable/Production-Tool_v{version}_Portable.exe`
   - Generates the **Windows Installers** (.exe & .msi): `dist/2_installer/Production-Tool_v{version}_Installer.exe` and `.msi`
   - Automatically organizes both distribution packages into their respective subfolders in `dist/`.

---

## Manual Development & CLI Workflow

If you prefer building and developing through standard developer tooling:

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js (LTS v18+)](https://nodejs.org/)
- [Rust & Cargo (v1.75+)](https://rustup.rs/) configured with `x86_64-pc-windows-msvc`
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### 2. Installation
Clone the repository and install npm packages:

```bash
git clone https://github.com/example/hardware-diagnostic-tool.git
cd hardware-diagnostic-tool
npm install
```

### 3. Development Server
Run the web development server (browser preview mode):

```bash
npm run dev
```
The preview runs at `http://localhost:3000` with simulated hardware controller responses.

To launch the native desktop application in hot-reloading development mode:

```bash
npm run tauri:dev
```

### 4. Code Quality & Type Checking
Verify TypeScript types and syntax:

```bash
npm run lint
```

### 5. Production Build
Synchronize version information, build the frontend, and compile the native Windows executable:

```bash
npm run tauri:build
```

The resulting executables will be compiled and organized by `post-build.js` into `dist/1_portable/` and `dist/2_installer/`.

---

## Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| `F5` / `R` | **Full Refresh**: Reloads hardware specifications, drives, battery status, and security compliance. |
| `L` | **Log Console Toggle**: Expands/collapses the event log drawer or toggles the full-screen modal. |
| `F` | **Firmware & BIOS Hub**: Directly opens the BIOS / Firmware Update Center. |
| `P` | **Driver Manager**: Opens the Driver Hub (NAS / PnPUtil / Windows Update). |
| `E` | **Screen Test**: Opens the full-screen dead pixel diagnostic tester. |
| `C` | **Camera & Mic Test**: Opens live audio/video hardware test dialog. |
| `K` | **Keyboard Test**: Launches external keyboard tester (e.g. AquaKeyTest). |
| `S` | **Sound Test**: Opens Windows sound configuration panel (`mmsys.cpl`). |
| `B` | **Battery Diagnostic**: Opens detailed battery health and moving average telemetry. |
| `T` | **BurnIn Test**: Launches CPU/GPU stress test utility. |
| `Escape` | **Close Modal**: Instantly dismisses any open dialog or modal window. |
| `?` / `H` | **Help & Guide**: Opens the comprehensive integrated User Guide and Workflow documentation. |
| `A+` / `A-` / `100%` | **Interface Scaling**: Quick presets for UI zoom and accessibility adjustment. |

---

## Project Structure

```
├── dist/
│   ├── 1_portable/             # Standalone portable binaries (Production-Tool_v{version}_Portable.exe)
│   └── 2_installer/            # Official Windows setup installers (.exe and .msi)
├── run.bat                     # All-in-one UAC elevation, prerequisite installer & build script
├── sync-version.js             # Automated version synchronizer from changelog.md
├── post-build.js               # Post-build packaging script for Portable & Installer binaries
├── changelog.md                # Single project source of truth for version history
├── package.json                # Project dependencies and script definitions
├── vite.config.ts              # Vite 6 configuration (Tailwind CSS v4 & React plugin)
├── index.html                  # HTML entry point with system fonts
├── app-icon.png                # Master source icon for application generation
├── src/
│   ├── main.tsx                # React application bootstrap with LanguageProvider
│   ├── App.tsx                 # Core app container, initialization, and layout
│   ├── types.ts                # TypeScript data models and interface definitions
│   ├── hooks/
│   │   └── useBatteryMonitor.ts # High-precision 1s sampling & 5s moving average hook
│   ├── i18n/
│   │   └── LanguageContext.tsx  # Dynamic translation dictionary & language toggle (EN/FR)
│   ├── lib/
│   │   ├── tauriAdapter.ts      # Multi-platform hardware abstraction layer & mock simulator
│   │   ├── logTranslator.ts     # Real-time bilingual log message translation engine
│   │   └── pathValidator.ts     # UNC and local filesystem path validation
│   └── components/
│       ├── Dashboard.tsx        # Main application dashboard and hardware telemetry grid
│       ├── BrightnessControl.tsx# Compact hardware display brightness slider
│       ├── DebugLogViewer.tsx   # Collapsible & full-screen live event log viewer
│       ├── BatteryHealthModal.tsx# Real-time battery diagnostics and 5-second moving average telemetry
│       ├── SecurityGuideModal.tsx# Step-by-step BIOS hardware security unlock procedures
│       ├── WindowsUpdateModal.tsx# Windows Update COM driver and firmware updater
│       ├── BiosUpdateModal.tsx  # Dual-mode automatic & manual BIOS firmware flasher
│       ├── ScreenTestModal.tsx  # Full-screen dead pixel diagnostic tester
│       ├── CameraMicModal.tsx   # Audio/video hardware testing suite & frequency equalizer
│       ├── HelpModal.tsx        # Interactive user manual and technical guide
│       ├── ConfigPage.tsx       # Configuration editor, password authentication & app shortcuts
│       └── drivers/             # Modular NAS & DISM driver management subsystem
│           ├── DriverCatalogBrowser.tsx # Model folder navigation & .inf file browser
│           ├── DismExportPanel.tsx      # DISM driver export & conflict resolver
│           ├── DriverProgressCard.tsx   # Adaptive 5-stage PnP progress bar
│           ├── DriverTerminalLogs.tsx   # Collapsible PnPUtil/DISM execution terminal
│           ├── DriverToolsPanel.tsx     # Device Manager & PnPUtil trigger buttons
│           └── PreFlightSafetyBanner.tsx# UAC rights and AC power safety banner
└── src-tauri/
    ├── Cargo.toml               # Rust backend configuration & dependencies
    ├── tauri.conf.json          # Tauri application settings, window properties & bundles
    ├── icons/                   # Generated application icons (.ico, .icns, PNGs)
    └── src/
        └── main.rs              # Native Rust commands (WMI, ACPI, Win32 APIs, PnPUtil, DISM)
```

---

## Configuration & Network Deployment

The tool persists settings inside `config.json` (stored alongside the executable in portable mode):

```json
{
  "nasDriversPath": "\\\\serveur-nas\\Tech\\Drivers",
  "driverSdioPath": "SDIO\\SDI_x64_R.exe",
  "adminPasswordHash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  "defaultLanguage": "en",
  "networkAuth": {
    "path": "\\\\serveur-nas\\Tech",
    "user": "tech",
    "pass": "********"
  },
  "hiddenSpecs": {
    "ownershipTag": false,
    "uuid": false
  },
  "hiddenTests": {
    "camera": false,
    "screen": false
  }
}
```

- **Default Starting Language**: Configurable startup language (`"en"` or `"fr"`), loaded immediately on application launch.
- **NAS Driver Share**: Configured by default to point to `\\serveur-nas\Tech\Drivers` or local USB media.
- **Protected Access**: Settings are password-protected with client-side SHA-256 hashing (default password: `admin`).
- **Portability**: Relative paths are fully supported for standalone execution from portable storage drives.

---

## Contributing & Changelog

All notable updates and releases are meticulously documented in [changelog.md](changelog.md). When introducing changes, update the version in `changelog.md` and run `node sync-version.js` to propagate the version across `package.json`, `tauri.conf.json`, and `Cargo.toml`.

---

## Acknowledgements

This application was developed with **Google AI Studio**.

---

## License

This project is licensed under the MIT License. All rights reserved.
