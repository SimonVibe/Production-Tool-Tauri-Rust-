@echo off
setlocal EnableDelayedExpansion
title Hardware Diagnostic & Update Tool (Mode Administrateur) - Build & Packaging

:: =======================================================
:: 0. Verification des privileges Administrateur et auto-elevation
:: =======================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo =======================================================
    echo   [UAC] Elevation requise pour le diagnostic materiel
    echo   Relance automatique en mode Administrateur...
    echo =======================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   Hardware Diagnostic Tool - Script de Construction (Tauri v2 + React)
echo   Generateur d'Installeur et Application Portable
echo   [MODE ADMINISTRATEUR ACTIF]
echo =======================================================
echo.

:: 1. Se positionner dans le dossier du script
echo [1/7] Positionnement dans le repertoire du projet...
cd /d "%~dp0"

:: =======================================================
:: 2. Verification et installation des prerequis systeme
:: =======================================================
echo [2/7] Verification des prerequis systeme (Node.js, Rust, C++ Build Tools)...

:: 2.1 Verification / Installation de Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Prerequis] Node.js non detecte. Tentative d'installation automatique via winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;!PATH!"
    ) else (
        echo [ERREUR] Node.js est requis. Veuillez l'installer depuis https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 2.2 Verification / Installation de Rust & Cargo
if exist "%USERPROFILE%\.cargo\bin" (
    set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
)
if exist "%LOCALAPPDATA%\Programs\Rust\bin" (
    set "PATH=%LOCALAPPDATA%\Programs\Rust\bin;!PATH!"
)

where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Prerequis] Cargo/Rust non detecte. Tentative d'installation automatique via winget / rustup...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install Rustlang.Rustup -e --silent --accept-source-agreements --accept-package-agreements
        set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
    ) else (
        echo [Prerequis] Telechargement de rustup-init.exe...
        powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'"
        if exist "%TEMP%\rustup-init.exe" (
            "%TEMP%\rustup-init.exe" -y --default-host x86_64-pc-windows-msvc
            set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
        )
    )
)

where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ATTENTION] 'cargo' n'a pas pu etre verifie dans le PATH courant.
    echo Si Rust vient d'etre installe, veuillez rouvrir un terminal ou verifier %%USERPROFILE%%\.cargo\bin.
)

:: =======================================================
:: 3. Synchronisation dynamique de version depuis changelog.md
:: =======================================================
echo [3/7] Synchronisation de la version depuis changelog.md...
call node sync-version.js

:: =======================================================
:: 4. Installation des modules Node.js
:: =======================================================
echo [4/7] Verification et installation des modules Node.js (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] L'installation des dependances npm a echoue.
    pause
    exit /b %ERRORLEVEL%
)

:: =======================================================
:: 5. Generation et verification des icones d'application
:: =======================================================
echo [5/7] Verification et generation des icones d'application...
if not exist "src-tauri\icons\icon.ico" (
    if exist "app-icon.png" (
        echo [Icones] Creation automatique des icones depuis app-icon.png...
        call npx @tauri-apps/cli icon app-icon.png
    )
) else (
    echo [Icones] Les icones Windows/Mac/Linux sont deja presentes dans src-tauri\icons.
)

:: =======================================================
:: 6. Compilation du frontend React (Vite)
:: =======================================================
echo [6/7] Compilation du frontend Web (React + Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] La compilation React a echoue.
    pause
    exit /b %ERRORLEVEL%
)

:: =======================================================
:: 7. Construction du binaire natif, installeur et version portable (Tauri)
:: =======================================================
echo [7/7] Construction de l'application native Tauri (Portable & Installeur)...
call npx @tauri-apps/cli build

if %ERRORLEVEL% EQU 0 (
    call node post-build.js
    echo =======================================================
    echo   [SUCCES] L'application Tauri a ete generee avec succes !
    echo   Retrouvez a la racine du projet :
    echo     1. L'application Portable : Hardware-Diagnostic-Tool_v..._Portable.exe
    echo     2. L'installeur Windows   : Hardware-Diagnostic-Tool_v..._Installer.exe
    echo =======================================================
) else (
    echo.
    echo [ERREUR] La compilation Tauri / Rust a rencontre une erreur.
    echo Assurez-vous d'avoir installe les C++ Build Tools (Visual Studio / MSVC).
)

echo.
pause
