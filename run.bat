@echo off
setlocal EnableDelayedExpansion
title Production-Tool (Administrator Mode) - Build & Packaging

:: =======================================================
:: 0. Administrator privilege check & auto-elevation
:: =======================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo =======================================================
    echo   [UAC] Administrator privileges required for native build
    echo   Relaunching automatically in Administrator mode...
    echo =======================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   Production-Tool - Build & Packaging Pipeline (Tauri v2 + React)
echo   Portable Executable & Installer Generator (.exe / .msi)
echo   [ADMINISTRATOR MODE ACTIVE]
echo =======================================================
echo.

:: 1. Navigate to script directory
echo [1/7] Setting working directory to project root...
cd /d "%~dp0"

:: =======================================================
:: 2. Check and install system prerequisites
:: =======================================================
echo [2/7] Verifying system prerequisites (Node.js, Rust, C++ Build Tools)...

:: 2.1 Check / Install Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Prerequisites] Node.js not detected. Attempting automatic installation via winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;!PATH!"
    ) else (
        echo [ERROR] Node.js is required. Please install it from https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 2.2 Check / Install Rust & Cargo
if exist "%USERPROFILE%\.cargo\bin" (
    set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
)
if exist "%LOCALAPPDATA%\Programs\Rust\bin" (
    set "PATH=%LOCALAPPDATA%\Programs\Rust\bin;!PATH!"
)

where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Prerequisites] Cargo/Rust not detected. Attempting automatic installation via winget / rustup...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install Rustlang.Rustup -e --silent --accept-source-agreements --accept-package-agreements
        set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
    ) else (
        echo [Prerequisites] Downloading rustup-init.exe...
        powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'"
        if exist "%TEMP%\rustup-init.exe" (
            "%TEMP%\rustup-init.exe" -y --default-host x86_64-pc-windows-msvc
            set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
        )
    )
)

where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] 'cargo' could not be found in the current PATH.
    echo If Rust was just installed, please reopen a terminal or verify %%USERPROFILE%%\.cargo\bin.
)

:: =======================================================
:: 3. Dynamic version synchronization from changelog.md
:: =======================================================
echo [3/7] Synchronizing version from changelog.md...
call node sync-version.js

:: =======================================================
:: 4. Install Node.js dependencies
:: =======================================================
echo [4/7] Checking and installing Node.js dependencies (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install npm dependencies.
    pause
    exit /b %ERRORLEVEL%
)

:: =======================================================
:: 5. Generate and verify application icons
:: =======================================================
echo [5/7] Verifying and generating application icons...
if not exist "src-tauri\icons\icon.ico" (
    if exist "app-icon.png" (
        echo [Icons] Automatically generating icons from app-icon.png...
        call npx @tauri-apps/cli icon app-icon.png
    )
) else (
    echo [Icons] Windows/Mac/Linux icons are already present in src-tauri\icons.
)

:: =======================================================
:: 6. Compile React frontend (Vite)
:: =======================================================
echo [6/7] Compiling web frontend (React + Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] React compilation failed.
    pause
    exit /b %ERRORLEVEL%
)

:: =======================================================
:: 7. Build native Tauri application, installers & portable app
:: =======================================================
echo [7/7] Compiling native Tauri application (Portable & Installers)...
call npx @tauri-apps/cli build

if %ERRORLEVEL% EQU 0 (
    call node post-build.js
    echo =======================================================
    echo   [SUCCESS] Production-Tool compiled and packaged successfully!
    echo   Deliverables ready in the dist folder:
    echo     1. Portable Application: dist\1_portable\Production-Tool_v..._Portable.exe
    echo     2. Setup Installer (.exe): dist\2_installer\Production-Tool_v..._Installer.exe
    echo     3. MSI Installer (.msi):   dist\2_installer\Production-Tool_v..._Installer.msi
    echo =======================================================
) else (
    echo.
    echo [ERROR] Tauri / Rust compilation encountered an error.
    echo Please make sure Visual Studio C++ Build Tools (MSVC) are installed.
)

echo.
pause
