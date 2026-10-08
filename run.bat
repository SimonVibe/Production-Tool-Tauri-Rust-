@echo off
setlocal EnableDelayedExpansion
title Production Tool (Administrator Mode) - Build & Packaging

:: =======================================================
:: 0. Administrator privilege check & auto-elevation
:: =======================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo =======================================================
    echo   [UAC] Administrator privileges required for native build
    echo   Relaunching automatically in Administrator mode...
    echo =======================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   Production Tool - Build & Packaging Pipeline (Tauri v2 + React)
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
        echo [ERROR] Node.js LTS is required. Please install it from https://nodejs.org/
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
    echo If Rust was just installed, please reopen a terminal or check %%USERPROFILE%%\.cargo\bin.
)

:: 2.3 Check Visual Studio C++ Build Tools (MSVC)
where cl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set "VS_FOUND="
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
        for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2^>nul`) do (
            set "VS_FOUND=%%i"
        )
    )
    if not defined VS_FOUND (
        if exist "%ProgramFiles%\Microsoft Visual Studio\2022" set "VS_FOUND=1"
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019" set "VS_FOUND=1"
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022" set "VS_FOUND=1"
    )
    if not defined VS_FOUND (
        echo [Prerequisites] Visual Studio C++ Build Tools (MSVC) not detected.
        echo Attempting automatic installation via winget...
        where winget >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-source-agreements --accept-package-agreements
        ) else (
            echo [NOTE] MSVC C++ Build Tools are recommended for compiling Rust on Windows.
            echo If build fails, install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
        )
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
set "TAURI_BUILD_CODE=%ERRORLEVEL%"

echo.
echo [Artifacts] Organizing build deliverables into dist\1_portable\ and dist\2_installer\...
call node post-build.js

echo.
if %TAURI_BUILD_CODE% EQU 0 (
    echo =======================================================
    echo   [SUCCESS] Production Tool compiled and packaged successfully!
    echo   Deliverables ready in the dist folder:
    echo     1. Portable Application: dist\1_portable\Production-Tool_v..._Portable.exe
    echo     2. Setup Installer (.exe): dist\2_installer\Production-Tool_v..._Installer.exe
    echo     3. MSI Installer (.msi):   dist\2_installer\Production-Tool_v..._Installer.msi
    echo =======================================================
) else (
    echo =======================================================
    echo   [NOTICE] Tauri build process finished (exit code: %TAURI_BUILD_CODE%).
    echo   If portable executable was produced, it has been placed in dist\1_portable\
    echo   If installer generation required WiX or NSIS tools, check log above.
    echo =======================================================
)

echo.
echo Press any key to exit...
pause >nul
