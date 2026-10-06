# Hardware Diagnostic & Update Tool — User Guide & Operations Manual

Welcome to the **Hardware Diagnostic & Update Tool** operational manual. This guide is designed for workshop technicians, IT system administrators, and refurbishment specialists to effectively diagnose hardware, audit Windows 11 readiness, deploy drivers, flash firmware, and run comprehensive component tests.

---

## Table of Contents

1. [Quick Start & Launch Options](#1-quick-start--launch-options)
2. [Recommended Workshop Workflow](#2-recommended-workshop-workflow)
3. [Interface Tour & Global Controls](#3-interface-tour--global-controls)
4. [Hardware Telemetry & Specifications](#4-hardware-telemetry--specifications)
5. [Hardware Security Audit & Windows 11 Readiness](#5-hardware-security-audit--windows-11-readiness)
6. [Battery Health & Power Telemetry](#6-battery-health--power-telemetry)
7. [Driver Deployment Hub (NAS & PnPUtil)](#7-driver-deployment-hub-nas--pnputil)
8. [Windows Update Driver & Firmware Management](#8-windows-update-driver--firmware-management)
9. [BIOS & UEFI Firmware Flashing Center](#9-bios--uefi-firmware-flashing-center)
10. [Hardware Diagnostics & Testing Suite](#10-hardware-diagnostics--testing-suite)
11. [Event Logs & Console Viewer](#11-event-logs--console-viewer)
12. [Settings, Security & Custom Utilities](#12-settings-security--custom-utilities)
13. [Technician Keyboard Shortcuts](#13-technician-keyboard-shortcuts)
14. [Troubleshooting & Frequently Asked Questions](#14-troubleshooting--frequently-asked-questions)

---

## 1. Quick Start & Launch Options

The application is distributed in multiple convenient formats depending on your workshop environment:

### A. Standalone Portable Executable (`.exe`)
- **No installation required**: Copy `Production-Tool_v{version}_Portable.exe` (found in `/dist/1_portable/`) to a USB flash drive or network share.
- **Direct execution**: Double-click the `.exe`. The application automatically requests UAC Administrator privileges when launched.
- **Portability**: All settings are automatically loaded from and saved to a local `config.json` next to the executable.

### B. Windows Setup Installers (`.exe` / `.msi`)
- Located in `/dist/2_installer/` (`Production-Tool_v{version}_Installer.exe` and `Production-Tool_v{version}_Installer.msi`).

### C. One-Click Setup & Build Script (`run.bat`)
For technicians setting up fresh workshop machines or building from source:
1. Right-click `run.bat` in the project root and select **Run as administrator**.
2. `run.bat` automatically:
   - Detects and installs **Node.js LTS** and **Rust / Cargo** (via winget or official installer) if missing.
   - Verifies the MSVC C++ Build Tools environment.
   - Synchronizes version numbers from `changelog.md`.
   - Runs `npm install` and generates app icons.
   - Builds both the **Portable Executable** and the **Windows Installer**.

### C. Web Browser Simulator Mode
To test the interface in a standard browser without native Windows APIs:
```bash
npm run dev
```
Navigate to `http://localhost:3000`. The integrated simulation layer mocks all hardware queries, battery sensors, and driver injection workflows.

---

## 2. Recommended Workshop Workflow

Follow this 6-step timeline for efficient computer refurbishing and certification:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDED RECONDITIONING FLOW                       │
└─────────────────────────────────────────────────────────────────────────────┘
  [1] Power & Network  ───► Plug in AC adapter + Ethernet cable.
  [2] System Launch    ───► Run tool as Admin; verify TPM 2.0 / Secure Boot / UEFI.
  [3] Driver Hub       ───► Open Driver Hub (P); inject NAS drivers or Windows Update.
  [4] BIOS & Firmware  ───► Check BIOS status (F); apply UEFI firmware if needed.
  [5] Hardware Tests   ───► Run Screen test (E), Camera & Mic (C), Battery health (B).
  [6] Final Audit      ───► Copy specs, review telemetry, reboot.
```

---

## 3. Interface Tour & Global Controls

The application interface is divided into functional, easy-to-read zones:

### Top Navigation Bar
- **Application Brand**: Displays the application icon, active version (`v1.2.41`), and status.
- **Display Brightness Slider**:
  - Drag the slider or use the scroll wheel to adjust laptop and monitor backlight brightness via native ACPI WMI calls.
  - Quick presets: **25%**, **50%**, **75%**, and **MAX**.
- **Zoom / DPI Scaling Controls**:
  - **`A-`**: Shrinks UI font scale for smaller screens (down to 60%).
  - **`100%`**: Clicking resets zoom to automatic viewport detection.
  - **`A+`**: Enlarges UI elements for high-DPI and 4K displays (up to 150%).
- **Language Switcher**: Instant toggle between **English (EN)** and **French (FR)**. All technical logs, badges, and modals adapt immediately.
- **Settings (Gear Icon)**: Opens the password-protected configuration panel.
- **Help Center (`?` or `H` / `F1`)**: Opens the comprehensive integrated workflow guide.

### Preflight Safety Banners
- **Administrator Elevation Warning**: Appears if the tool was launched with standard user rights. Click **"Relaunch as Admin"** to auto-elevate via UAC.
- **Battery Only Warning**: Notifies technicians if the AC charger is unplugged. Connect AC power before installing drivers or flashing BIOS to prevent accidental power cutoffs.

---

## 4. Hardware Telemetry & Specifications

The main dashboard automatically interrogates the system using Win32 API calls, WMI, and SMBIOS tables upon startup:

| Field | Source / Detection Method | Description |
|---|---|---|
| **Model** | `Win32_ComputerSystem` | Computer manufacturer and commercial model name. |
| **Serial Number** | `Win32_BIOS` | Unique motherboard / chassis serial number. |
| **BIOS Version** | `Win32_BIOS` | SMBIOS version string and firmware release date. |
| **CPU** | `Win32_Processor` | Exact processor model, base clock speed, and core count. |
| **Memory (RAM)** | `Win32_PhysicalMemory` | Total capacity and memory speed (e.g., `16 GO DDR4-3200`). |
| **Storage Disk(s)** | `Win32_DiskDrive` | Primary storage type (NVMe SSD, SATA SSD, HDD) and capacity. |
| **Physical Drive Serials** | `IOCTL_STORAGE_QUERY_PROPERTY` | Authentic controller serial numbers extracted via direct Win32 IOCTL queries with ATA/SATA byte-swapped pair decoding (matches **CrystalDiskInfo** standard). |
| **SMART Status** | `MSStorageDriver_FailurePredictStatus` | Drive health status (`OK` or `Pred Failure`). |
| **Video Controller** | `Win32_VideoController` | Integrated and dedicated GPU adapters. |
| **System UUID** | `Win32_ComputerSystemProduct` | Unique universal hardware identifier. |
| **Asset & Ownership Tags** | OEM WMI BIOS tables | Sanitized tags with firmware placeholders automatically stripped. |

> **Technician Tip**: Every hardware row features an individual **Copy button** (with animated green checkmark feedback) for quickly pasting data into inventory or ticketing systems. Press **`F5`** or **`R`** at any time to refresh all specifications.

---

## 5. Hardware Security Audit & Windows 11 Readiness

Windows 11 mandates strict hardware security requirements. The tool audits these in real time:

- **TPM 2.0**: Verified through `tpmtool.exe getdeviceinformation` and native TBS (Trusted Platform Base Services) API.
- **Secure Boot**: Verified directly through standard EFI NVRAM variables and the registry.
- **UEFI Mode & Partition Style**: Tested via native Win32 `GetFirmwareType` API to confirm pure UEFI mode and GPT partition structure.

### Manufacturer BIOS Walkthrough Guides
If a machine shows amber or red security badges, click **"Hardware Security Guide"** on the dashboard. The interactive guide provides step-by-step instructions for:
- **HP (ProBook / EliteBook)**: Accessing BIOS via `Esc` / `F10`, enabling Embedded Security, toggling Secure Boot, and disabling CSM.
- **Dell (Latitude / OptiPlex / Precision)**: Accessing BIOS via `F2`, enabling Intel PTT / TPM 2.0, toggling Secure Boot, and checking UEFI boot sequence.
- **Lenovo (ThinkPad / ThinkCentre)**: Accessing BIOS via `F1`, switching Security Chip to Active, and toggling pure UEFI.
- **Toshiba / Dynabook**: Accessing setup via `F2` / `F12`, setting Supervisor password if grayed out, and enabling Secure Boot.
- **General / Asus / Acer**: Generic board procedures and MBR2GPT conversion.

### Lossless MBR to GPT Disk Conversion
For systems installed in Legacy MBR mode, the guide includes copyable syntax for Windows `mbr2gpt.exe`:
```cmd
mbr2gpt.exe /convert /allowFullOS
```
This converts the disk to GPT without wiping user data or operating system files.

---

## 6. Battery Health & Power Telemetry

Clicking the **Battery Card** or pressing **`B`** opens high-precision telemetry:

### 1. 5-Second Rolling Moving Average
- **Real-Time Sampling**: The tool reads ACPI battery controller sensors every 1 second (`1000 ms`).
- **Continuous Smoothing**: Calculates a 5-second moving average (`windowMs = 5000`) to eliminate erratic power spikes:
  - Instantaneous charge/discharge rate in Watts (`+28.4 W` charging / `-12.2 W` discharging).
  - Dynamic battery life estimate: `~X h Y min remaining`.
  - Dynamic time to full charge: `Full in ~XhYm`.

### 2. Comprehensive Controller Metrics
- **Cycle Count**: Total charge cycles reported by the battery micro-controller.
- **Design vs. Full Charge Capacity**: Measured in mWh (or mAh) to determine battery wear.
- **Wear Level**: Calculated percentage of permanent capacity loss.
- **Battery Chemistry & Voltage**: Detects Li-ion, Li-poly, and instantaneous pack voltage.

---

## 7. Driver Deployment Hub (NAS & PnPUtil)

Access the Driver Hub by clicking **"Driver Manager"** on the dashboard or pressing **`P`**.

### Method 1: Network & NAS Shared Folder (`NasDriversModal`)
1. Click **"1. Network & NAS Driver Repository"**.
2. **Automatic Model Detection**: The tool queries motherboard specifications and identifies matching driver folders on your network share (`\\serveur-nas\Tech\Drivers`).
3. **Folder Structure**: Supports flat or categorized structures (Audio, Video/GPU, Network/Wi-Fi, Chipset, Bluetooth, Touchpad).
4. **Driver Injection**: Click **"Inject Drivers (PnPUtil)"**. The tool runs:
   ```cmd
   pnputil.exe /add-driver "*.inf" /subdirs /install
   ```
   A 5-phase animated progress bar displays DriverStore copying, device binding, and Plug & Play enumeration.

### Method 2: DISM Driver Export (Create New Driver Packs)
To backup all installed OEM drivers from a fully updated machine into a deployable network folder:
1. Open the NAS Driver modal and switch to the **"DISM Export"** tab.
2. Select or enter the target folder path.
3. Click **"Export Installed Drivers"**. The tool runs:
   ```cmd
   dism.exe /online /export-driver /destination:"<TargetFolder>"
   ```
4. **Smart Conflict Handling**: If the destination folder already exists, the tool prompts you to Overwrite, Create a timestamped folder, or Cancel.
5. **Instant Indexing**: Automatically updates `index.json` on the share in under 100 ms.

---

## 8. Windows Update Driver & Firmware Management

Click **"2. Drivers via Windows Update"** in the Driver Hub to launch the native Microsoft Update Agent session:

1. **COM Session Initialization**: Integrates directly with Windows Update COM APIs (`Microsoft.Update.Session`).
2. **Driver & Firmware Filtering**: Filters exclusively for hardware driver and UEFI firmware updates (`Type = 2`), ignoring feature and security patches.
3. **Selective & Repair Modes**:
   - Pending updates are checked by default.
   - Already-installed drivers can be checked to **force a clean re-installation**, repairing malfunctioning sound cards, Wi-Fi cards, or touchpads.
4. **Sequential Batch Installation**: Drivers install one by one with real-time percentages. If one driver fails, the rest of the batch continues uninterrupted.
5. **Reboot Scheduling**: Check **"Auto-reboot"** to schedule a 30-second countdown reboot after completion.

---

## 9. BIOS & UEFI Firmware Flashing Center

Click **"BIOS Firmware"** or press **`F`** to open the firmware management center:

### A. Automatic Mode (Windows Update UEFI Capsule)
- Scans for official UEFI firmware capsules certified by Microsoft and the motherboard vendor.
- Schedules the capsule for installation upon next reboot.

### B. Manual Mode (Vendor Flashers & Binaries)
- Click **"Manual Flash Mode"** and browse to your vendor firmware file:
  - Executable flash utilities (`.exe`)
  - UEFI capsules (`.inf`, `.cap`, `.bin`, `.rom`, `.bio`, `.fd`)
  - Automation scripts (`.bat`, `.cmd`, `.ps1`)
- The tool launches the flasher with full administrative elevation (`RunAs`).

### Safety Interlocks & UEFI Reboot
- **Battery Interlock**: If the computer is running on battery alone, flashing is blocked to prevent bricking the motherboard. Connect AC power to proceed.
- **Reboot into UEFI Setup**: Click **"Reboot to UEFI"** to restart straight into BIOS setup:
  ```cmd
  shutdown.exe /r /fw /t 0
  ```

---

## 10. Hardware Diagnostics & Testing Suite

Quickly test physical hardware components without third-party software:

### 📺 Screen Dead Pixel Test (Press `E`)
- Full-screen color sweep cycle: **Solid Red**, **Green**, **Blue**, **White**, and **Black**.
- Navigation: Left-click, Right-click, Spacebar, or Arrow keys to change colors.
- Press **`Escape`** to exit full screen.

### 📷 Camera & Microphone Test (Press `C`)
- **Live Video Preview**: Tests webcams with real-time frame rates and resolution indicators.
- **Controls**: Flip mirror view, toggle 3×3 framing grid, and take snapshots.
- **Audio Equalizer**: 16-band live frequency VU-meter reacting to microphone input.
- **Loopback Audio Test**: Records 3 seconds of audio and plays it back to verify microphone quality and speakers.
- **440 Hz Reference Tone**: Emits a test sine wave tone to test left/right stereo channels.
- **Instant Cutoff**: Media streams and audio contexts are instantly severed when the window is closed, immediately extinguishing the webcam LED.

### ⌨️ External Workshop Utilities
Launch external diagnostic utilities directly from the dashboard:
- **Keyboard Test (`K`)**: Launches AquaKeyTest (or configured custom utility).
- **Sound Test (`S`)**: Opens the Windows Audio Control Panel (`mmsys.cpl`).
- **BurnIn Stress Test (`T`)**: Launches PassMark BurnInTest or custom stress script.

---

## 11. Event Logs & Console Viewer

Press **`L`** or click the bottom bar to open the live execution console:

- **Bilingual Real-Time Translator**: Translates low-level Windows, PnPUtil, and DISM output into clean English or French based on your selected language.
- **Filter Tabs**:
  - **All**: Complete event log with timestamps.
  - **Success**: Verified installations and successful actions (green badges).
  - **Errors & Warnings**: Failed drivers, device errors, or warnings (red/amber badges).
  - **Info & CMD**: Low-level commands (`DISM`, `pnputil`, `shutdown`).
- **Live Search**: Type any string to instantly filter hundreds of log lines.
- **Copy All**: Copies the formatted, translated log lines with timestamps and tags directly to the clipboard.

---

## 12. Settings, Security & Custom Utilities

Click the **Gear icon** in the top navigation bar to access application settings:

### Password Protection
- Access to Settings is locked behind a password dialog (default password: `admin`).
- The password hash (`adminPasswordHash`) is verified client-side using SHA-256 (`8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`).
- To change the password, enter a new password in the Settings page and click **Save**.

### Configurable Paths & Preferences (`config.json`)
Technicians can customize workshop paths and preferences:
- **Default Starting Language**: Choose whether the application boots up in English (`en`) or French (`fr`).
- **NAS Drivers Path**: Network UNC share or local folder (e.g., `\\serveur-nas\Tech\Drivers` or `D:\Drivers`).
- **External Utility Paths**: Set paths to SDIO, CPU-Z, FurMark, or custom test scripts.
- **NAS Network Credentials**: Store workshop user credentials to auto-mount network drives upon tool launch.
- **Granular Specification Hiding**: Toggle visibility of sensitive rows (UUID, Ownership Tag, Asset Tag) on the main dashboard.
- **Custom Tools Registration**: Add custom buttons with names and paths to appear directly on the dashboard.

---

## 13. Technician Keyboard Shortcuts

Master these hotkeys to accelerate computer processing on the production line:

| Shortcut | Action | Description |
|:---:|---|---|
| **`F5`** or **`R`** | **Refresh Hardware** | Rescans hardware specs, disk serials, battery, and security status. |
| **`P`** | **Driver Manager** | Opens the Driver Hub (NAS / PnPUtil / Windows Update). |
| **`F`** | **BIOS & Firmware** | Opens the UEFI & BIOS Firmware Flashing Center. |
| **`E`** | **Screen Test** | Launches full-screen dead pixel color sweep. |
| **`C`** | **Camera & Mic** | Opens webcam preview, audio VU-meter, and loopback test. |
| **`B`** | **Battery Diagnostic** | Opens battery telemetry and 5-second moving average monitor. |
| **`K`** | **Keyboard Test** | Launches external keyboard test utility. |
| **`S`** | **Sound Test** | Opens Windows Sound control panel (`mmsys.cpl`). |
| **`T`** | **Stress Test** | Launches BurnInTest or configured stress test utility. |
| **`L`** | **Event Logs** | Expands/collapses the bottom live console or opens full modal. |
| **`?`** or **`H`** / **`F1`** | **Help & Guide** | Opens the integrated user manual. |
| **`A+` / `A-` / `100%`** | **UI Zoom (DPI)** | Adjusts interface scaling for small or large displays. |
| **`Escape`** | **Dismiss Modal** | Instantly closes any active dialog window. |

---

## 14. Troubleshooting & Frequently Asked Questions

### Q1: The Driver Hub says "Access Denied" or PnPUtil fails to inject drivers.
> **Solution**: PnPUtil and DISM require elevated Administrator privileges under Windows. Verify the top banner displays "Administrator Privileges Active". If not, click **"Relaunch as Admin"**.

### Q2: Cannot connect to the NAS share (`\\serveur-nas\Tech`).
> **Solution**: Ensure your Ethernet cable is plugged in and has a valid IP address. Open Settings (Gear icon) and verify the network credentials. Use the format `domain\user` or `.\user`.

### Q3: Physical Drive Serial Number displays as "N/A" or shows Windows volume labels.
> **Solution**: The application uses direct Win32 `IOCTL_STORAGE_QUERY_PROPERTY` commands to talk directly to the NVMe or SATA controller. Ensure you are running with Administrator rights.

### Q4: The battery charge percentage jumps erratically.
> **Solution**: Laptop ACPI controllers often report unstable instantaneous readings. The application automatically applies a **5-second rolling moving average** to smooth out fluctuations. Allow the battery card 5 seconds to calibrate.

### Q5: How do I deploy this tool to dozens of USB flash drives?
> **Solution**: Run `run.bat` to generate the portable executable (`Hardware-Diagnostic-Tool_v{version}_Portable.exe`). Copy this `.exe` and your pre-configured `config.json` to the root of your USB drives. It runs with zero dependencies on any 64-bit Windows 10/11 system.

---

*Hardware Diagnostic & Update Tool • Operations Manual v1.2.41*
