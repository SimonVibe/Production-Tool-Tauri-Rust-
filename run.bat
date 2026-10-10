@echo off
setlocal EnableDelayedExpansion
title Production Tool - Build and Packaging

:: =======================================================
:: 0. Administrator privilege check & auto-elevation
:: =======================================================
net session >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo =======================================================
    echo   [UAC] Administrator privileges required for native build
    echo   Relaunching automatically in Administrator mode...
    echo =======================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   Production Tool - Build and Packaging Pipeline
echo   Portable Executable and Installer Generator (.exe / .msi)
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

:: 2.1 Check Node.js
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [Prerequisites] Node.js not detected. Installing via winget...
    where winget >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        winget install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;!PATH!"
    ) else (
        echo [ERROR] Node.js LTS is required. Please install from https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 2.2 Check Rust & Cargo
if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
if exist "%LOCALAPPDATA%\Programs\Rust\bin" set "PATH=%LOCALAPPDATA%\Programs\Rust\bin;!PATH!"

where cargo >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [Prerequisites] Rust/Cargo not detected. Installing via rustup...
    powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'"
    if exist "%TEMP%\rustup-init.exe" (
        "%TEMP%\rustup-init.exe" -y --default-host x86_64-pc-windows-msvc
        set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
    )
)

:: 2.3 Check MSVC C++ Build Tools
where cl >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [Prerequisites] MSVC C++ Build Tools not detected. Attempting installation via winget...
    where winget >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-source-agreements --accept-package-agreements
    ) else (
        echo [NOTE] MSVC C++ Build Tools recommended. If build fails, install from Visual Studio Installer.
    )
)

:: =======================================================
:: 3. Dynamic version synchronization from changelog.md
:: =======================================================
echo [3/7] Synchronizing version from changelog.md...
call node sync-version.js

:: =======================================================
:: 4. Install Node.js dependencies
:: =======================================================
echo [4/7] Installing Node.js dependencies (npm install)...
call npm install
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to install npm dependencies.
    pause
    exit /b !ERRORLEVEL!
)

:: =======================================================
:: 5. Generate and verify application icons
:: =======================================================
echo [5/7] Verifying application icons...
if not exist "src-tauri\icons\icon.ico" (
    if exist "app-icon.png" (
        echo [Icons] Generating icons from app-icon.png...
        call npx @tauri-apps/cli icon app-icon.png
    )
) else (
    echo [Icons] Icons already present in src-tauri\icons.
)

:: =======================================================
:: 6. Compile React frontend (Vite)
:: =======================================================
echo [6/7] Compiling web frontend (React + Vite)...
call npm run build
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] React compilation failed.
    pause
    exit /b !ERRORLEVEL!
)

:: =======================================================
:: 7. Build native Tauri application and portable app
:: =======================================================
echo [7/7] Compiling native Tauri application and installers...
call npm run tauri:build
set "TAURI_BUILD_CODE=!ERRORLEVEL!"

echo.
echo [Artifacts] Organizing deliverables into dist\1_portable and dist\2_installer...
call node post-build.js

echo.
if !TAURI_BUILD_CODE! EQU 0 (
    echo =======================================================
    echo   [SUCCESS] Production Tool compiled and packaged successfully!
    echo   Deliverables ready in the dist folder:
    echo     1. Portable App: dist\1_portable\
    echo     2. Installers:   dist\2_installer\
    echo =======================================================
) else (
    echo =======================================================
    echo   [NOTICE] Build finished with exit code: !TAURI_BUILD_CODE!
    echo   Check output above for details. Portable/Installer output
    echo   may still be available in dist\.
    echo =======================================================
)

echo.
echo Press any key to exit...
pause >nul
