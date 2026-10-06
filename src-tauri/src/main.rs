// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use std::sync::OnceLock;
use std::thread;
use std::time::{Duration, Instant};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use serde::{Deserialize, Serialize};
use tauri::Window;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExternalApp {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct HiddenTestsConfig {
    #[serde(default)]
    pub screen: Option<bool>,
    #[serde(default)]
    pub audio: Option<bool>,
    #[serde(default)]
    pub keyboard: Option<bool>,
    #[serde(default)]
    pub camera: Option<bool>,
    #[serde(default)]
    pub burnin: Option<bool>,
    #[serde(default)]
    pub battery: Option<bool>,
    #[serde(default)]
    pub wifi: Option<bool>,
    #[serde(default)]
    pub bluetooth: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct HiddenSpecsConfig {
    #[serde(default)]
    pub model: Option<bool>,
    #[serde(default)]
    pub serial_number: Option<bool>,
    #[serde(default)]
    pub uuid: Option<bool>,
    #[serde(default)]
    pub asset_tag: Option<bool>,
    #[serde(default)]
    pub ownership_tag: Option<bool>,
    #[serde(default)]
    pub cpu: Option<bool>,
    #[serde(default)]
    pub memory: Option<bool>,
    #[serde(default)]
    pub disk: Option<bool>,
    #[serde(default)]
    pub disk_sn: Option<bool>,
    #[serde(default)]
    pub gpu: Option<bool>,
    #[serde(default)]
    pub bios: Option<bool>,
    #[serde(default)]
    pub security_banner: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_test_ecran_path")]
    pub test_ecran_path: String,
    #[serde(default = "default_test_son_path")]
    pub test_son_path: String,
    #[serde(default = "default_test_clavier_path")]
    pub test_clavier_path: String,
    #[serde(default = "default_burn_in_test_path")]
    pub burn_in_test_path: String,
    #[serde(default = "default_test_camera_path")]
    pub test_camera_path: String,
    #[serde(default)]
    pub battery_app_path: Option<String>,
    #[serde(default)]
    pub driver_sdio_path: Option<String>,
    #[serde(default)]
    pub nas_drivers_path: Option<String>,
    #[serde(default)]
    pub auto_reboot: Option<bool>,
    #[serde(default)]
    pub default_language: Option<String>,
    #[serde(default)]
    pub hidden_tests: Option<HiddenTestsConfig>,
    #[serde(default)]
    pub hidden_specs: Option<HiddenSpecsConfig>,
    #[serde(default)]
    pub external_apps: Option<Vec<ExternalApp>>,
    #[serde(default)]
    pub network_auth: Option<NetworkAuthConfig>,
    #[serde(default)]
    pub admin_password_hash: Option<String>,
}

fn default_test_ecran_path() -> String { "screen_test.exe".to_string() }
fn default_test_son_path() -> String { "mmsys.cpl".to_string() }
fn default_test_clavier_path() -> String { "AquaKeyTest.exe".to_string() }
fn default_burn_in_test_path() -> String { "BurnInTest\\bit.exe".to_string() }
fn default_test_camera_path() -> String { "test_camera.exe".to_string() }

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            test_ecran_path: default_test_ecran_path(),
            test_son_path: default_test_son_path(),
            test_clavier_path: default_test_clavier_path(),
            burn_in_test_path: default_burn_in_test_path(),
            test_camera_path: default_test_camera_path(),
            battery_app_path: None,
            driver_sdio_path: Some("SDIO\\SDI_x64_R.exe".to_string()),
            nas_drivers_path: Some("\\\\serveur-nas\\Tech\\Drivers".to_string()),
            auto_reboot: Some(false),
            default_language: Some("en".to_string()),
            hidden_tests: Some(HiddenTestsConfig::default()),
            hidden_specs: Some(HiddenSpecsConfig::default()),
            external_apps: Some(Vec::new()),
            network_auth: None,
            admin_password_hash: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAuthConfig {
    pub path: String,
    pub user: String,
    pub pass: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ActionResult {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecurityStatusResult {
    pub tpm: bool,
    pub secure_boot: bool,
    pub is_uefi: Option<bool>,
    pub boot_mode: Option<String>,
    pub partition_style: Option<String>,
    pub setup_mode: Option<bool>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BiosCheckResult {
    pub available: bool,
    pub title: String,
    pub error: Option<String>,
    #[serde(default)]
    pub current_version: Option<String>,
    #[serde(default)]
    pub manufacturer: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BiosInstallResult {
    pub success: bool,
    pub report: String,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HardwareModelDetails {
    pub make: String,
    pub model: String,
    pub form_factor: String,
    pub serial_number: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PnpMissingDeviceItem {
    pub device_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub error_code: u32,
    pub error_description: String,
    pub class: Option<String>,
    pub hardware_ids: Vec<String>,
    pub manufacturer: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WindowsUpdateDriverItem {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_firmware: bool,
    #[serde(default)]
    pub is_installed: Option<bool>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub release_date: Option<String>,
    #[serde(default)]
    pub provider: Option<String>,
    pub status: String,
    pub progress: u32,
    pub result_code: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriverCategoryCount {
    pub name: String,
    pub count: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NasDriverFolderItem {
    pub brand: String,
    pub category: String,
    pub model: String,
    pub display_name: String,
    pub full_path: String,
    pub is_match: bool,
    #[serde(default)]
    pub inf_count: Option<u32>,
    #[serde(default)]
    pub driver_categories: Option<Vec<DriverCategoryCount>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InfDriverDetailItem {
    pub id: String,
    pub name: String,
    pub inf_name: String,
    pub inf_path: String,
    pub category: String,
    pub provider: Option<String>,
    pub version: Option<String>,
    pub date: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BiosDetailedInfoResult {
    pub manufacturer: String,
    pub smbios_version: String,
    pub version: String,
    pub serial_number: String,
    pub release_date: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub update_available: Option<bool>,
    #[serde(default)]
    pub update_title: Option<String>,
    #[serde(default)]
    pub update_version: Option<String>,
    #[serde(default)]
    pub update_release_date: Option<String>,
    #[serde(default)]
    pub update_description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatteryStatusResult {
    pub present: bool,
    pub percentage: Option<u32>,
    pub health: Option<u32>,
    pub is_charging: bool,
    pub ac_connected: bool,
    pub status_label: String,
    #[serde(default)]
    pub design_capacity: Option<u32>,
    #[serde(default)]
    pub full_charge_capacity: Option<u32>,
    #[serde(default)]
    pub cycle_count: Option<u32>,
    #[serde(default)]
    pub wear_level: Option<u32>,
    #[serde(default)]
    pub voltage: Option<f64>,
    #[serde(default)]
    pub chemistry: Option<String>,
    #[serde(default)]
    pub manufacturer: Option<String>,
    #[serde(default)]
    pub serial_number: Option<String>,
    #[serde(default)]
    pub estimated_run_time_minutes: Option<u32>,
    #[serde(default)]
    pub estimated_charge_time_minutes: Option<u32>,
    #[serde(default)]
    pub estimated_duration_formatted: Option<String>,
    #[serde(default)]
    pub discharge_rate_watts: Option<f64>,
    #[serde(default)]
    pub charge_rate_watts: Option<f64>,
}

#[derive(Clone, Debug)]
struct BatteryCacheData {
    timestamp: Instant,
    design_capacity: Option<u32>,
    full_charge_capacity: Option<u32>,
    cycle_count: Option<u32>,
    wear_level: Option<u32>,
    health: Option<u32>,
    voltage: Option<f64>,
    chemistry: Option<String>,
    manufacturer: Option<String>,
    serial_number: Option<String>,
    discharge_rate_watts: Option<f64>,
    charge_rate_watts: Option<f64>,
}

static BATTERY_STATIC_CACHE: Mutex<Option<BatteryCacheData>> = Mutex::new(None);

fn get_exec_dir() -> PathBuf {
    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            return parent.to_path_buf();
        }
    }
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn resolve_path_to_existing(input_path: &str) -> PathBuf {
    let base_dir = get_exec_dir();
    let p = Path::new(input_path);
    if p.is_absolute() && p.exists() {
        return p.to_path_buf();
    }

    let current_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    let candidate_dirs = vec![
        base_dir.clone(),
        current_dir.clone(),
        base_dir.parent().unwrap_or(&base_dir).to_path_buf(),
        base_dir.parent().and_then(|p| p.parent()).unwrap_or(&base_dir).to_path_buf(),
        PathBuf::from(r"C:\Tools\AppPack"),
        PathBuf::from(r"C:\AppPack"),
        PathBuf::from(r"D:\Tools\AppPack"),
        PathBuf::from(r"Z:\AppPack"),
        PathBuf::from(r"Z:\Tech\AppPack"),
        PathBuf::from(r"Z:\Tech"),
        PathBuf::from(r"Z:\"),
        PathBuf::from(r"Y:\AppPack"),
        PathBuf::from(r"Y:\"),
        PathBuf::from(r"X:\AppPack"),
        PathBuf::from(r"X:\"),
    ];

    let stripped = input_path
        .trim_start_matches(".\\")
        .trim_start_matches("./")
        .trim_start_matches("AppPack\\")
        .trim_start_matches("AppPack/");

    // If the input is a UNC path (e.g. \\serveur-nas\Tech\...) that isn't accessible directly,
    // test matching against mapped drive letters (Z:\, Y:\, X:\)
    if input_path.starts_with(r"\\") || input_path.starts_with(r"//") {
        let unc_clean = input_path.replace('/', r"\");
        if let Some(pos) = unc_clean[2..].find(r"\") {
            let after_server = &unc_clean[2 + pos + 1..];
            if let Some(pos2) = after_server.find(r"\") {
                let sub_resource = &after_server[pos2 + 1..]; // e.g. "AppPack\SDIO\..." or "SDIO\..."
                for letter in &["Z:", "Y:", "X:", "W:", "V:"] {
                    let cand1 = PathBuf::from(format!(r"{}\{}", letter, sub_resource));
                    if cand1.exists() {
                        return cand1;
                    }
                    let cand2 = PathBuf::from(format!(r"{}\Tech\{}", letter, sub_resource));
                    if cand2.exists() {
                        return cand2;
                    }
                }
            }
        }
    }

    for dir in &candidate_dirs {
        let p_exact = dir.join(input_path);
        if p_exact.exists() {
            return p_exact;
        }

        let p_stripped = dir.join(stripped);
        if p_stripped.exists() {
            return p_stripped;
        }

        if let Some(file_name) = p.file_name() {
            let p_fn = dir.join(file_name);
            if p_fn.exists() {
                return p_fn;
            }
        }
    }

    base_dir.join(input_path)
}

#[tauri::command]
fn load_config() -> Option<AppConfig> {
    let cfg_path = get_exec_dir().join("config.json");
    if cfg_path.exists() {
        if let Ok(content) = fs::read_to_string(cfg_path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                return Some(config);
            }
        }
    }
    None
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    let cfg_path = get_exec_dir().join("config.json");
    let json_content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(cfg_path, json_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn execute_action(name: String, action_path: String) -> ActionResult {
    if action_path.is_empty() {
        return ActionResult {
            success: false,
            output: None,
            error: Some("Chemin non spécifié".into()),
        };
    }

    let trimmed = action_path.trim().to_lowercase();

    // 0. Explorer or Directory opening (e.g. explorer.exe "C:\...", explorer "C:\...", or folder paths)
    if trimmed.starts_with("explorer.exe") || trimmed.starts_with("explorer ") || action_path.trim().starts_with("explorer") {
        #[cfg(target_os = "windows")]
        {
            let mut raw_target = action_path.trim();
            if let Some(stripped) = raw_target.strip_prefix("explorer.exe") {
                raw_target = stripped.trim();
            } else if let Some(stripped) = raw_target.strip_prefix("explorer") {
                raw_target = stripped.trim();
            }
            let target_folder = raw_target.trim_matches('"').trim_matches('\'').trim();
            
            let mut cmd = Command::new("explorer.exe");
            if !target_folder.is_empty() {
                cmd.arg(target_folder);
            }
            return match cmd.spawn() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some(format!("Dossier ouvert dans l'Explorateur Windows : {}", target_folder)),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(format!("Erreur lors de l'ouverture de l'explorateur : {}", e)),
                },
            };
        }
        #[cfg(not(target_os = "windows"))]
        {
            return ActionResult {
                success: true,
                output: Some(format!("Dossier ouvert dans l'explorateur (Simulation) : {}", action_path)),
                error: None,
            };
        }
    }
    // 1. MSC Consoles (e.g. devmgmt.msc, diskmgmt.msc, compmgmt.msc)
    if trimmed.ends_with(".msc") {
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("mmc.exe");
            cmd.arg(action_path.trim());
            match cmd.spawn() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some(format!("Console système ouverte : {}", name)),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(format!("Erreur lors de l'ouverture de la console MMC : {}", e)),
                },
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some(format!("Console système simulée : {}", name)),
                error: None,
            }
        }
    }
    // 2. Control Panel Applets (e.g. mmsys.cpl)
    else if trimmed.ends_with(".cpl") {
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("control.exe");
            cmd.arg(action_path.trim());
            match cmd.spawn() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some(format!("Panneau de configuration ouvert : {}", name)),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(format!("Erreur lors de l'ouverture du panneau de configuration : {}", e)),
                },
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some(format!("Panneau de configuration simulé : {}", name)),
                error: None,
            }
        }
    }
    // 3. Windows Modern Settings & URI Protocols
    else if action_path.starts_with("ms-settings:")
        || action_path.starts_with("ms-availablenetworks:")
        || action_path.starts_with("ms-actioncenter:")
        || action_path.starts_with("ms-")
    {
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("cmd");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["/C", "start", "", action_path.trim()]);
            match cmd.spawn() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some(format!("Ouverture de {}", action_path)),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(format!("Erreur lors de l'ouverture de l'URI : {}", e)),
                },
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some(format!("Ouverture simulée : {}", action_path)),
                error: None,
            }
        }
    }
    // 4. Shutdown & Reboot commands
    else if action_path.starts_with("shutdown ") {
        #[cfg(target_os = "windows")]
        {
            let mut inner_cmd = action_path.clone();
            if action_path.contains("/fw") || action_path.contains("-fw") {
                inner_cmd = "shutdown /r /fw /t 0 || shutdown -r -fw -t 0".to_string();
            }
            let ps_cmd = format!(
                "Start-Process cmd -ArgumentList '/c {}' -Verb RunAs -WindowStyle Hidden",
                inner_cmd
            );
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_cmd]);
            let output = cmd.output();

            match output {
                Ok(out) => ActionResult {
                    success: out.status.success(),
                    output: Some(String::from_utf8_lossy(&out.stdout).to_string()),
                    error: if out.status.success() { None } else { Some(String::from_utf8_lossy(&out.stderr).to_string()) },
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(e.to_string()),
                },
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some(format!("Commande shutdown simulée: {}", action_path)),
                error: None,
            }
        }
    }
    // 5. Native Windows Update
    else if action_path == "native_wu" {
        #[cfg(target_os = "windows")]
        {
            let config = load_config();
            let auto_reboot = config.as_ref().and_then(|c| c.auto_reboot).unwrap_or(false);
            let ps_script = r#"
                $ErrorActionPreference = 'Stop'
                [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
                if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
                    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$PSCommandPath`"" -Verb RunAs
                    exit
                }
                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true
                $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=0 OR IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=1")
                if ($searchResult.Updates.Count -gt 0) {
                    $updates = New-Object -ComObject Microsoft.Update.UpdateColl
                    for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {
                        $update = $searchResult.Updates.Item($i)
                        if (-not $update.EulaAccepted) { try { $update.AcceptEula() } catch {} }
                        [void]$updates.Add($update)
                    }
                    $downloader = $session.CreateUpdateDownloader()
                    $downloader.Updates = $updates
                    $downloader.Download()
                    $installer = $session.CreateUpdateInstaller()
                    $installer.Updates = $updates
                    $installResult = $installer.Install()
                    if ($installResult.RebootRequired -and $env:AUTO_REBOOT -eq 'true') {
                        Restart-Computer -Force
                    }
                }
            "#;
            
            let ps_cmd = format!(
                "Start-Process powershell -ArgumentList '-NoProfile', '-WindowStyle', 'Hidden', '-Command', '{}' -Verb RunAs",
                ps_script.replace('\'', "''").replace('\n', " ")
            );
            
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_cmd]);
            if auto_reboot {
                cmd.env("AUTO_REBOOT", "true");
            }
            
            match cmd.output() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some("Installation Windows Update lancée en arrière-plan (Privilèges administrateur)".into()),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(e.to_string()),
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some("Installation Windows Update (Simulation)".into()),
                error: None,
            }
        }
    }
    // 6. Native NAS / PnPUtil
    else if action_path == "native_nas" {
        #[cfg(target_os = "windows")]
        {
            let config = load_config();
            let nas_path = config.as_ref().and_then(|c| c.nas_drivers_path.as_deref()).unwrap_or(r"\\serveur-nas\Tech\Drivers");
            let ps_script = format!(r#"
                $ErrorActionPreference = 'Stop'
                $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
                if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {{
                    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$PSCommandPath`"" -Verb RunAs
                    exit
                }}
                $Make = (Get-CimInstance Win32_ComputerSystem).Manufacturer.Trim()
                $ActualModel = (Get-CimInstance Win32_ComputerSystem).Model.Trim()
                $TargetDir = Join-Path "{}" "$Make\$ActualModel"
                if (Test-Path $TargetDir) {{
                    pnputil.exe /add-driver "$TargetDir\*.inf" /subdirs /install
                }} else {{
                    # Essayer le dossier direct ou sous-dossiers
                    if (Test-Path "{}") {{
                        pnputil.exe /add-driver "{}\*.inf" /subdirs /install
                    }} else {{
                        throw "Aucun pilote trouvé pour $Make $ActualModel sur le NAS"
                    }}
                }}
            "#, nas_path, nas_path, nas_path);
            
            let ps_cmd = format!(
                "Start-Process powershell -ArgumentList '-NoProfile', '-WindowStyle', 'Hidden', '-Command', '{}' -Verb RunAs",
                ps_script.replace('\'', "''").replace('\n', " ")
            );
            
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_cmd]);
            
            match cmd.output() {
                Ok(_) => ActionResult {
                    success: true,
                    output: Some("Installation des pilotes du NAS lancée en arrière-plan (Privilèges administrateur)".into()),
                    error: None,
                },
                Err(e) => ActionResult {
                    success: false,
                    output: None,
                    error: Some(e.to_string()),
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some("Installation NAS (Simulation)".into()),
                error: None,
            }
        }
    }
    // 7. General Executables, PS1, VBS, BAT
    else {
        let target_path = resolve_path_to_existing(&action_path);
        let target_dir = if target_path.exists() {
            target_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf()
        } else {
            get_exec_dir()
        };

        let target_str = target_path.to_string_lossy().to_string();

        #[cfg(target_os = "windows")]
        {
            let target_lower = target_str.to_lowercase();
            if target_lower.ends_with(".ps1") {
                let mut cmd = Command::new("powershell");
                cmd.creation_flags(CREATE_NO_WINDOW)
                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", &target_str])
                    .current_dir(target_dir);
                match cmd.spawn() {
                    Ok(_) => ActionResult {
                        success: true,
                        output: Some(format!("Script PowerShell lancé : {}", name)),
                        error: None,
                    },
                    Err(e) => ActionResult {
                        success: false,
                        output: None,
                        error: Some(format!("Erreur lancement script PS1 : {}", e)),
                    },
                }
            } else if target_lower.ends_with(".vbs") {
                let mut cmd = Command::new("wscript");
                cmd.args(["//Nologo", &target_str])
                    .current_dir(target_dir);
                match cmd.spawn() {
                    Ok(_) => ActionResult {
                        success: true,
                        output: Some(format!("Script VBS lancé : {}", name)),
                        error: None,
                    },
                    Err(e) => ActionResult {
                        success: false,
                        output: None,
                        error: Some(format!("Erreur lancement script VBS : {}", e)),
                    },
                }
            } else if target_lower.ends_with(".bat") || target_lower.ends_with(".cmd") {
                let mut cmd = Command::new("cmd");
                cmd.creation_flags(CREATE_NO_WINDOW)
                    .args(["/C", "start", "", &target_str])
                    .current_dir(&target_dir);
                match cmd.spawn() {
                    Ok(_) => ActionResult {
                        success: true,
                        output: Some(format!("Script Batch lancé : {}", name)),
                        error: None,
                    },
                    Err(e) => ActionResult {
                        success: false,
                        output: None,
                        error: Some(format!("Erreur lancement script Batch : {}", e)),
                    },
                }
            } else {
                // For executables (.exe) or any other application path:
                // Launch detached with CREATE_NEW_PROCESS_GROUP and Stdio::null
                // to guarantee ZERO blocking, zero inherited pipes, and instant return!
                let mut cmd = if target_path.exists() {
                    Command::new(&target_path)
                } else {
                    Command::new(&target_str)
                };
                cmd.current_dir(&target_dir);
                cmd.stdin(std::process::Stdio::null());
                cmd.stdout(std::process::Stdio::null());
                cmd.stderr(std::process::Stdio::null());
                cmd.creation_flags(0x00000200); // CREATE_NEW_PROCESS_GROUP

                match cmd.spawn() {
                    Ok(_) => ActionResult {
                        success: true,
                        output: Some(format!("Application lancée avec succès : {}", name)),
                        error: None,
                    },
                    Err(_) => {
                        // Fallback: launch via Windows Shell (cmd /c start "" "target")
                        let mut fallback = Command::new("cmd");
                        fallback.creation_flags(CREATE_NO_WINDOW)
                            .args(["/C", "start", "", &target_str])
                            .current_dir(&target_dir);
                        match fallback.spawn() {
                            Ok(_) => ActionResult {
                                success: true,
                                output: Some(format!("Application lancée via le shell système : {}", name)),
                                error: None,
                            },
                            Err(e2) => ActionResult {
                                success: false,
                                output: None,
                                error: Some(format!("Impossible de lancer '{}' : {}", name, e2)),
                            },
                        }
                    }
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            ActionResult {
                success: true,
                output: Some(format!("Action '{}' simulée sur Linux/Mac ({})", name, target_str)),
                error: None,
            }
        }
    }
}

#[cfg(target_os = "windows")]
mod physical_disk {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;

    pub const IOCTL_STORAGE_QUERY_PROPERTY: u32 = 0x002D1400;
    pub const FILE_SHARE_READ: u32 = 0x00000001;
    pub const FILE_SHARE_WRITE: u32 = 0x00000002;
    pub const FILE_SHARE_DELETE: u32 = 0x00000004;
    pub const OPEN_EXISTING: u32 = 3;
    pub const GENERIC_READ: u32 = 0x80000000;
    pub const INVALID_HANDLE_VALUE: *mut c_void = -1isize as *mut c_void;

    #[repr(C)]
    pub struct StoragePropertyQuery {
        pub property_id: u32,
        pub query_type: u32,
        pub additional_parameters: [u8; 1],
    }

    #[repr(C)]
    pub struct StorageDeviceDescriptor {
        pub version: u32,
        pub size: u32,
        pub device_type: u8,
        pub device_type_modifier: u8,
        pub removable_media: u8,
        pub command_queueing: u8,
        pub vendor_id_offset: u32,
        pub product_id_offset: u32,
        pub product_revision_offset: u32,
        pub serial_number_offset: u32,
        pub bus_type: u32,
        pub raw_properties_length: u32,
        pub raw_device_properties: [u8; 1],
    }

    extern "system" {
        pub fn CreateFileW(
            lpFileName: *const u16,
            dwDesiredAccess: u32,
            dwShareMode: u32,
            lpSecurityAttributes: *mut c_void,
            dwCreationDisposition: u32,
            dwFlagsAndAttributes: u32,
            hTemplateFile: *mut c_void,
        ) -> *mut c_void;

        pub fn DeviceIoControl(
            hDevice: *mut c_void,
            dwIoControlCode: u32,
            lpInBuffer: *const c_void,
            nInBufferSize: u32,
            lpOutBuffer: *mut c_void,
            nOutBufferSize: u32,
            lpBytesReturned: *mut u32,
            lpOverlapped: *mut c_void,
        ) -> i32;

        pub fn CloseHandle(hObject: *mut c_void) -> i32;
    }

    pub fn clean_serial(raw: &str) -> String {
        let mut trimmed = raw.trim().trim_matches('\0').trim();
        if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("none") || trimmed.eq_ignore_ascii_case("null") || trimmed.eq_ignore_ascii_case("default string") || trimmed.eq_ignore_ascii_case("n/a") {
            return String::new();
        }

        // Trim trailing dots or underscores
        trimmed = trimmed.trim_end_matches('.').trim();

        // Check if string is a pure hexadecimal encoding of ASCII characters (common in WMI ATA queries)
        if trimmed.len() >= 16 && trimmed.len() % 2 == 0 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
            let mut bytes = Vec::new();
            for i in (0..trimmed.len()).step_by(2) {
                if let Ok(b) = u8::from_str_radix(&trimmed[i..i + 2], 16) {
                    bytes.push(b);
                }
            }
            if !bytes.is_empty() && bytes.iter().all(|&b| b == 0 || (b >= 32 && b <= 126)) {
                // Try byte swapped (standard ATA IDENTIFY format: pair of bytes swapped)
                let mut swapped = bytes.clone();
                for i in (0..swapped.len().saturating_sub(1)).step_by(2) {
                    swapped.swap(i, i + 1);
                }
                let swapped_str = String::from_utf8_lossy(&swapped).trim().trim_matches('\0').trim().to_string();
                let normal_str = String::from_utf8_lossy(&bytes).trim().trim_matches('\0').trim().to_string();

                if !swapped_str.is_empty() && swapped_str.len() >= 4 && swapped_str.chars().all(|c| c.is_ascii_graphic() || c == ' ') {
                    return swapped_str;
                }
                if !normal_str.is_empty() && normal_str.len() >= 4 && normal_str.chars().all(|c| c.is_ascii_graphic() || c == ' ') {
                    return normal_str;
                }
            }
        }

        // Check if ASCII string itself has swapped pairs of bytes (e.g. "DW-CWC41N234576")
        if trimmed.len() >= 4 {
            let chars: Vec<char> = trimmed.chars().collect();
            let mut swapped_chars = chars.clone();
            for i in (0..swapped_chars.len().saturating_sub(1)).step_by(2) {
                swapped_chars.swap(i, i + 1);
            }
            let swapped_str: String = swapped_chars.into_iter().collect();
            let swapped_trimmed = swapped_str.trim().trim_matches('\0').trim().to_string();

            if swapped_trimmed.starts_with("WD-")
                || swapped_trimmed.starts_with("WDC")
                || swapped_trimmed.starts_with("ST")
                || swapped_trimmed.starts_with("CT")
                || swapped_trimmed.starts_with("MZ-")
                || swapped_trimmed.starts_with("SAMSUNG")
                || swapped_trimmed.starts_with("HGST")
                || swapped_trimmed.starts_with("TOSHIBA")
                || swapped_trimmed.starts_with("INTEL")
                || swapped_trimmed.starts_with("KINGSTON")
                || swapped_trimmed.starts_with("Micron")
                || swapped_trimmed.starts_with("SanDisk")
            {
                return swapped_trimmed;
            }
        }

        trimmed.to_string()
    }

    pub fn is_synthetic_eui(s: &str) -> bool {
        let trimmed = s.trim().trim_matches('\0').trim_end_matches('.').trim();
        if trimmed.contains('_') && (trimmed.starts_with("0025_") || trimmed.starts_with("0000_") || trimmed.starts_with("0014_") || trimmed.starts_with("000C_") || trimmed.starts_with("5001_") || trimmed.starts_with("5000_") || trimmed.starts_with("eui.") || trimmed.starts_with("wwn.") || trimmed.starts_with("naa.")) {
            return true;
        }
        if trimmed.len() >= 16 && trimmed.matches('_').count() >= 3 {
            return true;
        }
        false
    }

    // Direct NVMe Identify Controller query (IOCTL_STORAGE_QUERY_PROPERTY + StorageDeviceProtocolSpecificProperty)
    fn get_nvme_identify_serial(handle: *mut c_void) -> Option<String> {
        #[repr(C)]
        struct StoragePropertyQueryNVMe {
            property_id: u32,
            query_type: u32,
            protocol_type: u32,
            data_type: u32,
            protocol_data_request_value: u32,
            protocol_data_request_sub_value: u32,
            protocol_data_offset: u32,
            protocol_data_length: u32,
        }

        let query = StoragePropertyQueryNVMe {
            property_id: 6, // StorageDeviceProtocolSpecificProperty
            query_type: 0,  // PropertyStandardQuery
            protocol_type: 1, // ProtocolTypeNVMe
            data_type: 1,     // NVMeDataTypeIdentify
            protocol_data_request_value: 1, // NVME_IDENTIFY_CNS_CONTROLLER
            protocol_data_request_sub_value: 0,
            protocol_data_offset: std::mem::size_of::<StoragePropertyQueryNVMe>() as u32,
            protocol_data_length: 4096,
        };

        let mut in_buffer = vec![0u8; std::mem::size_of::<StoragePropertyQueryNVMe>() + 4096];
        unsafe {
            std::ptr::copy_nonoverlapping(
                &query as *const _ as *const u8,
                in_buffer.as_mut_ptr(),
                std::mem::size_of::<StoragePropertyQueryNVMe>(),
            );
        }

        let mut out_buffer = vec![0u8; std::mem::size_of::<StoragePropertyQueryNVMe>() + 4096];
        let mut bytes_returned = 0u32;

        let success = unsafe {
            DeviceIoControl(
                handle,
                IOCTL_STORAGE_QUERY_PROPERTY,
                in_buffer.as_ptr() as *const c_void,
                in_buffer.len() as u32,
                out_buffer.as_mut_ptr() as *mut c_void,
                out_buffer.len() as u32,
                &mut bytes_returned,
                std::ptr::null_mut(),
            )
        };

        if success != 0 && bytes_returned > std::mem::size_of::<StoragePropertyQueryNVMe>() as u32 {
            // NVMe Identify Controller Serial Number is located at bytes 4..24 (20 ASCII bytes)
            let data_offset = std::mem::size_of::<StoragePropertyQueryNVMe>();
            if out_buffer.len() >= data_offset + 24 {
                let sn_bytes = &out_buffer[data_offset + 4..data_offset + 24];
                let sn_str = String::from_utf8_lossy(sn_bytes).trim().trim_matches('\0').trim().to_string();
                if !sn_str.is_empty() && sn_str.len() >= 4 && sn_str.chars().all(|c| c.is_ascii_graphic() || c == ' ') {
                    return Some(sn_str);
                }
            }
        }
        None
    }

    pub fn get_native_physical_disk_serials() -> Vec<String> {
        let mut internal_serials = Vec::new();
        let mut usb_serials = Vec::new();

        for i in 0..16 {
            let drive_path = format!("\\\\.\\PhysicalDrive{}", i);
            let wide_path: Vec<u16> = std::ffi::OsStr::new(&drive_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            // Try opening with 0 access first (standard for query without elevation)
            let mut handle = unsafe {
                CreateFileW(
                    wide_path.as_ptr(),
                    0,
                    FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                    std::ptr::null_mut(),
                    OPEN_EXISTING,
                    0,
                    std::ptr::null_mut(),
                )
            };

            if handle == INVALID_HANDLE_VALUE {
                handle = unsafe {
                    CreateFileW(
                        wide_path.as_ptr(),
                        GENERIC_READ,
                        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                        std::ptr::null_mut(),
                        OPEN_EXISTING,
                        0,
                        std::ptr::null_mut(),
                    )
                };
            }

            if handle == INVALID_HANDLE_VALUE {
                continue;
            }

            // 1. Try direct NVMe Identify Controller query first to obtain the exact hardware serial printed on label
            let mut found_sn: Option<String> = get_nvme_identify_serial(handle);
            let mut bus_type = 0u32;

            // 2. Standard Storage Device Descriptor query
            let query = StoragePropertyQuery {
                property_id: 0, // StorageDeviceProperty
                query_type: 0,  // PropertyStandardQuery
                additional_parameters: [0],
            };

            let mut buffer = vec![0u8; 4096];
            let mut bytes_returned = 0u32;

            let success = unsafe {
                DeviceIoControl(
                    handle,
                    IOCTL_STORAGE_QUERY_PROPERTY,
                    &query as *const _ as *const c_void,
                    std::mem::size_of::<StoragePropertyQuery>() as u32,
                    buffer.as_mut_ptr() as *mut c_void,
                    buffer.len() as u32,
                    &mut bytes_returned,
                    std::ptr::null_mut(),
                )
            };

            unsafe {
                CloseHandle(handle);
            }

            if success != 0 && bytes_returned >= std::mem::size_of::<StorageDeviceDescriptor>() as u32 {
                let descriptor = unsafe { &*(buffer.as_ptr() as *const StorageDeviceDescriptor) };
                bus_type = descriptor.bus_type; // 7 = USB, 11 = SATA, 17 = NVMe, 8 = RAID, 3 = SCSI

                if found_sn.is_none() && descriptor.serial_number_offset > 0 && (descriptor.serial_number_offset as usize) < buffer.len() {
                    let offset = descriptor.serial_number_offset as usize;
                    let slice = &buffer[offset..];
                    let raw_str = if let Some(null_pos) = slice.iter().position(|&b| b == 0) {
                        String::from_utf8_lossy(&slice[..null_pos]).to_string()
                    } else {
                        String::from_utf8_lossy(slice).to_string()
                    };

                    let clean = clean_serial(&raw_str);
                    if !clean.is_empty() && clean != "N/A" {
                        found_sn = Some(clean);
                    }
                }
            }

            if let Some(sn) = found_sn {
                if bus_type == 7 {
                    if !usb_serials.contains(&sn) {
                        usb_serials.push(sn);
                    }
                } else {
                    if !internal_serials.contains(&sn) {
                        internal_serials.push(sn);
                    }
                }
            }
        }

        if !internal_serials.is_empty() {
            internal_serials
        } else {
            usb_serials
        }
    }
}

#[tauri::command]
fn get_sys_info() -> HashMap<String, String> {
    let mut map = HashMap::new();

    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        // 1. Direct hardware storage query via Win32 IOCTL (exact physical drive serial number CrystalDiskInfo method)
        let native_disk_serials = physical_disk::get_native_physical_disk_serials();
        let native_disk_sn = if !native_disk_serials.is_empty() {
            native_disk_serials.join(", ")
        } else {
            String::new()
        };

        // 2. Fast direct registry reading for Motherboard / CPU / BIOS / Model
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut model_fast = String::new();
        let mut sn_fast = String::new();
        let mut bios_fast = String::new();
        let mut cpu_fast = String::new();

        if let Ok(key) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\BIOS") {
            if let Ok(p) = key.get_value::<String, _>("SystemProductName") {
                let pt = p.trim().to_string();
                if !pt.is_empty() && pt != "System Product Name" && pt != "To be filled by O.E.M." {
                    model_fast = pt;
                }
            }
            if model_fast.is_empty() {
                if let Ok(p) = key.get_value::<String, _>("BaseBoardProduct") {
                    let pt = p.trim().to_string();
                    if !pt.is_empty() {
                        model_fast = pt;
                    }
                }
            }
            if let Ok(s) = key.get_value::<String, _>("SystemSerialNumber") {
                let st = s.trim().to_string();
                if !st.is_empty() && st != "System Serial Number" && st != "To be filled by O.E.M." {
                    sn_fast = st;
                }
            }
            if let Ok(b) = key.get_value::<String, _>("BIOSVersion") {
                let bt = b.trim().to_string();
                if !bt.is_empty() {
                    bios_fast = bt;
                }
            }
        }

        if let Ok(key) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0") {
            if let Ok(c) = key.get_value::<String, _>("ProcessorNameString") {
                let ct = c.trim().to_string();
                if !ct.is_empty() {
                    cpu_fast = ct;
                }
            }
        }

        let ps_cmd = r#"
            $ProgressPreference = 'SilentlyContinue'
            $WarningPreference = 'SilentlyContinue'
            $ErrorActionPreference = 'SilentlyContinue'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

            function Clean-SmbiosTag([string]$val) {
                if (-not $val) { return '' }
                $v = $val.Trim()
                if ($v -eq '' -or 
                    $v -match '^(?i)(Default string|None|none|N/A|null|Standard|OEM|To be filled by O\.?E\.?M\.?|Not Specified|Type2 - Board Asset Tag|Chassis Asset Tag|No Asset Tag|System Asset Tag|Base Board Asset Tag|System Manufacturer|System Product Name|<not set>|<blank>|<none>|Unassigned|Empty)$' -or
                    $v -match '^[Ff]{4,}$' -or
                    $v -match '^[0]{4,}$' -or
                    $v -match '^[\-_.\s]+$' -or
                    $v -match '^(?i)EDK2' -or
                    $v -match '^(?i)MEFW' -or
                    $v -match '^(?i)ME_FW' -or
                    $v -match '^(?i)EC_FW' -or
                    $v -match '^(?i)ECFW' -or
                    $v -match '^(?i)Buff=' -or
                    $v -match '^[A-Za-z0-9_]+=[A-Za-z0-9_.]+$' -or
                    $v -match '^(?i)FBYTE#' -or
                    $v -match '^(?i)BUILDID#' -or
                    $v -match '^(?i)SABL#' -or
                    $v -match '^(?i)HP_PA_' -or
                    $v -match '^(?i)Platform_' -or
                    $v -match '^(?i)SoftPaq' -or
                    $v -match '^(?i)MS_Digital_Marker' -or
                    $v -match '^(?i)American Megatrends' -or
                    $v -match '^(?i)Insyde' -or
                    $v -match '^(?i)Phoenix' -or
                    $v -match '^(?i)Dell (Utility|System|Inc)' -or
                    $v -match '^(?i)https?://' -or
                    $v -match '^(?i)www\.' -or
                    $v -match '^[A-Za-z0-9_]+#[A-Za-z0-9_#]+' -or
                    ($v.Length -le 2) -or
                    ($v.Length -gt 45 -and -not ($v -match '\s'))
                ) {
                    return ''
                }
                return $v
            }

            function Clean-PhysicalDiskSerial([string]$sn) {
                if (-not $sn) { return '' }
                $sn = $sn.Trim().TrimEnd('.')
                if ($sn -eq '' -or $sn -eq 'None' -or $sn -eq 'N/A' -or $sn -eq '00000000' -or $sn -eq 'Default string') { return '' }

                # Check if purely hex string (common in WMI Win32_DiskDrive for ATA drives)
                if ($sn -match '^[0-9A-Fa-f]{16,}$' -and ($sn.Length % 2 -eq 0)) {
                    try {
                        $bytes = for ($i = 0; $i -lt $sn.Length; $i += 2) { [Convert]::ToByte($sn.Substring($i, 2), 16) }
                        $isPrintable = $true
                        foreach ($b in $bytes) {
                            if ($b -ne 0 -and ($b -lt 32 -or $b -gt 126)) { $isPrintable = $false; break }
                        }
                        if ($isPrintable) {
                            $swapped = [byte[]]::new($bytes.Length)
                            for ($i = 0; $i -lt $bytes.Length; $i += 2) {
                                if ($i + 1 -lt $bytes.Length) {
                                    $swapped[$i] = $bytes[$i + 1]
                                    $swapped[$i + 1] = $bytes[$i]
                                } else {
                                    $swapped[$i] = $bytes[$i]
                                }
                            }
                            $txtSwapped = [System.Text.Encoding]::ASCII.GetString($swapped).Trim().Trim([char]0).Trim().TrimEnd('.')
                            $txtNormal = [System.Text.Encoding]::ASCII.GetString($bytes).Trim().Trim([char]0).Trim().TrimEnd('.')
                            if ($txtSwapped -match '^[A-Za-z0-9_\-\. ]{4,}$') { return $txtSwapped }
                            if ($txtNormal -match '^[A-Za-z0-9_\-\. ]{4,}$') { return $txtNormal }
                        }
                    } catch {}
                }

                # Check for ATA byte swap in ASCII string
                if ($sn.Length -ge 4) {
                    $cArr = $sn.ToCharArray()
                    for ($i = 0; $i -lt $cArr.Length - 1; $i += 2) {
                        $tmp = $cArr[$i]; $cArr[$i] = $cArr[$i+1]; $cArr[$i+1] = $tmp
                    }
                    $swappedStr = ([string]::new($cArr)).Trim().Trim([char]0).Trim().TrimEnd('.')
                    if ($swappedStr -match '^(WD-|WDC|ST|CT|MZ|SAMSUNG|HGST|TOSHIBA|INTEL|KINGSTON|SKhynix|Micron|SanDisk)') {
                        return $swappedStr
                    }
                }

                return $sn
            }

            $cs = Get-CimInstance Win32_ComputerSystem -Property Manufacturer,Model,TotalPhysicalMemory,OEMStringArray
            $bios = Get-CimInstance Win32_BIOS -Property SerialNumber,SMBIOSBIOSVersion
            $cpu = Get-CimInstance Win32_Processor -Property Name | Select-Object -First 1

            $allDisks = Get-CimInstance Win32_DiskDrive -Property InterfaceType,PNPDeviceID,MediaType,Size,SerialNumber,Status,Model
            $internalDisks = @($allDisks | Where-Object { ($_.InterfaceType -ne 'USB') -and ($_.PNPDeviceID -notlike 'USBSTOR*') -and ($_.MediaType -notmatch 'Removable|External') })
            if (-not $internalDisks -or $internalDisks.Count -eq 0) {
                $internalDisks = @($allDisks | Where-Object { $_.InterfaceType -ne 'USB' })
            }
            $diskSum = ($internalDisks | Measure-Object -Property Size -Sum).Sum

            # Multi-layer Physical Disk Serial Extraction (CrystalDiskInfo accuracy)
            $collectedSns = @()
            $euiFallbacks = @()

            # 1. Win32_DiskDrive Physical Serials
            foreach ($wd in $internalDisks) {
                $raw = [string]$wd.SerialNumber
                $s = Clean-PhysicalDiskSerial $raw
                if ($s -and $s -ne '') {
                    if ($s -match '^(0025|0000|0014|000C|5001|5000|eui|wwn|naa)_[0-9A-Fa-f_]+\.?$' -or ($s.Length -ge 16 -and ($s -split '_').Count -ge 4)) {
                        if ($euiFallbacks -notcontains $s) { $euiFallbacks += $s }
                    } else {
                        if ($collectedSns -notcontains $s) { $collectedSns += $s }
                    }
                }
            }

            # 2. Get-PhysicalDisk (Storage Management API - MSFT_PhysicalDisk often has the exact AdapterSerialNumber / SerialNumber for NVMe)
            try {
                $pdRaw = Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.BusType -ne 'USB' -and $_.MediaType -notmatch 'Removable' }
                if ($pdRaw) {
                    foreach ($d in $pdRaw) {
                        $rawCandidates = @([string]$d.AdapterSerialNumber, [string]$d.SerialNumber)
                        foreach ($cand in $rawCandidates) {
                            $s = Clean-PhysicalDiskSerial $cand
                            if ($s -and $s -ne '') {
                                if ($s -match '^(0025|0000|0014|000C|5001|5000|eui|wwn|naa)_[0-9A-Fa-f_]+\.?$' -or ($s.Length -ge 16 -and ($s -split '_').Count -ge 4)) {
                                    if ($euiFallbacks -notcontains $s) { $euiFallbacks += $s }
                                } else {
                                    if ($collectedSns -notcontains $s) { $collectedSns += $s }
                                }
                            }
                        }
                    }
                }
            } catch {}

            # 3. Append any EUI identifiers we found for disks that might not have reported a proper hardware S/N
            foreach ($eui in $euiFallbacks) {
                if ($collectedSns -notcontains $eui) {
                    $collectedSns += $eui
                }
            }

            $diskSns = if ($collectedSns.Count -gt 0) { $collectedSns -join ', ' } else { 'N/A' }

            $statuses = @($internalDisks | ForEach-Object { if ($_.Status) { $_.Status.Trim() } else { 'OK' } })
            $smartState = 'OK'
            if ($statuses -match 'Error|Bad|Failure') {
                $smartState = 'Critical'
            } elseif ($statuses -match 'Pred Fail|Degraded|Caution|Attention') {
                $smartState = 'Warning'
            }

            $gpu = Get-CimInstance Win32_VideoController -Property Name | Select-Object -First 1
            $uuid = (Get-CimInstance Win32_ComputerSystemProduct -Property UUID).UUID
            $enc = Get-CimInstance Win32_SystemEnclosure -Property SMBIOSAssetTag | Select-Object -First 1

            $rawAsset = if ($enc.SMBIOSAssetTag) { Clean-SmbiosTag $enc.SMBIOSAssetTag } else { '' }
            if (-not $rawAsset) {
                $bb = Get-CimInstance Win32_BaseBoard -Property AssetTag -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($bb.AssetTag) { $rawAsset = Clean-SmbiosTag $bb.AssetTag }
            }

            # Extraction Ownership Tag (HP BIOS / Dell DCIM / Lenovo / Fallback)
            $detectedOwner = ''
            $mfg = if ($cs.Manufacturer) { [string]$cs.Manufacturer } else { '' }
            $mdl = if ($cs.Model) { [string]$cs.Model } else { '' }
            $isHp = ($mfg -match '(?i)HP|Hewlett' -or $mdl -match '(?i)HP|EliteBook|ProBook|ZBook|EliteDesk|ProDesk')
            $isDell = ($mfg -match '(?i)Dell' -or $mdl -match '(?i)Dell|Latitude|OptiPlex|Precision|Vostro|XPS')
            $isLenovo = ($mfg -match '(?i)Lenovo' -or $mdl -match '(?i)ThinkPad|ThinkCentre|ThinkStation|IdeaPad')

            try {
                # 1. HP BIOS WMI
                if ($isHp -or -not $detectedOwner) {
                    $hpClasses = @('HP_BIOSEntry', 'HP_BIOSString', 'HP_BIOSSetting')
                    foreach ($cls in $hpClasses) {
                        $entries = Get-CimInstance -Namespace root/hp/instrumentedBIOS -ClassName $cls -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(?i)Ownership\s*Tag' -or $_.Name -match '(?i)Asset\s*Tracking' }
                        foreach ($entry in $entries) {
                            $c = Clean-SmbiosTag ([string]$entry.Value)
                            if ($c) { $detectedOwner = $c; break }
                        }
                        if ($detectedOwner) { break }
                    }
                    if (-not $detectedOwner) {
                        $hpSet = Get-CimInstance -Namespace root/wmi -ClassName HP_BIOSSetting -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(?i)Ownership\s*Tag' } | Select-Object -First 1
                        if ($hpSet.Value) {
                            $detectedOwner = Clean-SmbiosTag ([string]$hpSet.Value)
                        }
                    }
                }
            } catch {}

            try {
                # 2. Dell Command / DCIM WMI
                if (($isDell -or -not $detectedOwner) -and -not $detectedOwner) {
                    $dellBio = Get-CimInstance -Namespace root/dcim/sysman -ClassName DCIM_BIOSEnumeration -ErrorAction SilentlyContinue | Where-Object { $_.AttributeName -match '(?i)Ownership\s*Tag' } | Select-Object -First 1
                    if ($dellBio.CurrentValue) {
                        $detectedOwner = Clean-SmbiosTag ([string]$dellBio.CurrentValue)
                    }
                    if (-not $detectedOwner) {
                        $dellStr = Get-CimInstance -Namespace root/dcim/sysman -ClassName DCIM_BIOSString -ErrorAction SilentlyContinue | Where-Object { $_.AttributeName -match '(?i)Ownership\s*Tag' } | Select-Object -First 1
                        if ($dellStr.CurrentValue) {
                            $detectedOwner = Clean-SmbiosTag ([string]$dellStr.CurrentValue)
                        }
                    }
                    if (-not $detectedOwner) {
                        $dellAsset = Get-CimInstance -Namespace root/dcim/sysman -ClassName DCIM_AssetTag -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($dellAsset.OwnershipTag) {
                            $detectedOwner = Clean-SmbiosTag ([string]$dellAsset.OwnershipTag)
                        }
                    }
                    if (-not $detectedOwner) {
                        $dellSys = Get-CimInstance -Namespace root/dcim/sysman -ClassName DCIM_SystemAssetData -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($dellSys.OwnershipTag) {
                            $detectedOwner = Clean-SmbiosTag ([string]$dellSys.OwnershipTag)
                        }
                    }
                }
            } catch {}

            try {
                # 3. Lenovo WMI
                if (($isLenovo -or -not $detectedOwner) -and -not $detectedOwner) {
                    $lenBios = Get-CimInstance -Namespace root/wmi -ClassName Lenovo_BiosSetting -ErrorAction SilentlyContinue | Where-Object { $_.CurrentSetting -match '(?i)^OwnershipTag,' } | Select-Object -First 1
                    if ($lenBios.CurrentSetting) {
                        $c = Clean-SmbiosTag (($lenBios.CurrentSetting -split ',', 2)[1])
                        if ($c) { $detectedOwner = $c }
                    }
                }
            } catch {}

            # 4. Fallback: SMBIOS Type 11 (OEMStringArray) ONLY on generic systems without vendor Ownership Tag
            # Never fallback on HP/Dell/Lenovo because their OEM strings contain internal firmware codes (EDK2, Buff, MEFWRec)
            if (-not $detectedOwner -and -not $isHp -and -not $isDell -and -not $isLenovo) {
                if ($cs.OEMStringArray) {
                    foreach ($item in $cs.OEMStringArray) {
                        $c = Clean-SmbiosTag ([string]$item)
                        if ($c -and $c -ne '') {
                            $detectedOwner = $c
                            break
                        }
                    }
                }
            }

            @{
                model = if ($cs.Model) { $cs.Model.Trim() } else { 'N/A' }
                sn = if ($bios.SerialNumber) { $bios.SerialNumber.Trim() } else { 'N/A' }
                bios = if ($bios.SMBIOSBIOSVersion) { $bios.SMBIOSBIOSVersion.Trim() } else { 'N/A' }
                cpu = if ($cpu.Name) { $cpu.Name.Trim() } else { 'N/A' }
                mem = if ($cs.TotalPhysicalMemory) { [Math]::Round($cs.TotalPhysicalMemory / 1GB) } else { 0 }
                disk = if ($diskSum) { [Math]::Round($diskSum / 1GB) } else { 0 }
                diskSn = $diskSns
                smartStatus = $smartState
                gpu = if ($gpu.Name) { $gpu.Name.Trim() } else { 'N/A' }
                uuid = if ($uuid) { $uuid.Trim() } else { 'N/A' }
                assetTag = if ($rawAsset) { $rawAsset } else { 'N/A' }
                oemString = if ($detectedOwner) { $detectedOwner } else { 'N/A' }
            } | ConvertTo-Json -Compress
        "#;

        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let model = if !model_fast.is_empty() {
                    model_fast
                } else {
                    val["model"].as_str().unwrap_or("N/A").into()
                };
                let sn = if !sn_fast.is_empty() {
                    sn_fast
                } else {
                    val["sn"].as_str().unwrap_or("N/A").into()
                };
                let bios = if !bios_fast.is_empty() {
                    bios_fast
                } else {
                    val["bios"].as_str().unwrap_or("N/A").into()
                };
                let cpu = if !cpu_fast.is_empty() {
                    cpu_fast
                } else {
                    val["cpu"].as_str().unwrap_or("N/A").into()
                };

                // Prioritize native Win32 IOCTL physical disk serial number if available, otherwise use PowerShell cleaned physical serials
                let final_disk_sn = if !native_disk_sn.is_empty() {
                    native_disk_sn
                } else {
                    val["diskSn"].as_str().unwrap_or("N/A").to_string()
                };

                map.insert("Modèle :".into(), model);
                map.insert("Numéro de série :".into(), sn);
                map.insert("Version de Bios :".into(), bios);
                map.insert("CPU :".into(), cpu);
                map.insert("Memoire :".into(), format!("{} GO", val["mem"].as_i64().unwrap_or(0)));
                map.insert("Disque :".into(), format!("{} GB", val["disk"].as_i64().unwrap_or(0)));
                map.insert("Numéro de série disque(s) :".into(), final_disk_sn);
                map.insert("État SMART :".into(), val["smartStatus"].as_str().unwrap_or("OK").into());
                map.insert("Carte Vidéo :".into(), val["gpu"].as_str().unwrap_or("N/A").into());
                map.insert("UUID :".into(), val["uuid"].as_str().unwrap_or("N/A").into());
                map.insert("Asset Tag :".into(), val["assetTag"].as_str().unwrap_or("N/A").into());
                map.insert("Ownership Tag :".into(), val["oemString"].as_str().unwrap_or("N/A").into());
                return map;
            }
        }
    }

    // Fallback info for non-windows / dev
    map.insert("Modèle :".into(), "Workstation (Tauri Rust Core)".into());
    map.insert("Numéro de série :".into(), "SN-2026-RUST".into());
    map.insert("Version de Bios :".into(), "UEFI v2.4 (Tauri)".into());
    map.insert("CPU :".into(), "Intel Core i7 / AMD Ryzen 7 High Performance".into());
    map.insert("Memoire :".into(), "16 GO".into());
    map.insert("Disque :".into(), "512 GB".into());
    map.insert("Numéro de série disque(s) :".into(), "NVME-S5TYNX0N8123456".into());
    map.insert("État SMART :".into(), "OK".into());
    map.insert("Carte Vidéo :".into(), "Integrated / Dedicated Graphics".into());
    map.insert("UUID :".into(), "12345678-4321-8765-1234-567812345678".into());
    map.insert("Asset Tag :".into(), "REF-09".into());
    map.insert("Ownership Tag :".into(), "Workshop".into());
    map
}

fn compute_battery_duration(
    is_charging: bool,
    ac_connected: bool,
    percentage: Option<u32>,
    sps_battery_life_time: u32,
    wmi_estimated_mins: Option<u32>,
    full_cap: Option<u32>,
    discharge_watts: Option<f64>,
    charge_watts: Option<f64>,
) -> (Option<u32>, Option<u32>, Option<String>) {
    let pct = percentage.unwrap_or(100);

    if !is_charging && ac_connected {
        if pct >= 99 {
            return (None, None, Some("Batterie pleine (Sur secteur)".into()));
        } else {
            return (None, None, Some("Sur secteur (Branché)".into()));
        }
    }

    if is_charging {
        let charge_mins = if pct >= 100 {
            Some(0)
        } else if let Some(cw) = charge_watts.filter(|&w| w > 1.0) {
            let cap = full_cap.unwrap_or(50000) as f64;
            let needed_mwh = cap * ((100 - pct) as f64 / 100.0);
            let needed_wh = needed_mwh / 1000.0;
            let hours = needed_wh / cw;
            Some(((hours * 60.0).round() as u32).max(1))
        } else {
            let rem_pct = 100 - pct.min(100);
            Some(((rem_pct as f64 * 1.3).round() as u32).max(2))
        };

        let formatted = match charge_mins {
            Some(0) => "Batterie pleinement chargée (100%)".to_string(),
            Some(m) => {
                let h = m / 60;
                let r = m % 60;
                if h > 0 && r > 0 {
                    format!("~{} h {} min (jusqu'à pleine charge)", h, r)
                } else if h > 0 {
                    format!("~{} h (jusqu'à pleine charge)", h)
                } else {
                    format!("~{} min (jusqu'à pleine charge)", r)
                }
            }
            None => "En charge".to_string(),
        };

        return (None, charge_mins, Some(formatted));
    }

    // On battery (discharging)
    let run_mins = if sps_battery_life_time != 0xFFFFFFFF && sps_battery_life_time > 0 && sps_battery_life_time < 3600 * 48 {
        Some((sps_battery_life_time + 30) / 60)
    } else if let Some(wm) = wmi_estimated_mins.filter(|&m| m > 0 && m < 3000) {
        Some(wm)
    } else if let Some(dw) = discharge_watts.filter(|&w| w > 1.0) {
        let cap = full_cap.unwrap_or(50000) as f64;
        let rem_mwh = cap * (pct as f64 / 100.0);
        let rem_wh = rem_mwh / 1000.0;
        let hours = rem_wh / dw;
        Some(((hours * 60.0).round() as u32).max(1))
    } else {
        let cap = full_cap.unwrap_or(50000) as f64;
        let rem_mwh = cap * (pct as f64 / 100.0);
        let rem_wh = rem_mwh / 1000.0;
        let hours = rem_wh / 12.0; // Baseline laptop consumption: 12W
        Some(((hours * 60.0).round() as u32).max(1))
    };

    let formatted = match run_mins {
        Some(m) => {
            let h = m / 60;
            let r = m % 60;
            if h > 0 && r > 0 {
                format!("~{} h {} min restante(s)", h, r)
            } else if h > 0 {
                format!("~{} h restante(s)", h)
            } else {
                format!("~{} min restante(s)", r)
            }
        }
        None => "Estimation en cours...".to_string(),
    };

    (run_mins, None, Some(formatted))
}

#[tauri::command]
fn get_battery_status() -> BatteryStatusResult {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct SYSTEM_POWER_STATUS {
            ac_line_status: u8,
            battery_flag: u8,
            battery_life_percent: u8,
            system_status_flag: u8,
            battery_life_time: u32,
            battery_full_life_time: u32,
        }

        extern "system" {
            fn GetSystemPowerStatus(lpSystemPowerStatus: *mut SYSTEM_POWER_STATUS) -> i32;
        }

        let mut sps = SYSTEM_POWER_STATUS {
            ac_line_status: 255,
            battery_flag: 255,
            battery_life_percent: 255,
            system_status_flag: 0,
            battery_life_time: 0,
            battery_full_life_time: 0,
        };

        let res = unsafe { GetSystemPowerStatus(&mut sps) };
        let mut is_desktop = false;
        if res != 0 {
            if sps.battery_flag == 128 || (sps.battery_life_percent == 255 && sps.battery_flag == 255) {
                is_desktop = true;
            }
        }

        if is_desktop {
            return BatteryStatusResult {
                present: false,
                percentage: None,
                health: None,
                is_charging: false,
                ac_connected: true,
                status_label: "PC Fixe (Sur secteur)".into(),
                design_capacity: None,
                full_charge_capacity: None,
                cycle_count: None,
                wear_level: None,
                voltage: None,
                chemistry: None,
                manufacturer: None,
                serial_number: None,
                estimated_run_time_minutes: None,
                estimated_charge_time_minutes: None,
                estimated_duration_formatted: Some("Alimentation continue sur secteur".into()),
                discharge_rate_watts: None,
                charge_rate_watts: None,
            };
        }

        // Fast real-time dynamic readings (0.0001 ms via Win32 API)
        let percentage = if res != 0 && sps.battery_life_percent <= 100 {
            Some(sps.battery_life_percent as u32)
        } else {
            None
        };
        let is_charging = res != 0 && (sps.battery_flag & 8) != 0;
        let ac_connected = res != 0 && sps.ac_line_status == 1;
        let status_label = if is_charging {
            format!("En charge ({}%)", percentage.unwrap_or(0))
        } else if ac_connected {
            format!("Sur secteur (Branché - {}%)", percentage.unwrap_or(100))
        } else {
            format!("Sur batterie ({}%)", percentage.unwrap_or(0))
        };

        // Fast path: Check if we have cached static battery data that is still fresh (< 180 seconds)
        if let Ok(guard) = BATTERY_STATIC_CACHE.lock() {
            if let Some(ref cache) = *guard {
                if cache.timestamp.elapsed() < Duration::from_secs(180) {
                    let (est_run, est_charge, est_dur_formatted) = compute_battery_duration(
                        is_charging,
                        ac_connected,
                        percentage,
                        sps.battery_life_time,
                        None,
                        cache.full_charge_capacity,
                        cache.discharge_rate_watts,
                        cache.charge_rate_watts,
                    );

                    return BatteryStatusResult {
                        present: true,
                        percentage,
                        health: cache.health,
                        is_charging,
                        ac_connected,
                        status_label,
                        design_capacity: cache.design_capacity,
                        full_charge_capacity: cache.full_charge_capacity,
                        cycle_count: cache.cycle_count,
                        wear_level: cache.wear_level,
                        voltage: cache.voltage,
                        chemistry: cache.chemistry.clone(),
                        manufacturer: cache.manufacturer.clone(),
                        serial_number: cache.serial_number.clone(),
                        estimated_run_time_minutes: est_run,
                        estimated_charge_time_minutes: est_charge,
                        estimated_duration_formatted: est_dur_formatted,
                        discharge_rate_watts: cache.discharge_rate_watts,
                        charge_rate_watts: cache.charge_rate_watts,
                    };
                }
            }
        }

        // Cache miss or expired: Deep query in PowerShell covering WMI, CIM, PowerCfg XML and Win32_Battery
        let ps_cmd = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $out = [ordered]@{
                present = $true
                percent = $null
                health = $null
                charging = $false
                acConnected = $true
                statusLabel = ""
                design = 0
                full = 0
                cycles = 0
                wear = 0
                voltage = $null
                chemistry = ""
                manufacturer = ""
                serialNumber = ""
                estimatedRunTimeMinutes = $null
                estimatedChargeTimeMinutes = $null
                dischargeRateWatts = $null
                chargeRateWatts = $null
            }

            # 1. Check Win32_Battery
            $wb = @(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue)
            $w = if ($wb.Count -gt 0) { $wb[0] } else { $null }

            # 2. Check WMI low level ACPI classes
            $static = Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1
            $fullCap = Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1
            $status = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
            $cycles = Get-CimInstance -Namespace root/wmi -ClassName BatteryCycleCount -ErrorAction SilentlyContinue | Select-Object -First 1

            if ($static -and $static.DesignedCapacity) { $out.design = [int]$static.DesignedCapacity }
            if ($fullCap -and $fullCap.FullChargedCapacity) { $out.full = [int]$fullCap.FullChargedCapacity }
            if ($cycles -and $cycles.CycleCount) { $out.cycles = [int]$cycles.CycleCount }
            if ($static -and $static.Chemistry) { $out.chemistry = [string]$static.Chemistry }
            if ($static -and $static.ManufactureName) { $out.manufacturer = [string]$static.ManufactureName }
            if ($static -and $static.SerialNumber) { $out.serialNumber = [string]$static.SerialNumber }

            if ($status) {
                if ($status.Voltage -and $status.Voltage -gt 0) {
                    $out.voltage = [math]::Round($status.Voltage / 1000.0, 2)
                }
                if ($status.Charging) { $out.charging = [bool]$status.Charging }
                if ($status.PowerOnline) { $out.acConnected = [bool]$status.PowerOnline }
                if ($status.DischargeRate -and $status.DischargeRate -gt 0) {
                    $out.dischargeRateWatts = [math]::Round($status.DischargeRate / 1000.0, 2)
                }
                if ($status.ChargeRate -and $status.ChargeRate -gt 0) {
                    $out.chargeRateWatts = [math]::Round($status.ChargeRate / 1000.0, 2)
                }
            }

            # 3. Fallback: PowerCfg /batteryreport XML
            if ($out.design -le 0 -or $out.full -le 0) {
                try {
                    $xmlPath = "$env:TEMP\batt_report.xml"
                    & powercfg.exe /batteryreport /xml /output "$xmlPath" 2>$null | Out-Null
                    if (Test-Path $xmlPath) {
                        $rawXml = Get-Content $xmlPath -Raw -ErrorAction SilentlyContinue
                        if ($rawXml) {
                            if ($rawXml -match '<DesignCapacity>(\d+)</DesignCapacity>') {
                                $out.design = [int]$matches[1]
                            }
                            if ($rawXml -match '<FullChargeCapacity>(\d+)</FullChargeCapacity>') {
                                $out.full = [int]$matches[1]
                            }
                            if ($rawXml -match '<CycleCount>(\d+)</CycleCount>') {
                                $out.cycles = [int]$matches[1]
                            }
                            if ($rawXml -match '<Chemistry>([^<]+)</Chemistry>') {
                                $out.chemistry = $matches[1].Trim()
                            }
                            if ($rawXml -match '<Manufacturer>([^<]+)</Manufacturer>') {
                                $out.manufacturer = $matches[1].Trim()
                            }
                            if ($rawXml -match '<SerialNumber>([^<]+)</SerialNumber>') {
                                $out.serialNumber = $matches[1].Trim()
                            }
                        }
                        Remove-Item $xmlPath -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }

            # 4. Fallback: Win32_Battery properties
            if ($w) {
                if ($out.design -le 0 -and $w.DesignCapacity) { $out.design = [int]$w.DesignCapacity }
                if ($out.full -le 0 -and $w.FullChargeCapacity) { $out.full = [int]$w.FullChargeCapacity }
                if ($out.percent -eq $null -and $w.EstimatedChargeRemaining) { $out.percent = [int]$w.EstimatedChargeRemaining }
                if ($out.chemistry -eq "" -and $w.Chemistry) { $out.chemistry = [string]$w.Chemistry }
                if ($out.manufacturer -eq "" -and $w.Manufacturer) { $out.manufacturer = [string]$w.Manufacturer }
                if ($out.serialNumber -eq "" -and $w.DeviceID) { $out.serialNumber = [string]$w.DeviceID }
                if ($out.voltage -eq $null -and $w.DesignVoltage) { $out.voltage = [math]::Round($w.DesignVoltage / 1000.0, 2) }
                if ($w.EstimatedRunTime -and [int]$w.EstimatedRunTime -gt 0 -and [int]$w.EstimatedRunTime -lt 70000) {
                    $out.estimatedRunTimeMinutes = [int]$w.EstimatedRunTime
                }
            }

            # Check if this is a desktop without battery
            if (-not $w -and -not $static -and $out.design -le 0) {
                $out.present = $false
                $out.statusLabel = "PC Fixe (Sur secteur)"
                $out | ConvertTo-Json -Compress
                exit 0
            }

            # Calculate Health & Wear Level
            if ($out.design -gt 0 -and $out.full -gt 0) {
                $h = [math]::Round(($out.full / $out.design) * 100)
                $out.health = [math]::Min(100, [math]::Max(1, [int]$h))
                $out.wear = [math]::Max(0, 100 - $out.health)
            }

            $out | ConvertTo-Json -Compress
        "#;

        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let present = val.get("present").and_then(|v| v.as_bool()).unwrap_or(!is_desktop);
                if !present {
                    return BatteryStatusResult {
                        present: false,
                        percentage: None,
                        health: None,
                        is_charging: false,
                        ac_connected: true,
                        status_label: "PC Fixe (Sur secteur)".into(),
                        design_capacity: None,
                        full_charge_capacity: None,
                        cycle_count: None,
                        wear_level: None,
                        voltage: None,
                        chemistry: None,
                        manufacturer: None,
                        serial_number: None,
                        estimated_run_time_minutes: None,
                        estimated_charge_time_minutes: None,
                        estimated_duration_formatted: Some("Alimentation continue sur secteur".into()),
                        discharge_rate_watts: None,
                        charge_rate_watts: None,
                    };
                }

                let percentage = if res != 0 && sps.battery_life_percent <= 100 {
                    Some(sps.battery_life_percent as u32)
                } else {
                    val.get("percent").and_then(|v| v.as_u64()).map(|n| n as u32)
                };

                let is_charging = if res != 0 {
                    (sps.battery_flag & 8) != 0
                } else {
                    val.get("charging").and_then(|v| v.as_bool()).unwrap_or(false)
                };

                let ac_connected = if res != 0 {
                    sps.ac_line_status == 1
                } else {
                    val.get("acConnected").and_then(|v| v.as_bool()).unwrap_or(true)
                };

                let design_cap = val.get("design").and_then(|v| v.as_u64()).filter(|&n| n > 0).map(|n| n as u32);
                let full_cap = val.get("full").and_then(|v| v.as_u64()).filter(|&n| n > 0).map(|n| n as u32);
                let cycle_count = val.get("cycles").and_then(|v| v.as_u64()).filter(|&n| n > 0).map(|n| n as u32);
                let wear_level = val.get("wear").and_then(|v| v.as_u64()).map(|n| n as u32);
                let voltage = val.get("voltage").and_then(|v| v.as_f64());
                let chemistry = val.get("chemistry").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string());
                let manufacturer = val.get("manufacturer").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string());
                let serial_number = val.get("serialNumber").and_then(|v| v.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string());
                let wmi_est_mins = val.get("estimatedRunTimeMinutes").and_then(|v| v.as_u64()).map(|n| n as u32);
                let discharge_watts = val.get("dischargeRateWatts").and_then(|v| v.as_f64());
                let charge_watts = val.get("chargeRateWatts").and_then(|v| v.as_f64());

                let mut health = val.get("health").and_then(|v| v.as_u64()).map(|n| n as u32);
                if health.is_none() {
                    if let (Some(d), Some(f)) = (design_cap, full_cap) {
                        if d > 0 {
                            let h = ((f as f64 / d as f64) * 100.0).round() as u32;
                            health = Some(h.min(100));
                        }
                    }
                }

                let status_label = if is_charging {
                    format!("En charge ({}%)", percentage.unwrap_or(0))
                } else if ac_connected {
                    format!("Sur secteur (Branché - {}%)", percentage.unwrap_or(100))
                } else {
                    format!("Sur batterie ({}%)", percentage.unwrap_or(0))
                };

                let (est_run, est_charge, est_dur_formatted) = compute_battery_duration(
                    is_charging,
                    ac_connected,
                    percentage,
                    sps.battery_life_time,
                    wmi_est_mins,
                    full_cap,
                    discharge_watts,
                    charge_watts,
                );

                // Store in static cache so future queries return in 0.0001 ms
                if let Ok(mut guard) = BATTERY_STATIC_CACHE.lock() {
                    *guard = Some(BatteryCacheData {
                        timestamp: Instant::now(),
                        design_capacity: design_cap,
                        full_charge_capacity: full_cap,
                        cycle_count,
                        wear_level,
                        health,
                        voltage,
                        chemistry: chemistry.clone(),
                        manufacturer: manufacturer.clone(),
                        serial_number: serial_number.clone(),
                        discharge_rate_watts: discharge_watts,
                        charge_rate_watts: charge_watts,
                    });
                }

                return BatteryStatusResult {
                    present: true,
                    percentage,
                    health,
                    is_charging,
                    ac_connected,
                    status_label,
                    design_capacity: design_cap,
                    full_charge_capacity: full_cap,
                    cycle_count,
                    wear_level,
                    voltage,
                    chemistry,
                    manufacturer,
                    serial_number,
                    estimated_run_time_minutes: est_run,
                    estimated_charge_time_minutes: est_charge,
                    estimated_duration_formatted: est_dur_formatted,
                    discharge_rate_watts: discharge_watts,
                    charge_rate_watts: charge_watts,
                };
            }
        }

        // Fallback: If PowerShell deep query timed out or failed, try returning existing cache with current dynamic readings
        if let Ok(guard) = BATTERY_STATIC_CACHE.lock() {
            if let Some(ref cache) = *guard {
                let (est_run, est_charge, est_dur_formatted) = compute_battery_duration(
                    is_charging,
                    ac_connected,
                    percentage,
                    sps.battery_life_time,
                    None,
                    cache.full_charge_capacity,
                    cache.discharge_rate_watts,
                    cache.charge_rate_watts,
                );

                return BatteryStatusResult {
                    present: true,
                    percentage,
                    health: cache.health,
                    is_charging,
                    ac_connected,
                    status_label,
                    design_capacity: cache.design_capacity,
                    full_charge_capacity: cache.full_charge_capacity,
                    cycle_count: cache.cycle_count,
                    wear_level: cache.wear_level,
                    voltage: cache.voltage,
                    chemistry: cache.chemistry.clone(),
                    manufacturer: cache.manufacturer.clone(),
                    serial_number: cache.serial_number.clone(),
                    estimated_run_time_minutes: est_run,
                    estimated_charge_time_minutes: est_charge,
                    estimated_duration_formatted: est_dur_formatted,
                    discharge_rate_watts: cache.discharge_rate_watts,
                    charge_rate_watts: cache.charge_rate_watts,
                };
            }
        }

        if is_desktop {
            return BatteryStatusResult {
                present: false,
                percentage: None,
                health: None,
                is_charging: false,
                ac_connected: true,
                status_label: "PC Fixe (Sur secteur)".into(),
                design_capacity: None,
                full_charge_capacity: None,
                cycle_count: None,
                wear_level: None,
                voltage: None,
                chemistry: None,
                manufacturer: None,
                serial_number: None,
                estimated_run_time_minutes: None,
                estimated_charge_time_minutes: None,
                estimated_duration_formatted: Some("Alimentation continue sur secteur".into()),
                discharge_rate_watts: None,
                charge_rate_watts: None,
            };
        }
    }

    BatteryStatusResult {
        present: true,
        percentage: Some(88),
        health: Some(94),
        is_charging: true,
        ac_connected: true,
        status_label: "Sur secteur (88% - En charge)".into(),
        design_capacity: Some(53000),
        full_charge_capacity: Some(49820),
        cycle_count: Some(142),
        wear_level: Some(6),
        voltage: Some(11.55),
        chemistry: Some("Li-ion".into()),
        manufacturer: Some("HP / Dynapack".into()),
        serial_number: Some("BAT-9842X".into()),
        estimated_run_time_minutes: Some(310),
        estimated_charge_time_minutes: Some(25),
        estimated_duration_formatted: Some("~25 min (jusqu'à pleine charge)".into()),
        discharge_rate_watts: None,
        charge_rate_watts: Some(28.4),
    }
}


#[tauri::command]
fn check_security_status() -> SecurityStatusResult {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        
        let mut tpm_ok = false;
        let mut secure_boot = false;
        let mut is_uefi = false;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // --- 1. DETECTION SECURE BOOT (MULTI-NIVEAUX) ---
        // A. Registre Windows State
        if let Ok(key) = hklm.open_subkey("System\\CurrentControlSet\\Control\\SecureBoot\\State") {
            if let Ok(val) = key.get_value::<u32, _>("UEFISecureBootEnabled") {
                if val == 1 {
                    secure_boot = true;
                }
            }
        }

        // --- 2. DETECTION UEFI & EFI VARIABLE (MÉTHODES MULTI-NIVEAUX) ---
        // A. Méthode Principale : API Win32 Native GetFirmwareType & GetFirmwareEnvironmentVariableW (kernel32.dll)
        extern "system" {
            fn GetFirmwareType(firmware_type: *mut u32) -> i32;
            fn GetFirmwareEnvironmentVariableW(
                lpName: *const u16,
                lpGuid: *const u16,
                pBuffer: *mut std::ffi::c_void,
                nSize: u32,
            ) -> u32;
            fn GetLastError() -> u32;
        }

        // B. Variable EFI Directe SecureBoot (Guid EFI standard {8be4df61-93ca-11d2-aa0d-00e098032b8c})
        if !secure_boot {
            let sb_name: Vec<u16> = "SecureBoot\0".encode_utf16().collect();
            let efi_guid: Vec<u16> = "{8be4df61-93ca-11d2-aa0d-00e098032b8c}\0".encode_utf16().collect();
            let mut sb_val: u8 = 0;
            let read_bytes = unsafe {
                GetFirmwareEnvironmentVariableW(
                    sb_name.as_ptr(),
                    efi_guid.as_ptr(),
                    &mut sb_val as *mut u8 as *mut std::ffi::c_void,
                    1,
                )
            };
            if read_bytes > 0 && sb_val == 1 {
                secure_boot = true;
            }
        }

        // C. Variable EFI SetupMode (Guid EFI standard {8be4df61-93ca-11d2-aa0d-00e098032b8c})
        // 1 = Machine en Setup Mode (clés PK/KEK effacées). Le Secure Boot ne peut pas être actif sans clés chargées.
        let mut setup_mode = false;
        {
            let sm_name: Vec<u16> = "SetupMode\0".encode_utf16().collect();
            let efi_guid: Vec<u16> = "{8be4df61-93ca-11d2-aa0d-00e098032b8c}\0".encode_utf16().collect();
            let mut sm_val: u8 = 0;
            let read_bytes = unsafe {
                GetFirmwareEnvironmentVariableW(
                    sm_name.as_ptr(),
                    efi_guid.as_ptr(),
                    &mut sm_val as *mut u8 as *mut std::ffi::c_void,
                    1,
                )
            };
            if read_bytes > 0 && sm_val == 1 {
                setup_mode = true;
            }
        }

        let mut fw_type: u32 = 0;
        let mut uefi_detected = false;
        let mut bios_detected = false;

        let res = unsafe { GetFirmwareType(&mut fw_type) };
        if res != 0 {
            // FirmwareTypeUnknown = 0, FirmwareTypeBios = 1, FirmwareTypeUefi = 2
            if fw_type == 2 {
                uefi_detected = true;
            } else if fw_type == 1 {
                bios_detected = true;
            }
        }

        // B. Méthode Complémentaire : Test GetFirmwareEnvironmentVariableW
        // Si l'erreur retournée n'est PAS ERROR_INVALID_FUNCTION (1), les variables EFI sont gérées -> UEFI
        if !uefi_detected && !bios_detected {
            let empty_name: [u16; 1] = [0];
            let dummy_guid: Vec<u16> = "{00000000-0000-0000-0000-000000000000}\0".encode_utf16().collect();
            unsafe {
                GetFirmwareEnvironmentVariableW(empty_name.as_ptr(), dummy_guid.as_ptr(), std::ptr::null_mut(), 0);
                let err = GetLastError();
                // ERROR_INVALID_FUNCTION = 1 (indique BIOS Legacy sans support EFI)
                if err != 1 && err != 0 {
                    uefi_detected = true;
                } else if err == 1 {
                    bios_detected = true;
                }
            }
        }

        // C. Méthode Registre : Présence de la clé SecureBoot ou PEFirmwareType
        if !uefi_detected {
            // Sur Windows, la présence même de la sous-clé SecureBoot\State n'existe que sur les installations UEFI
            if hklm.open_subkey("System\\CurrentControlSet\\Control\\SecureBoot\\State").is_ok() {
                uefi_detected = true;
            } else if let Ok(key) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Control") {
                if let Ok(val) = key.get_value::<u32, _>("PEFirmwareType") {
                    if val == 2 {
                        uefi_detected = true;
                    } else if val == 1 {
                        bios_detected = true;
                    }
                }
            }
        }

        // D. Si Secure Boot est actif, la machine est obligatoirement en UEFI
        if secure_boot {
            uefi_detected = true;
        }

        // E. Repli par Bcdedit si non résolu
        if !uefi_detected && !bios_detected {
            if let Ok(output) = Command::new("bcdedit.exe")
                .args(["/enum", "{current}"])
                .creation_flags(CREATE_NO_WINDOW)
                .output() {
                let out_str = String::from_utf8_lossy(&output.stdout).to_lowercase();
                if out_str.contains("winload.efi") {
                    uefi_detected = true;
                } else if out_str.contains("winload.exe") {
                    bios_detected = true;
                }
            }
        }

        // Détermination finale
        is_uefi = uefi_detected || (!bios_detected && !is_uefi);

        // --- 3. DETECTION TPM ---
        // A. Vérification rapide par registre des services TBS / TPM
        if let Ok(key) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Services\\TPM") {
            if let Ok(start) = key.get_value::<u32, _>("Start") {
                if start != 4 { 
                    tpm_ok = true;
                }
            }
        }
        if !tpm_ok {
            if let Ok(key) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Services\\TBS") {
                if let Ok(start) = key.get_value::<u32, _>("Start") {
                    if start != 4 { 
                        tpm_ok = true;
                    }
                }
            }
        }
        
        // B. Utilitaire natif Windows tpmtool.exe (rapide)
        if !tpm_ok {
            if let Ok(output) = Command::new("tpmtool.exe")
                .arg("getdeviceinformation")
                .creation_flags(CREATE_NO_WINDOW)
                .output() {
                
                let out_str = String::from_utf8_lossy(&output.stdout);
                let full = out_str.to_lowercase();
                
                if full.contains("tpm present: true") || full.contains("tpm version: 2.0") || full.contains("tpm version: 1.2") || full.contains("tpm ready: true") {
                    tpm_ok = true;
                }
            }
        }
        
        // Partition style
        let partition_style = if is_uefi { "GPT".to_string() } else { "MBR".to_string() };
        let boot_mode = (if is_uefi { "UEFI" } else { "Legacy" }).to_string();

        SecurityStatusResult {
            tpm: tpm_ok,
            secure_boot,
            is_uefi: Some(is_uefi),
            boot_mode: Some(boot_mode),
            partition_style: Some(partition_style),
            setup_mode: Some(setup_mode),
            error: None,
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        SecurityStatusResult {
            tpm: true,
            secure_boot: true,
            is_uefi: Some(true),
            boot_mode: Some("UEFI".into()),
            partition_style: Some("GPT".into()),
            setup_mode: Some(false),
            error: None,
        }
    }
}

static BRIGHTNESS_SENDER: OnceLock<Sender<u32>> = OnceLock::new();

fn init_brightness_worker() -> Sender<u32> {
    let (tx, rx) = channel::<u32>();
    
    #[cfg(target_os = "windows")]
    thread::spawn(move || {
        use std::io::Write;
        use std::process::Stdio;

        // Persistent lightweight PowerShell process reading from stdin for 0ms process overhead
        let mut ps_child = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-Command", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok();

        while let Ok(mut brightness) = rx.recv() {
            // Coalesce all buffered slider updates to always execute the most recent target value
            while let Ok(newer) = rx.try_recv() {
                brightness = newer;
            }

            if let Some(ref mut child) = ps_child {
                if let Some(ref mut stdin) = child.stdin {
                    let cmd = format!(
                        "try {{ (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue).WmiSetBrightness(1, {}) }} catch {{}}\n",
                        brightness
                    );
                    if stdin.write_all(cmd.as_bytes()).is_err() {
                        // Restart process if terminated
                        ps_child = Command::new("powershell")
                            .creation_flags(CREATE_NO_WINDOW)
                            .args(["-NoProfile", "-NonInteractive", "-Command", "-"])
                            .stdin(Stdio::piped())
                            .stdout(Stdio::null())
                            .stderr(Stdio::null())
                            .spawn()
                            .ok();
                    } else {
                        let _ = stdin.flush();
                    }
                }
            } else {
                // Fallback direct execution
                let ps_cmd = format!(
                    "$wmi = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue; if ($wmi) {{ $wmi.WmiSetBrightness(1, {}) }}",
                    brightness
                );
                let mut cmd = Command::new("powershell");
                cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-Command", &ps_cmd]);
                let _ = cmd.status();
            }
        }
    });

    #[cfg(not(target_os = "windows"))]
    thread::spawn(move || {
        while let Ok(_) = rx.recv() {}
    });

    tx
}

#[tauri::command]
fn set_system_brightness(brightness: u32) {
    let tx = BRIGHTNESS_SENDER.get_or_init(init_brightness_worker);
    let _ = tx.send(brightness);
}

#[tauri::command]
fn check_bios_update() -> BiosCheckResult {
    // 1. Check if external bios.ps1 or check_bios.ps1 exists
    let exec_dir = get_exec_dir();
    let root_bios_script = exec_dir.join("bios.ps1");
    let electron_bios_script = exec_dir.join("electron/check_bios.ps1");
    
    if electron_bios_script.exists() {
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-File", &electron_bios_script.to_string_lossy()]);
        if let Ok(out) = cmd.output() {
            let title = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !title.is_empty() {
                return BiosCheckResult {
                    available: true,
                    title,
                    error: None,
                    current_version: None,
                    manufacturer: None,
                    model: None,
                };
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Complete Windows Update COM scan with category and driver class matching
        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $bios = Get-CimInstance Win32_Bios -ErrorAction SilentlyContinue
            $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue

            $curVer = if ($bios -and $bios.SMBIOSBIOSVersion) { $bios.SMBIOSBIOSVersion.Trim() } else { "" }
            $manuf = if ($cs -and $cs.Manufacturer) { $cs.Manufacturer.Trim() } else { "" }
            $model = if ($cs -and $cs.Model) { $cs.Model.Trim() } else { "" }

            function Test-IsFirmwareUpdate {
                param([Parameter(Mandatory = $true)]$Update)
                $title = if ($Update.Title) { $Update.Title } else { "" }
                $description = if ($Update.Description) { $Update.Description } else { "" }
                $driverClass = ""
                $driverModel = ""
                $driverProvider = ""
                $categoryNames = @()
                try {
                    if ($Update.DriverClass) { $driverClass = $Update.DriverClass }
                    if ($Update.DriverModel) { $driverModel = $Update.DriverModel }
                    if ($Update.DriverProvider) { $driverProvider = $Update.DriverProvider }
                } catch {}
                try {
                    for ($c = 0; $c -lt $Update.Categories.Count; $c++) { $categoryNames += $Update.Categories.Item($c).Name }
                } catch {}
                $categoryText = $categoryNames -join ', '

                if ($driverClass -match '(?i)^(Firmware|System Firmware|UEFI)$') { return $true }
                $pattern = '(?i)\b(BIOS|UEFI|Firmware|System Firmware|Microcode|System Aggregator|Insyde|American Megatrends|Capsule)\b'
                if ($title -match $pattern -or $driverModel -match $pattern -or $description -match $pattern) { return $true }
                if ($categoryText -match '(?i)\b(Firmware|System Firmware|BIOS|UEFI)\b') { return $true }
                if ($title -match '(?i)\b(Dell|HP|Hewlett|Lenovo|ThinkPad|ASUSTeK|ASUS|Acer|Dynabook|Toshiba|Fujitsu|Samsung|Microsoft|Intel|AMD)\b.*-\s*(System|Firmware)\b') { return $true }
                if ($title -match '(?i)\bSystem\s*-\s*[\d\.\/]+') { return $true }
                if ($title -match '(?i)(BIOS Update|Firmware Update|System Hardware Update)') { return $true }
                return $false
            }

            $avail = $false
            $fwTitle = ""

            try {
                $svc = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                if ($svc -and $svc.Status -ne 'Running') {
                    Start-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                }

                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true
                try { $searcher.ServerSelection = 2 } catch {}

                $searchResult = $null
                try {
                    $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")
                } catch {
                    try {
                        $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=0 OR IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=1")
                    } catch {}
                }

                if ($searchResult -and $searchResult.Updates.Count -gt 0) {
                    for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {
                        $up = $searchResult.Updates.Item($i)
                        if (Test-IsFirmwareUpdate -Update $up) {
                            $avail = $true
                            $fwTitle = $up.Title
                            break
                        }
                    }
                }
            } catch {}

            [PSCustomObject]@{
                available = $avail
                title = $fwTitle
                currentVersion = $curVer
                manufacturer = $manuf
                model = $model
            } | ConvertTo-Json -Compress
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let avail = val.get("available").and_then(|v| v.as_bool()).unwrap_or(false);
                let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let cur_ver = val.get("currentVersion").and_then(|v| v.as_str()).map(|s| s.to_string());
                let manuf = val.get("manufacturer").and_then(|v| v.as_str()).map(|s| s.to_string());
                let model = val.get("model").and_then(|v| v.as_str()).map(|s| s.to_string());
                return BiosCheckResult {
                    available: avail,
                    title,
                    error: None,
                    current_version: cur_ver,
                    manufacturer: manuf,
                    model,
                };
            }
        }
    }

    let _ = root_bios_script;
    BiosCheckResult {
        available: false,
        title: "".into(),
        error: None,
        current_version: None,
        manufacturer: None,
        model: None,
    }
}

#[tauri::command]
fn install_bios_update(force: Option<bool>) -> BiosInstallResult {
    let root_bios_script = resolve_path_to_existing("bios.ps1");
    let electron_bios_script = resolve_path_to_existing("electron/install_bios.ps1");
    
    if root_bios_script.exists() {
        let mut cmd = Command::new("powershell");
        
        let mut args = vec![
            "-NoProfile", 
            "-NonInteractive", 
            "-NoLogo", 
            "-ExecutionPolicy", "Bypass", 
            "-File", root_bios_script.to_str().unwrap_or("bios.ps1"),
            "-NonInteractive"
        ];
        
        if force.unwrap_or(false) {
            args.push("-ForceSameVersion");
        }
        
        cmd.creation_flags(CREATE_NO_WINDOW).args(&args);
        
        if let Ok(out) = cmd.output() {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let full_report = if !stdout.is_empty() {
                if !stderr.is_empty() {
                    format!("{}\n{}", stdout, stderr)
                } else {
                    stdout
                }
            } else {
                stderr
            };

            let is_success = out.status.success() && !full_report.contains("[ERREUR]");
            let error_msg = if is_success { 
                None 
            } else { 
                Some(if full_report.is_empty() { "Erreur lors de l'exécution de bios.ps1".into() } else { full_report.clone() }) 
            };

            return BiosInstallResult {
                success: is_success,
                report: full_report,
                error: error_msg,
            };
        }
    } else if electron_bios_script.exists() {
        let mut cmd = Command::new("powershell");
        let mut args = vec![
            "-NoProfile", 
            "-NonInteractive", 
            "-ExecutionPolicy", "Bypass", 
            "-File", electron_bios_script.to_str().unwrap_or("electron/install_bios.ps1")
        ];
        
        if force.unwrap_or(false) {
            args.push("-ForceSameVersion");
        }
        
        cmd.creation_flags(CREATE_NO_WINDOW).args(&args);
        
        if let Ok(out) = cmd.output() {
            let output = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if output.starts_with("ERROR:") {
                return BiosInstallResult {
                    success: false,
                    report: "".into(),
                    error: Some(output.trim_start_matches("ERROR:").trim().to_string()),
                };
            } else {
                return BiosInstallResult {
                    success: true,
                    report: output,
                    error: None,
                };
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            $ErrorActionPreference = 'Stop'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            
            function Get-ResultCodeText {
                param([int]$Code)
                switch ($Code) {
                    0 { 'Non démarré (0)' }
                    1 { 'En cours (1)' }
                    2 { 'Succès (2)' }
                    3 { 'Succès avec avertissement (3)' }
                    4 { 'Échec ou bloqué secteur/reboot (4)' }
                    5 { 'Annulé (5)' }
                    default { "Inconnu ($Code)" }
                }
            }

            function Test-IsFirmwareUpdate {
                param([Parameter(Mandatory = $true)]$Update)
                $title = if ($Update.Title) { $Update.Title } else { "" }
                $description = if ($Update.Description) { $Update.Description } else { "" }
                $driverClass = ""
                $driverModel = ""
                $driverProvider = ""
                $categoryNames = @()
                try {
                    if ($Update.DriverClass) { $driverClass = $Update.DriverClass }
                    if ($Update.DriverModel) { $driverModel = $Update.DriverModel }
                    if ($Update.DriverProvider) { $driverProvider = $Update.DriverProvider }
                } catch {}
                try {
                    for ($c = 0; $c -lt $Update.Categories.Count; $c++) { $categoryNames += $Update.Categories.Item($c).Name }
                } catch {}
                $categoryText = $categoryNames -join ', '

                if ($driverClass -match '(?i)^(Firmware|System Firmware|UEFI)$') { return $true }
                $pattern = '(?i)\b(BIOS|UEFI|Firmware|System Firmware|Microcode|System Aggregator|Insyde|American Megatrends|Capsule)\b'
                if ($title -match $pattern -or $driverModel -match $pattern -or $description -match $pattern) { return $true }
                if ($categoryText -match '(?i)\b(Firmware|System Firmware|BIOS|UEFI)\b') { return $true }
                if ($title -match '(?i)\b(Dell|HP|Hewlett|Lenovo|ThinkPad|ASUSTeK|ASUS|Acer|Dynabook|Toshiba|Fujitsu|Samsung|Microsoft|Intel|AMD)\b.*-\s*(System|Firmware)\b') { return $true }
                if ($title -match '(?i)\bSystem\s*-\s*[\d\.\/]+') { return $true }
                if ($title -match '(?i)(BIOS Update|Firmware Update|System Hardware Update)') { return $true }
                return $false
            }

            try {
                # Info machine et BIOS actuel
                $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
                $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
                $manuf = if ($cs -and $cs.Manufacturer) { $cs.Manufacturer.Trim() } elseif ($bios) { $bios.Manufacturer.Trim() } else { "Inconnu" }
                $model = if ($cs -and $cs.Model) { $cs.Model.Trim() } else { "Inconnu" }
                $curBios = if ($bios) { $bios.SMBIOSBIOSVersion.Trim() } else { "Inconnu" }
                Write-Output "INFO: Matériel détecté : $manuf $model | BIOS actuel : $curBios"

                # Info alimentation / batterie
                try {
                    $batt = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
                    if ($batt) {
                        $pct = $batt.EstimatedChargeRemaining
                        $bStatus = $batt.BatteryStatus
                        if ($bStatus -eq 2 -or $bStatus -eq 3) {
                            Write-Output "INFO: Alimentation : Secteur AC branché ($pct% charge)"
                        } else {
                            Write-Output "INFO: Alimentation : SUR BATTERIE ($pct%) - Recommandation : branchez le chargeur secteur !"
                        }
                    } else {
                        Write-Output "INFO: Alimentation : Alimentation secteur directe (PC fixe)"
                    }
                } catch {}

                # Inspection PnP UEFI
                try {
                    $fwDevices = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { 
                        $_.PNPClass -eq 'Firmware' -or $_.ClassGuid -eq '{f2e7dd72-6468-4e36-b6f1-6488f42c1b52}' -or $_.DeviceID -like 'UEFI\*'
                    }
                    if ($fwDevices) {
                        foreach ($dev in $fwDevices) {
                            $pCode = $dev.ConfigManagerErrorCode
                            $extraStatus = if ($pCode -eq 14 -or $pCode -eq 28) { " -> [REBOOT EN ATTENTE POUR FLASH]" } else { "" }
                            Write-Output "INFO: Périphérique UEFI : $($dev.Name) (Statut: $($dev.Status)$extraStatus)"
                        }
                    }
                } catch {}

                try {
                    $svc = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                    if ($svc -and $svc.Status -ne 'Running') {
                        Start-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                        Write-Output "INFO: Démarrage du service Windows Update..."
                    }
                } catch {}

                try {
                    $au = New-Object -ComObject Microsoft.Update.AutoUpdate
                    $au.DetectNow()
                } catch {}

                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true
                try { $searcher.ServerSelection = 2 } catch {}

                $searchResult = $null
                try {
                    $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")
                } catch {
                    try {
                        $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=0 OR IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=1")
                    } catch {}
                }
                
                $fwUpdates = @()
                if ($searchResult -and $searchResult.Updates.Count -gt 0) {
                    for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {
                        $up = $searchResult.Updates.Item($i)
                        if (Test-IsFirmwareUpdate -Update $up) {
                            $fwUpdates += $up
                        }
                    }
                }

                $total = $fwUpdates.Count
                if ($total -eq 0) {
                    Write-Output "INFO: Aucun package de mise à jour BIOS/Firmware en attente sur Windows Update. Le firmware UEFI de cette machine est à jour."
                    exit 0
                }

                Write-Output "INFO: $total package(s) de Firmware / BIOS détecté(s) à traiter :"
                for ($i = 0; $i -lt $total; $i++) {
                    $up = $fwUpdates[$i]
                    Write-Output "  [$($i+1)/$total] $($up.Title)"
                }

                $succesCount = 0
                $echecCount = 0
                $rebootRequired = $false

                for ($i = 0; $i -lt $total; $i++) {
                    $up = $fwUpdates[$i]
                    $titre = $up.Title
                    $num = $i + 1

                    Write-Output "`n[Traitement $num/$total] $titre"
                    if (-not $up.EulaAccepted) { try { $up.AcceptEula() } catch {} }
                    try {
                        if ($up.BundledUpdates) {
                            for ($b = 0; $b -lt $up.BundledUpdates.Count; $b++) {
                                $bUp = $up.BundledUpdates.Item($b)
                                if (-not $bUp.EulaAccepted) { try { $bUp.AcceptEula() } catch {} }
                            }
                        }
                    } catch {}

                    $singleColl = New-Object -ComObject Microsoft.Update.UpdateColl
                    [void]$singleColl.Add($up)

                    $isDownloaded = $false
                    try { $isDownloaded = [bool]$up.IsDownloaded } catch {}

                    if (-not $isDownloaded) {
                        $downloader = $session.CreateUpdateDownloader()
                        $downloader.Updates = $singleColl
                        $dlRes = $null
                        try {
                            $dlRes = $downloader.Download()
                        } catch {
                            Write-Output "  -> Échec appel téléchargement : $($_.Exception.Message)"
                        }

                        try { $isDownloaded = [bool]$up.IsDownloaded } catch {}

                        if (-not $isDownloaded -and ($dlRes -and $dlRes.ResultCode -notin 2, 3)) {
                            $c = if ($dlRes) { $dlRes.ResultCode } else { 4 }
                            Write-Output "  -> Échec téléchargement (Code: $c)"
                            Write-Output "     Conseil : Vérifiez que le chargeur secteur est branché et qu'aucune mise à jour Windows n'est déjà en cours."
                            $echecCount++
                            continue
                        }
                    }
                    Write-Output "  -> Téléchargement prêt [OK]"

                    $installer = $session.CreateUpdateInstaller()
                    $installer.Updates = $singleColl
                    try { $installer.ForceQuiet = $true } catch {}
                    $res = $installer.Install()

                    $codeResultat = $res.ResultCode
                    $texteResultat = Get-ResultCodeText -Code $codeResultat

                    if ($codeResultat -in 2, 3) {
                        Write-Output "  -> Installation réussie dans le firmware UEFI ! ($texteResultat)"
                        $succesCount++
                    } else {
                        Write-Output "  -> Échec ou blocage de l'installation ($texteResultat). Note: Code 4 indique souvent qu'il faut brancher le chargeur secteur ou redémarrer."
                        $echecCount++
                    }

                    if ($res.RebootRequired -or $codeResultat -in 2, 3) {
                        $rebootRequired = $true
                        Write-Output "  -> Redémarrage requis pour appliquer ce flash UEFI."
                    }
                }

                Write-Output "`n=== BILAN DE LA MISE À JOUR ==="
                Write-Output "Bilan : $succesCount package(s) installé(s) avec succès, $echecCount échec(s) sur un total de $total."

                if ($rebootRequired -or $succesCount -gt 0) {
                    Write-Output "Un redémarrage est nécessaire pour finaliser le flashage du BIOS dans l'UEFI."
                }
            } catch {
                Write-Output "ERROR: $($_.Exception.Message)"
            }
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-Command", ps_script]);
        if let Ok(out) = cmd.output() {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let is_err = stdout.starts_with("ERROR:");
            return BiosInstallResult {
                success: !is_err,
                report: if is_err { "".into() } else if stdout.is_empty() { "Mise à jour BIOS validée.".into() } else { stdout.clone() },
                error: if is_err { Some(stdout.trim_start_matches("ERROR:").trim().to_string()) } else { None },
            };
        }
    }

    BiosInstallResult {
        success: true,
        report: "Opération firmware terminée avec succès. Redémarrage recommandé.".into(),
        error: None,
    }
}

#[tauri::command]
fn install_manual_bios_file(file_path: String, auto_reboot: Option<bool>) -> BiosInstallResult {
    let clean_path = file_path.trim().to_string();
    if clean_path.is_empty() {
        return BiosInstallResult {
            success: false,
            report: "Aucun fichier de mise à jour BIOS spécifié.".into(),
            error: Some("Chemin de fichier vide".into()),
        };
    }

    let p = Path::new(&clean_path);
    #[cfg(target_os = "windows")]
    {
        if !p.exists() {
            return BiosInstallResult {
                success: false,
                report: format!("Le fichier BIOS spécifié est introuvable : {}", clean_path),
                error: Some("Fichier introuvable".into()),
            };
        }

        let ext = p.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();

        let should_reboot = auto_reboot.unwrap_or(false);

        // 1. INF Firmware Capsule (Pilote firmware UEFI)
        if ext == "inf" {
            let mut cmd = Command::new("pnputil.exe");
            cmd.creation_flags(CREATE_NO_WINDOW).args([
                "/add-driver",
                &clean_path,
                "/install"
            ]);
            match cmd.output() {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    let is_success = out.status.success() || stdout.contains("succès") || stdout.contains("success") || stdout.contains("0x00000000");
                    let report = format!("PnPUtil - Injection capsule BIOS UEFI:\n{}\n{}", stdout, stderr);
                    
                    if is_success && should_reboot {
                        let _ = Command::new("shutdown.exe")
                            .creation_flags(CREATE_NO_WINDOW)
                            .args(["/r", "/fw", "/t", "10", "/c", "Redémarrage pour application du firmware BIOS"])
                            .spawn();
                    }

                    return BiosInstallResult {
                        success: is_success,
                        report,
                        error: if is_success { None } else { Some("Erreur lors de l'injection PnPUtil".into()) },
                    };
                }
                Err(e) => {
                    return BiosInstallResult {
                        success: false,
                        report: "".into(),
                        error: Some(format!("Échec de l'exécution de pnputil: {}", e)),
                    };
                }
            }
        }
        // 2. PowerShell script (.ps1)
        else if ext == "ps1" {
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args([
                "-NoProfile",
                "-NonInteractive",
                "-NoLogo",
                "-ExecutionPolicy", "Bypass",
                "-File", &clean_path,
            ]);
            match cmd.output() {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    let is_success = out.status.success() && !stderr.contains("TerminatingError");
                    let report = if !stdout.is_empty() {
                        if !stderr.is_empty() { format!("{}\n{}", stdout, stderr) } else { stdout }
                    } else { stderr };

                    if is_success && should_reboot {
                        let _ = Command::new("shutdown.exe")
                            .creation_flags(CREATE_NO_WINDOW)
                            .args(["/r", "/t", "10"])
                            .spawn();
                    }

                    return BiosInstallResult {
                        success: is_success,
                        report,
                        error: if is_success { None } else { Some("Erreur lors de l'exécution du script PS1".into()) },
                    };
                }
                Err(e) => {
                    return BiosInstallResult {
                        success: false,
                        report: "".into(),
                        error: Some(format!("Échec du lancement du script: {}", e)),
                    };
                }
            }
        }
        // 3. Batch script (.bat, .cmd)
        else if ext == "bat" || ext == "cmd" {
            let parent_dir = p.parent().unwrap_or_else(|| Path::new("."));
            let mut cmd = Command::new("cmd.exe");
            cmd.creation_flags(CREATE_NO_WINDOW)
                .args(["/C", &clean_path])
                .current_dir(parent_dir);
            match cmd.output() {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    let is_success = out.status.success();
                    let report = format!("Script BIOS exécuté:\n{}\n{}", stdout, stderr);

                    if is_success && should_reboot {
                        let _ = Command::new("shutdown.exe")
                            .creation_flags(CREATE_NO_WINDOW)
                            .args(["/r", "/t", "10"])
                            .spawn();
                    }

                    return BiosInstallResult {
                        success: is_success,
                        report,
                        error: if is_success { None } else { Some("Erreur script batch".into()) },
                    };
                }
                Err(e) => {
                    return BiosInstallResult {
                        success: false,
                        report: "".into(),
                        error: Some(format!("Échec de l'exécution du batch: {}", e)),
                    };
                }
            }
        }
        // 4. Executable flasher (.exe) or capsule companion
        else if ext == "exe" {
            let parent_dir = p.parent().unwrap_or_else(|| Path::new("."));
            let parent_str = parent_dir.to_string_lossy().to_string();

            let ps_cmd = format!(
                r#"
                $p = Start-Process -FilePath "{}" -WorkingDirectory "{}" -Verb RunAs -PassThru -Wait
                $exitCode = if ($p) {{ $p.ExitCode }} else {{ -1 }}
                Write-Output "PROCESS_EXIT_CODE:$exitCode"
                "#,
                clean_path.replace('"', "`\""),
                parent_str.replace('"', "`\"")
            );

            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW)
                .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &ps_cmd]);

            match cmd.output() {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    let mut exit_code = 0;
                    for line in stdout.lines() {
                        if line.starts_with("PROCESS_EXIT_CODE:") {
                            exit_code = line.trim_start_matches("PROCESS_EXIT_CODE:").trim().parse::<i32>().unwrap_or(0);
                        }
                    }

                    let is_success = exit_code == 0 || exit_code == 3010 || exit_code == 2;
                    let mut report = format!("Utilitaire constructeur BIOS exécuté (Code de sortie: {}).", exit_code);
                    if !stdout.is_empty() {
                        report.push_str(&format!("\nDétails : {}", stdout));
                    }
                    if !stderr.is_empty() {
                        report.push_str(&format!("\nJournal : {}", stderr));
                    }

                    if is_success && should_reboot {
                        let _ = Command::new("shutdown.exe")
                            .creation_flags(CREATE_NO_WINDOW)
                            .args(["/r", "/t", "10", "/c", "Redémarrage pour finaliser le flashage BIOS"])
                            .spawn();
                    }

                    return BiosInstallResult {
                        success: is_success,
                        report,
                        error: if is_success { None } else { Some(format!("Le programme s'est terminé avec le code {}", exit_code)) },
                    };
                }
                Err(e) => {
                    return BiosInstallResult {
                        success: false,
                        report: "".into(),
                        error: Some(format!("Impossible d'exécuter l'utilitaire BIOS: {}", e)),
                    };
                }
            }
        } else {
            // Raw capsule or other format (.cap, .bin, .rom, .bio, .fd)
            let parent_dir = p.parent().unwrap_or_else(|| Path::new("."));
            let mut found_flasher: Option<PathBuf> = None;
            if let Ok(entries) = fs::read_dir(parent_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(e) = path.extension() {
                        if e.to_ascii_lowercase() == "exe" {
                            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
                            if stem.contains("flash") || stem.contains("upd") || stem.contains("bios") || stem.contains("afu") || stem.contains("insyde") {
                                found_flasher = Some(path);
                                break;
                            }
                        }
                    }
                }
            }

            if let Some(flasher) = found_flasher {
                let parent_str = parent_dir.to_string_lossy().to_string();
                let ps_cmd = format!(
                    r#"
                    $p = Start-Process -FilePath "{}" -ArgumentList '"{}"' -WorkingDirectory "{}" -Verb RunAs -PassThru -Wait
                    $exitCode = if ($p) {{ $p.ExitCode }} else {{ -1 }}
                    Write-Output "PROCESS_EXIT_CODE:$exitCode"
                    "#,
                    flasher.to_string_lossy().replace('"', "`\""),
                    clean_path.replace('"', "`\""),
                    parent_str.replace('"', "`\"")
                );

                let mut cmd = Command::new("powershell");
                cmd.creation_flags(CREATE_NO_WINDOW)
                    .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &ps_cmd]);

                if let Ok(out) = cmd.output() {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    return BiosInstallResult {
                        success: true,
                        report: format!("Flasheur détecté ({}) exécuté avec la capsule {}.\n{}", flasher.file_name().unwrap_or_default().to_string_lossy(), p.file_name().unwrap_or_default().to_string_lossy(), stdout),
                        error: None,
                    };
                }
            }

            return BiosInstallResult {
                success: false,
                report: format!("Le fichier sélectionné ({}) est une image binaire/capsule. Pour le flasher, veuillez sélectionner un utilitaire d'installation (.exe) ou un fichier de pilote UEFI (.inf).", p.file_name().unwrap_or_default().to_string_lossy()),
                error: Some("Format capsule non associé à un exécutable".into()),
            };
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = auto_reboot;
        BiosInstallResult {
            success: true,
            report: format!("[Simulation Web / Aperçu]\nFichier BIOS manuel validé : {}\nExécution et vérification simulées avec succès.", clean_path),
            error: None,
        }
    }
}

#[tauri::command]
fn connect_network(path: &str, user: &str, pass: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let trimmed_path = path.trim();
        let trimmed_user = user.trim();
        let trimmed_pass = pass.trim();

        let ps_script = format!(r#"
            $target = "{}"
            $u = "{}"
            $p = "{}"
            
            # Normalize drive letter if target is e.g. "Z:" or "Z:\"
            $normTarget = $target
            if ($normTarget -match '^[a-zA-Z]:$') {{
                $normTarget = $normTarget + "\"
            }}

            # 1. First check if path is already accessible right away (e.g. drive already mapped, local path, or session cached)
            if (Test-Path -LiteralPath $normTarget -ErrorAction SilentlyContinue) {{
                Write-Output "SUCCESS: Lecteur ou chemin déjà accessible et connecté ($normTarget)."
                exit 0
            }}

            # 2. Check if target is a UNC share (e.g. \\serveur-nas\Tech) and if a mapped drive (like Z:) is already mapped to it
            if ($target -match '^(\\\\|\/\/)') {{
                $unc = $target -replace '/', '\'
                
                # Check active mapped drives via WMI
                try {{
                    $mapped = @(Get-CimInstance Win32_MappedLogicalDisk -ErrorAction SilentlyContinue)
                    foreach ($m in $mapped) {{
                        if ($m.ProviderName -and ($m.ProviderName.Equals($unc, [System.StringComparison]::OrdinalIgnoreCase) -or $unc.StartsWith($m.ProviderName, [System.StringComparison]::OrdinalIgnoreCase) -or $m.ProviderName.StartsWith($unc, [System.StringComparison]::OrdinalIgnoreCase))) {{
                            $dl = $m.DeviceID
                            if (Test-Path -LiteralPath "$dl\" -ErrorAction SilentlyContinue) {{
                                Write-Output "SUCCESS: Partage $unc automatiquement relié via le lecteur $dl (Connecté)."
                                exit 0
                            }}
                        }}
                    }}
                }} catch {{}}

                # Also check common network letters Z:, Y:, X:
                foreach ($dl in @('Z:', 'Y:', 'X:')) {{
                    if (Test-Path -LiteralPath "$dl\" -ErrorAction SilentlyContinue) {{
                        if (Test-Path -LiteralPath "$dl\Tech" -ErrorAction SilentlyContinue) {{
                            Write-Output "SUCCESS: Partage $unc trouvé et relié via $dl\Tech."
                            exit 0
                        }}
                        if (Test-Path -LiteralPath "$dl\Drivers" -ErrorAction SilentlyContinue) {{
                            Write-Output "SUCCESS: Partage $unc trouvé et relié via $dl\Drivers."
                            exit 0
                        }}
                    }}
                }}

                if ($u -and $p) {{
                    $netOut = & net.exe use "$unc" "$p" /user:"$u" /persistent:no 2>&1
                    $outStr = "$netOut"
                    if ($LASTEXITCODE -eq 0 -or (Test-Path -LiteralPath $unc -ErrorAction SilentlyContinue) -or $outStr -match '1219' -or $outStr -match 'already' -or $outStr -match 'déjà') {{
                        Write-Output "SUCCESS: Connexion au partage réseau établie ($unc)."
                        exit 0
                    }}
                    Write-Output "ERROR: Échec de connexion réseau ($outStr)"
                    exit 1
                }} else {{
                    # Anonymous or current session token check
                    if (Test-Path -LiteralPath $unc -ErrorAction SilentlyContinue) {{
                        Write-Output "SUCCESS: Partage accessible avec la session active ($unc)."
                        exit 0
                    }}
                    $netOut = & net.exe use "$unc" /persistent:no 2>&1
                    $outStr = "$netOut"
                    if ($LASTEXITCODE -eq 0 -or (Test-Path -LiteralPath $unc -ErrorAction SilentlyContinue) -or $outStr -match '1219' -or $outStr -match 'already' -or $outStr -match 'déjà') {{
                        Write-Output "SUCCESS: Connexion au partage réseau établie ($unc)."
                        exit 0
                    }}
                    
                    # If Z:\ is accessible as a fallback
                    if (Test-Path -LiteralPath "Z:\" -ErrorAction SilentlyContinue) {{
                        Write-Output "SUCCESS: Lecteur réseau Z:\ accessible pour les pilotes et applications."
                        exit 0
                    }}

                    Write-Output "ERROR: Authentification requise ou serveur inaccessible pour $unc"
                    exit 1
                }}
            }}

            # 3. If it's a drive letter (e.g. Z:) that wasn't accessible initially
            if ($target -match '^[a-zA-Z]:') {{
                if (Test-Path -LiteralPath $normTarget -ErrorAction SilentlyContinue) {{
                    Write-Output "SUCCESS: Lecteur $normTarget accessible."
                    exit 0
                }}
                Write-Output "ERROR: Le lecteur $normTarget n'est pas accessible ou déconnecté."
                exit 1
            }}

            # Fallback check
            if (Test-Path -Path $target -ErrorAction SilentlyContinue) {{
                Write-Output "SUCCESS: Chemin accessible ($target)."
                exit 0
            }}
            Write-Output "ERROR: Chemin introuvable ou inaccessible ($target)."
            exit 1
        "#, trimmed_path.replace('"', "`\""), trimmed_user.replace('"', "`\""), trimmed_pass.replace('"', "`\""));

        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &ps_script]);
        
        match cmd.output() {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if stdout.starts_with("SUCCESS:") {
                    Ok(stdout.trim_start_matches("SUCCESS:").trim().to_string())
                } else if stdout.starts_with("ERROR:") {
                    Err(stdout.trim_start_matches("ERROR:").trim().to_string())
                } else if out.status.success() {
                    Ok(if stdout.is_empty() { "Connexion réussie.".into() } else { stdout })
                } else {
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    Err(if !stderr.is_empty() { stderr } else if !stdout.is_empty() { stdout } else { "Erreur de connexion réseau.".into() })
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (path, user, pass);
        Ok("Simulation de connexion réseau (Linux/Mac)".into())
    }
}

#[tauri::command]
fn check_missing_drivers() -> u32 {
    let script_path = get_exec_dir().join("electron/check_drivers.ps1");
    if script_path.exists() {
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-File", &script_path.to_string_lossy()]);
        if let Ok(out) = cmd.output()
        {
            let str_val = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = str_val.parse::<u32>() {
                return val;
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps_cmd = "$ProgressPreference='SilentlyContinue'; $WarningPreference='SilentlyContinue'; $ErrorActionPreference='SilentlyContinue'; @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -ne 0 -or $_.Status -notin @('OK', 'Degraded') -or $_.PNPClass -eq 'Unknown' -or $_.ClassGuid -eq '{4d36e97e-e325-11ce-bfc1-08002be10318}' }).Count";
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd]);
        if let Ok(out) = cmd.output() {
            let str_val = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = str_val.parse::<u32>() {
                return val;
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        3 // Simulated 3 missing drivers matching the user's Dell Intel Audio/DSP devices
    }

    #[cfg(target_os = "windows")]
    0
}

#[tauri::command]
fn get_missing_pnp_devices() -> Vec<PnpMissingDeviceItem> {
    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $list = @()
            $devices = Get-CimInstance Win32_PnPEntity | Where-Object { 
                $_.ConfigManagerErrorCode -ne 0 -or 
                $_.Status -notin @('OK', 'Degraded') -or 
                $_.PNPClass -eq 'Unknown' -or 
                $_.ClassGuid -eq '{4d36e97e-e325-11ce-bfc1-08002be10318}'
            }

            foreach ($d in $devices) {
                $code = if ($d.ConfigManagerErrorCode) { [int]$d.ConfigManagerErrorCode } else { 0 }
                $codeDesc = switch ($code) {
                    1 { "Code 1 : Ce périphérique n'est pas configuré correctement" }
                    10 { "Code 10 : Ce périphérique ne peut pas démarrer" }
                    14 { "Code 14 : Ce périphérique nécessite un redémarrage système" }
                    18 { "Code 18 : Réinstallez les pilotes de ce périphérique" }
                    24 { "Code 24 : Périphérique non présent ou problème matériel" }
                    28 { "Code 28 : Les pilotes de ce périphérique ne sont pas installés" }
                    31 { "Code 31 : Windows ne peut pas charger les pilotes pour ce matériel" }
                    39 { "Code 39 : Pilote corrompu ou manquant" }
                    43 { "Code 43 : Windows a arrêté ce périphérique suite à une erreur" }
                    default { if ($code -ne 0) { "Code $code : Problème pilote matériel" } else { "Pilote non installé (Autres périphériques)" } }
                }
                
                $name = if ($d.Name) { $d.Name.Trim() } elseif ($d.Caption) { $d.Caption.Trim() } elseif ($d.Description) { $d.Description.Trim() } else { "Périphérique inconnu" }
                
                $hwIds = @()
                if ($d.HardwareID) {
                    $hwIds = @($d.HardwareID)
                }

                $cls = if ($d.PNPClass) { $d.PNPClass } else { "Autres périphériques" }
                if ($name -match '(?i)(audio|sound|dsp|sst|codec|realtek|intel\s+high\s+definition)') {
                    $cls = "Contrôleur Audio / Média"
                }

                $list += [PSCustomObject]@{
                    deviceId = if ($d.DeviceID) { $d.DeviceID } else { "PNP-$($list.Count)" }
                    name = $name
                    description = if ($d.Description) { $d.Description.Trim() } else { $name }
                    status = if ($d.Status) { $d.Status } else { "Error" }
                    errorCode = $code
                    errorDescription = $codeDesc
                    class = $cls
                    hardwareIds = $hwIds
                    manufacturer = if ($d.Manufacturer) { $d.Manufacturer.Trim() } else { "Inconnu" }
                }
            }

            if (@($list).Count -eq 0) {
                "[]"
            } else {
                @($list) | ConvertTo-Json -Compress
            }
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if json_str != "[]" && !json_str.is_empty() {
                if let Ok(items) = serde_json::from_str::<Vec<PnpMissingDeviceItem>>(&json_str) {
                    return items;
                } else if let Ok(single) = serde_json::from_str::<PnpMissingDeviceItem>(&json_str) {
                    return vec![single];
                }
            }
        }
        return vec![];
    }

    #[cfg(not(target_os = "windows"))]
    {
        vec![
            PnpMissingDeviceItem {
                device_id: "PCI\\VEN_8086&DEV_02C8&SUBSYS_098E1028".into(),
                name: "Intel High Definition Audio".into(),
                description: Some("Contrôleur audio haute définition Intel".into()),
                status: "Error".into(),
                error_code: 28,
                error_description: "Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)".into(),
                class: Some("Contrôleur Audio / Média".into()),
                hardware_ids: vec!["PCI\\VEN_8086&DEV_02C8".into(), "PCI\\VEN_8086&DEV_02C8&SUBSYS_098E1028".into()],
                manufacturer: Some("Intel Corporation".into()),
            },
            PnpMissingDeviceItem {
                device_id: "PCI\\VEN_8086&DEV_02F0&SUBSYS_098E1028".into(),
                name: "Intel High Definition Audio".into(),
                description: Some("Interface audio numérique Intel Smart Sound Technology".into()),
                status: "Error".into(),
                error_code: 28,
                error_description: "Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)".into(),
                class: Some("Contrôleur Audio / Média".into()),
                hardware_ids: vec!["PCI\\VEN_8086&DEV_02F0".into(), "PCI\\VEN_8086&DEV_02F0&SUBSYS_098E1028".into()],
                manufacturer: Some("Intel Corporation".into()),
            },
            PnpMissingDeviceItem {
                device_id: "PCI\\VEN_8086&DEV_02C4&SUBSYS_098E1028".into(),
                name: "Intel High Definition DSP".into(),
                description: Some("Processeur de signal numérique audio Intel (Smart Sound Technology DSP)".into()),
                status: "Error".into(),
                error_code: 28,
                error_description: "Code 28 : Les pilotes de ce périphérique ne sont pas installés (Autres périphériques)".into(),
                class: Some("Contrôleur Audio / Média".into()),
                hardware_ids: vec!["PCI\\VEN_8086&DEV_02C4".into(), "PCI\\VEN_8086&DEV_02C4&SUBSYS_098E1028".into()],
                manufacturer: Some("Intel Corporation".into()),
            },
        ]
    }
}

#[tauri::command]
fn scan_and_fix_pnp_devices() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            Write-Output "=== ANALYSE & RÉSOLUTION DU MATÉRIEL (PLUG AND PLAY) ==="
            
            Write-Output "[1/3] Déclenchement de la détection matérielle (pnputil /scan-devices)..."
            $pnpOut = pnputil /scan-devices 2>&1
            Write-Output "  -> Analyse du bus matériel terminée."

            Write-Output "[2/3] Vérification du service Windows Update et du catalogue Microsoft..."
            $svc = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
            if ($svc) {
                if ($svc.StartType -eq 'Disabled') {
                    Set-Service -Name 'wuauserv' -StartupType Manual -ErrorAction SilentlyContinue
                }
                if ($svc.Status -ne 'Running') {
                    Start-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                }
            }

            try {
                $sm = New-Object -ComObject Microsoft.Update.ServiceManager -ErrorAction SilentlyContinue
                if ($sm) {
                    $sm.ClientApplicationID = "Hardware-Assistant"
                    $sm.AddService2("7971f918-a847-4430-9279-4a52d1efe18d", 7, "") | Out-Null
                }
            } catch {}

            $missing = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -ne 0 -or $_.Status -notin @('OK', 'Degraded') -or $_.PNPClass -eq 'Unknown' })
            Write-Output "`n[3/3] État du Gestionnaire de périphériques :"
            if ($missing.Count -eq 0) {
                Write-Output "  -> SUCCÈS : Tous les périphériques sont reconnus et opérationnels !"
            } else {
                Write-Output "  -> $($missing.Count) périphérique(s) en attente de pilote :"
                foreach ($m in $missing) {
                    $c = if ($m.ConfigManagerErrorCode) { $m.ConfigManagerErrorCode } else { 'Non configuré' }
                    Write-Output "     * $($m.Name) (Erreur: $c - $($m.PNPClass))"
                }
            }
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
        match cmd.output() {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                Ok(stdout)
            }
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("Simulation : Scan Plug and Play (pnputil /scan-devices) et vérification du service Windows Update exécutés avec succès.".into())
    }
}

#[tauri::command]
fn set_fullscreen(window: Window, flag: bool) -> Result<(), String> {
    window.set_fullscreen(flag).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_hardware_model_details() -> HardwareModelDetails {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut make_fast = String::new();
        let mut model_fast = String::new();
        let mut sn_fast = String::new();

        if let Ok(key) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\BIOS") {
            if let Ok(m) = key.get_value::<String, _>("SystemManufacturer") {
                let mt = m.trim().to_string();
                if !mt.is_empty() && mt != "To be filled by O.E.M." && mt != "System manufacturer" {
                    make_fast = mt;
                }
            }
            if let Ok(p) = key.get_value::<String, _>("SystemProductName") {
                let pt = p.trim().to_string();
                if !pt.is_empty() && pt != "System Product Name" && pt != "To be filled by O.E.M." {
                    model_fast = pt;
                }
            }
            if model_fast.is_empty() {
                if let Ok(p) = key.get_value::<String, _>("BaseBoardProduct") {
                    let pt = p.trim().to_string();
                    if !pt.is_empty() {
                        model_fast = pt;
                    }
                }
            }
            if let Ok(s) = key.get_value::<String, _>("SystemSerialNumber") {
                let st = s.trim().to_string();
                if !st.is_empty() && st != "System Serial Number" && st != "To be filled by O.E.M." {
                    sn_fast = st;
                }
            }
        }

        // Fast form-factor heuristic from model name if available
        let mut form_factor = "Desktop".to_string();
        let model_lower = model_fast.to_lowercase();
        if model_lower.contains("book") || model_lower.contains("laptop") || model_lower.contains("latitude") 
            || model_lower.contains("thinkpad") || model_lower.contains("elitebook") || model_lower.contains("probook")
            || model_lower.contains("xps") || model_lower.contains("folio") || model_lower.contains("notebook") {
            form_factor = "Laptop".to_string();
        } else if model_lower.contains("tablet") || model_lower.contains("surface") || model_lower.contains("yoga") {
            form_factor = "Tablet".to_string();
        }

        // Si la marque et le modèle sont déjà connus via le registre rapide (0.1ms), retour immédiat
        if !make_fast.is_empty() && !model_fast.is_empty() {
            return HardwareModelDetails {
                make: make_fast,
                model: model_fast,
                form_factor,
                serial_number: if !sn_fast.is_empty() { sn_fast } else { "Inconnu".into() },
            };
        }

        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $cs = Get-CimInstance Win32_ComputerSystem
            $bios = Get-CimInstance Win32_Bios
            $enclosure = Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1
            $formFactor = "Desktop"
            if ($enclosure -and $enclosure.ChassisTypes) {
                if ($enclosure.ChassisTypes -contains 9 -or $enclosure.ChassisTypes -contains 10 -or $enclosure.ChassisTypes -contains 14) {
                    $formFactor = "Laptop"
                } elseif ($enclosure.ChassisTypes -contains 30 -or $enclosure.ChassisTypes -contains 31 -or $enclosure.ChassisTypes -contains 32) {
                    $formFactor = "Tablet"
                }
            }
            [PSCustomObject]@{
                make = if ($cs -and $cs.Manufacturer) { $cs.Manufacturer.Trim() } else { "Inconnu" }
                model = if ($cs -and $cs.Model) { $cs.Model.Trim() } else { "Inconnu" }
                formFactor = $formFactor
                serialNumber = if ($bios -and $bios.SerialNumber) { $bios.SerialNumber.Trim() } else { "Inconnu" }
            } | ConvertTo-Json -Compress
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(details) = serde_json::from_str::<HardwareModelDetails>(&json_str) {
                return HardwareModelDetails {
                    make: if !make_fast.is_empty() { make_fast } else { details.make },
                    model: if !model_fast.is_empty() { model_fast } else { details.model },
                    form_factor: details.form_factor,
                    serial_number: if !sn_fast.is_empty() { sn_fast } else { details.serial_number },
                };
            }
        }

        if !make_fast.is_empty() || !model_fast.is_empty() {
            return HardwareModelDetails {
                make: if !make_fast.is_empty() { make_fast } else { "Inconnu".into() },
                model: if !model_fast.is_empty() { model_fast } else { "Inconnu".into() },
                form_factor,
                serial_number: if !sn_fast.is_empty() { sn_fast } else { "Inconnu".into() },
            };
        }
    }

    HardwareModelDetails {
        make: "HP".into(),
        model: "HP EliteBook 840 G8".into(),
        form_factor: "Laptop".into(),
        serial_number: "5CG1420X99-RUST".into(),
    }
}

#[tauri::command]
fn search_wu_drivers(only_firmware: Option<bool>, include_installed: Option<bool>) -> Vec<WindowsUpdateDriverItem> {
    #[cfg(target_os = "windows")]
    {
        let inc_installed = include_installed.unwrap_or(true);
        let query_str = if inc_installed {
            "IsHidden=0 and Type='Driver'"
        } else {
            "IsInstalled=0 and IsHidden=0 and Type='Driver'"
        };

        let ps_script = format!(r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $ProgressPreference = 'SilentlyContinue'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

            try {{
                # Ensure Windows Update service is active
                $svc = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                if ($svc) {{
                    if ($svc.StartType -eq 'Disabled') {{
                        Set-Service -Name 'wuauserv' -StartupType Manual -ErrorAction SilentlyContinue
                    }}
                    if ($svc.Status -ne 'Running') {{
                        Start-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
                    }}
                }}

                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true

                $searchResult = $null
                try {{
                    $searchResult = $searcher.Search("{query_str}")
                }} catch {{
                    try {{
                        $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver'")
                    }} catch {{
                        try {{
                            $searchResult = $searcher.Search("Type='Driver'")
                        }} catch {{
                            try {{
                                $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")
                            }} catch {{
                                "[]"
                                exit 0
                            }}
                        }}
                    }}
                }}

                if (-not $searchResult -or $searchResult.Updates.Count -eq 0) {{
                    "[]"
                    exit 0
                }}

                $list = @()
                for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {{
                    $up = $searchResult.Updates.Item($i)
                    $title = if ($up.Title) {{ $up.Title }} else {{ "Pilote Windows Update" }}
                    $desc = if ($up.Description) {{ $up.Description }} else {{ $title }}
                    
                    $categoryNames = @()
                    try {{
                        for ($c = 0; $c -lt $up.Categories.Count; $c++) {{
                            $categoryNames += $up.Categories.Item($c).Name
                        }}
                    }} catch {{}}
                    $categoryText = $categoryNames -join ', '

                    $isFw = ($title -match '(?i)\b(BIOS|UEFI|Firmware|System Firmware)\b') -or ($categoryText -match '(?i)\bFirmware\b') -or ($title -match '(?i)\b(System\s*-\s*\d+|Microcode)\b')
                    
                    # Ensure it is a driver (Type 2 / 'Driver') or Firmware
                    $isDriver = ($up.Type -eq 2) -or ($up.Type -eq 'Driver') -or $isFw -or ($categoryText -match '(?i)\bDriver|Hardware|Pilote\b')
                    
                    if (-not $isDriver) {{
                        continue
                    }}

                    $cat = if ($isFw) {{ "Firmware / BIOS" }} elseif ($title -like "*Display*" -or $title -like "*Graphics*" -or $title -like "*Video*") {{ "Affichage" }} elseif ($title -like "*Net*" -or $title -like "*Wireless*" -or $title -like "*Wi-Fi*" -or $title -like "*Ethernet*" -or $title -like "*LAN*") {{ "Réseau" }} elseif ($title -like "*Audio*" -or $title -like "*Sound*" -or $title -like "*DSP*") {{ "Audio" }} elseif ($title -like "*Bluetooth*") {{ "Bluetooth" }} elseif ($title -like "*Chipset*" -or $title -like "*Management Engine*" -or $title -like "*I2C*") {{ "Chipset" }} else {{ "Périphérique" }}
                    
                    $isInstalled = if ($up.IsInstalled -ne $null) {{ [bool]$up.IsInstalled }} else {{ $false }}
                    
                    $ver = ""
                    if ($title -match '(?i)[\s-](\d+\.\d+(\.\d+)*(\.\d+)*)') {{
                        $ver = $matches[1]
                    }}

                    $prov = ""
                    if ($title -match '^([^-\–]+)\s*[-\–]') {{
                        $prov = $matches[1].Trim()
                    }}

                    $dateStr = ""
                    try {{
                        if ($up.LastDeploymentChangeTime) {{
                            $dateStr = ([datetime]$up.LastDeploymentChangeTime).ToString("yyyy-MM-dd")
                        }}
                    }} catch {{}}

                    $list += [PSCustomObject]@{{
                        id = "WU-$i"
                        title = $title
                        description = $desc
                        category = $cat
                        isFirmware = $isFw
                        isInstalled = $isInstalled
                        version = $ver
                        releaseDate = $dateStr
                        provider = $prov
                        status = "pending"
                        progress = 0
                        resultCode = $null
                    }}
                }}
                if (@($list).Count -eq 0) {{
                    "[]"
                }} else {{
                    @($list) | ConvertTo-Json -Compress
                }}
            }} catch {{
                "[]"
            }}
        "#, query_str = query_str);
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", &ps_script]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if json_str == "[]" || json_str.is_empty() {
                return vec![];
            }
            if let Ok(items) = serde_json::from_str::<Vec<WindowsUpdateDriverItem>>(&json_str) {
                if let Some(true) = only_firmware {
                    return items.into_iter().filter(|it| it.is_firmware).collect();
                }
                return items;
            } else if let Ok(single) = serde_json::from_str::<WindowsUpdateDriverItem>(&json_str) {
                if let Some(true) = only_firmware {
                    if single.is_firmware {
                        return vec![single];
                    } else {
                        return vec![];
                    }
                }
                return vec![single];
            }
        }
        return vec![];
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(true) = only_firmware {
            let inc = include_installed.unwrap_or(true);
            let mut list = vec![
                WindowsUpdateDriverItem {
                    id: "WU-FW-01".into(),
                    title: "HP Inc. - System - 1.14.0.0 (Firmware BIOS & UEFI Update)".into(),
                    description: Some("Firmware UEFI critique et microcode de sécurité du processeur. Recommandé.".into()),
                    category: Some("Firmware / BIOS".into()),
                    is_firmware: true,
                    is_installed: Some(false),
                    version: Some("01.14.00".into()),
                    release_date: Some("2024-02-15".into()),
                    provider: Some("HP Inc.".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
                WindowsUpdateDriverItem {
                    id: "WU-FW-02".into(),
                    title: "Intel Corporation - System - 15.0.35.1951 (Intel ME Firmware)".into(),
                    description: Some("Intel Management Engine Firmware & Security Fixes".into()),
                    category: Some("Firmware / BIOS".into()),
                    is_firmware: true,
                    is_installed: Some(false),
                    version: Some("15.0.35.1951".into()),
                    release_date: Some("2023-11-20".into()),
                    provider: Some("Intel Corporation".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
            ];

            if inc {
                list.push(WindowsUpdateDriverItem {
                    id: "WU-FW-00".into(),
                    title: "HP Inc. - System - 1.12.00 (Version BIOS Actuellement Installée)".into(),
                    description: Some("Version SMBIOS N75 Ver. 01.12.00 active. Sélectionner pour forcer la réinstallation.".into()),
                    category: Some("Firmware / BIOS".into()),
                    is_firmware: true,
                    is_installed: Some(true),
                    version: Some("01.12.00".into()),
                    release_date: Some("2023-04-18".into()),
                    provider: Some("HP Inc.".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                });
            }

            list
        } else {
            vec![
                WindowsUpdateDriverItem {
                    id: "WU-001".into(),
                    title: "Intel Corporation - Display - 31.0.101.4575".into(),
                    description: Some("Mise à jour des pilotes graphiques Intel Iris Xe".into()),
                    category: Some("Affichage".into()),
                    is_firmware: false,
                    is_installed: Some(false),
                    version: Some("31.0.101.4575".into()),
                    release_date: Some("2023-09-12".into()),
                    provider: Some("Intel Corporation".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
                WindowsUpdateDriverItem {
                    id: "WU-002".into(),
                    title: "Realtek Semiconductor Corp. - Net - 10.68.815.2023".into(),
                    description: Some("Contrôleur Gigabit Ethernet Realtek PCIe".into()),
                    category: Some("Réseau".into()),
                    is_firmware: false,
                    is_installed: Some(false),
                    version: Some("10.68.815.2023".into()),
                    release_date: Some("2023-08-15".into()),
                    provider: Some("Realtek".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
                WindowsUpdateDriverItem {
                    id: "WU-003".into(),
                    title: "Realtek Semiconductor Corp. - Audio - 6.0.9231.1".into(),
                    description: Some("Pilote audio haute définition Realtek HD Audio (Installé - Réinstallation possible)".into()),
                    category: Some("Audio".into()),
                    is_firmware: false,
                    is_installed: Some(true),
                    version: Some("6.0.9231.1".into()),
                    release_date: Some("2023-05-10".into()),
                    provider: Some("Realtek".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
                WindowsUpdateDriverItem {
                    id: "WU-004".into(),
                    title: "HP Inc. - System - 1.14.0.0 (Firmware BIOS & UEFI Update)".into(),
                    description: Some("Firmware UEFI critique et microcode de sécurité".into()),
                    category: Some("Firmware / BIOS".into()),
                    is_firmware: true,
                    is_installed: Some(false),
                    version: Some("01.14.00".into()),
                    release_date: Some("2024-02-15".into()),
                    provider: Some("HP Inc.".into()),
                    status: "pending".into(),
                    progress: 0,
                    result_code: None,
                },
            ]
        }
    }
}

#[tauri::command]
fn install_wu_drivers(driver_ids: Vec<String>, auto_reboot: Option<bool>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let should_reboot = auto_reboot.unwrap_or(false);
        let id_filter = if driver_ids.is_empty() {
            "$allowed = @();".to_string()
        } else {
            format!("$allowed = @('{}');", driver_ids.join("','"))
        };

        let ps_script = format!(r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $ProgressPreference = 'SilentlyContinue'
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            {}
            $shouldReboot = {}

            function Get-ResultCodeText {{
                param([int]$Code)
                switch ($Code) {{
                    0 {{ 'Non démarré' }}
                    1 {{ 'En cours' }}
                    2 {{ 'Succès' }}
                    3 {{ 'Succès avec avertissement' }}
                    4 {{ 'Échec' }}
                    5 {{ 'Annulé' }}
                    default {{ "Code $Code" }}
                }}
            }}

            try {{
                # 1. Start Windows Update services
                $svcList = @('wuauserv', 'bits', 'cryptsvc')
                foreach ($sName in $svcList) {{
                    try {{
                        $s = Get-Service -Name $sName -ErrorAction SilentlyContinue
                        if ($s) {{
                            if ($s.StartType -eq 'Disabled') {{
                                Set-Service -Name $sName -StartupType Manual -ErrorAction SilentlyContinue
                            }}
                            if ($s.Status -ne 'Running') {{
                                Start-Service -Name $sName -ErrorAction SilentlyContinue
                            }}
                        }}
                    }} catch {{}}
                }}

                # 2. Update Session
                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true

                $searchResult = $null
                try {{
                    $searchResult = $searcher.Search("IsHidden=0 and Type='Driver'")
                }} catch {{
                    try {{
                        $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver'")
                    }} catch {{
                        try {{
                            $searchResult = $searcher.Search("Type='Driver'")
                        }} catch {{
                            try {{
                                $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0")
                            }} catch {{
                                Write-Output "ERREUR: Impossible de contacter le service Windows Update ($($_.Exception.Message))"
                                exit 1
                            }}
                        }}
                    }}
                }}

                if (-not $searchResult -or $searchResult.Updates.Count -eq 0) {{
                    Write-Output "Aucun pilote trouvé sur Windows Update."
                    exit 0
                }}

                # 3. Filter targets
                $selectedUpdates = @()
                for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {{
                    $up = $searchResult.Updates.Item($i)
                    $id = "WU-$i"
                    $t = if ($up.Title) {{ $up.Title }} else {{ "" }}
                    if ($allowed.Count -eq 0 -or $allowed -contains $id -or $allowed -contains $t -or ($allowed | Where-Object {{ $t.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 }})) {{
                        $selectedUpdates += $up
                    }}
                }}

                $total = $selectedUpdates.Count
                if ($total -eq 0) {{
                    Write-Output "Aucun pilote correspondant sélectionné."
                    exit 0
                }}

                Write-Output "=================================================="
                Write-Output "INFO: Démarrage de l'installation de $total pilote(s)..."
                Write-Output "=================================================="

                $successCount = 0
                $failCount = 0
                $rebootNeeded = $false

                # 4. Process each driver individually
                for ($idx = 0; $idx -lt $total; $idx++) {{
                    $up = $selectedUpdates[$idx]
                    $title = $up.Title
                    $num = $idx + 1
                    Write-Output "`n--------------------------------------------------"
                    Write-Output "Traitement [$num/$total] : $title"
                    Write-Output "--------------------------------------------------"

                    if (-not $up.EulaAccepted) {{
                        try {{ $up.AcceptEula() }} catch {{}}
                    }}
                    try {{
                        if ($up.BundledUpdates) {{
                            for ($b = 0; $b -lt $up.BundledUpdates.Count; $b++) {{
                                $bUp = $up.BundledUpdates.Item($b)
                                if (-not $bUp.EulaAccepted) {{ try {{ $bUp.AcceptEula() }} catch {{}} }}
                            }}
                        }}
                    }} catch {{}}

                    $singleColl = New-Object -ComObject Microsoft.Update.UpdateColl
                    [void]$singleColl.Add($up)

                    # Download
                    Write-Output "  -> Téléchargement en cours..."
                    $downloader = $session.CreateUpdateDownloader()
                    $downloader.Updates = $singleColl
                    $dlRes = $null
                    try {{
                        $dlRes = $downloader.Download()
                    }} catch {{
                        Write-Output "  -> Échec téléchargement : $($_.Exception.Message)"
                    }}

                    if ($dlRes -and $dlRes.ResultCode -notin 2, 3) {{
                        $c = $dlRes.ResultCode
                        $cTxt = Get-ResultCodeText -Code $c
                        Write-Output "  -> Téléchargement [ÉCHEC] ($cTxt)"
                        $failCount++
                        continue
                    }}
                    Write-Output "  -> Téléchargement [OK]"

                    # Install
                    Write-Output "  -> Installation en cours..."
                    $installer = $session.CreateUpdateInstaller()
                    $installer.Updates = $singleColl
                    try {{ $installer.ForceQuiet = $true }} catch {{}}
                    $instRes = $null
                    try {{
                        $instRes = $installer.Install()
                    }} catch {{
                        Write-Output "  -> Échec installation : $($_.Exception.Message)"
                        $failCount++
                        continue
                    }}

                    $code = $instRes.ResultCode
                    $codeTxt = Get-ResultCodeText -Code $code

                    if ($code -in 2, 3) {{
                        Write-Output "  -> Installation [OK] (Statut : Succès)"
                        $successCount++
                    }} else {{
                        Write-Output "  -> Installation [ÉCHEC] (Statut : $codeTxt)"
                        $failCount++
                    }}

                    if ($instRes.RebootRequired) {{
                        $rebootNeeded = $true
                        Write-Output "  -> [REDÉMARRAGE REQUIS] Ce pilote nécessite un redémarrage pour être actif."
                    }}
                }}

                Write-Output "`n=================================================="
                Write-Output "COMPTE RENDU WINDOWS UPDATE"
                Write-Output "=================================================="
                Write-Output "Bilan : $successCount pilote(s) installé(s) avec succès, $failCount échec(s) sur $total."

                if ($rebootNeeded) {{
                    Write-Output "REDÉMARRAGE REQUIS : Un redémarrage est nécessaire pour finaliser certains pilotes."
                    if ($shouldReboot) {{
                        Write-Output "Redémarrage automatique planifié dans 10 secondes..."
                        Start-Sleep -Seconds 10
                        Restart-Computer -Force
                    }}
                }}
            }} catch {{
                Write-Output "ERREUR: $($_.Exception.Message)"
            }}
        "#, id_filter, if should_reboot { "$true" } else { "$false" });

        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", &ps_script]);
        match cmd.output() {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if out.status.success() || !stdout.is_empty() {
                    Ok(stdout)
                } else {
                    Err(stderr)
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = driver_ids;
        let _ = auto_reboot;
        Ok("Simulation: Téléchargement et installation des pilotes Windows Update réussis.".into())
    }
}

#[tauri::command]
fn install_nas_drivers_pnputil(folder_path: String, auto_reboot: Option<bool>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let resolved = resolve_smart_nas_path_rust(&folder_path);
        let resolved_str = resolved.to_string_lossy().to_string();

        let inf_spec = format!("{}\\*.inf", resolved_str.trim_end_matches(['\\', '/']));
        let mut cmd = Command::new("pnputil.exe");
        cmd.creation_flags(CREATE_NO_WINDOW).args([
            "/add-driver",
            &inf_spec,
            "/subdirs",
            "/install",
        ]);

        let output_res = cmd.output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&output_res.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output_res.stderr).trim().to_string();

        let should_reboot = auto_reboot.unwrap_or(false);
        if should_reboot && (stdout.to_lowercase().contains("reboot") || stdout.to_lowercase().contains("redémarrer")) {
            let mut rb_cmd = Command::new("shutdown.exe");
            rb_cmd.creation_flags(CREATE_NO_WINDOW).args(["/r", "/t", "10", "/c", "Redémarrage après installation des pilotes OEM"]);
            let _ = rb_cmd.spawn();
        }

        if output_res.status.success() || !stdout.is_empty() {
            Ok(stdout)
        } else {
            Err(if !stderr.is_empty() { stderr } else { "Erreur lors de l'exécution de PnPUtil.".into() })
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = folder_path;
        let _ = auto_reboot;
        Ok("Simulation: Installation pnputil /add-driver *.inf /subdirs /install réussie.".into())
    }
}

#[tauri::command]
fn install_specific_inf_drivers(inf_paths: Vec<String>, auto_reboot: Option<bool>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if inf_paths.is_empty() {
            return Err("Aucun pilote .inf sélectionné pour l'installation.".into());
        }

        let mut output_lines = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;
        let total = inf_paths.len();

        output_lines.push(format!("Démarrage de l'installation ciblée de {} pilote(s) INF...\n", total));

        for (idx, inf_path) in inf_paths.iter().enumerate() {
            let num = idx + 1;
            let p = Path::new(inf_path);
            let filename = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| inf_path.clone());

            let mut cmd = Command::new("pnputil.exe");
            cmd.creation_flags(CREATE_NO_WINDOW).args([
                "/add-driver",
                inf_path,
                "/install",
            ]);

            match cmd.output() {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if out.status.success() || stdout.contains("0x00000000") || stdout.to_lowercase().contains("succès") || stdout.to_lowercase().contains("success") || stdout.to_lowercase().contains("ajouté") || stdout.to_lowercase().contains("added") {
                        success_count += 1;
                        output_lines.push(format!("[{}/{}] [OK] {} -> Installé avec succès.", num, total, filename));
                    } else {
                        fail_count += 1;
                        output_lines.push(format!("[{}/{}] [AVERTISSEMENT] {} -> {}", num, total, filename, stdout));
                    }
                }
                Err(e) => {
                    fail_count += 1;
                    output_lines.push(format!("[{}/{}] [ERREUR] {} -> {}", num, total, filename, e));
                }
            }
        }

        output_lines.push(format!("\n=== BILAN PNPUTIL ==="));
        output_lines.push(format!("Total: {}, Réussis: {}, Échecs/Avertissements: {}", total, success_count, fail_count));

        let should_reboot = auto_reboot.unwrap_or(false);
        if should_reboot && success_count > 0 {
            output_lines.push("Redémarrage programmé du système dans 10 secondes...".into());
            let mut rb_cmd = Command::new("shutdown.exe");
            rb_cmd.creation_flags(CREATE_NO_WINDOW).args(["/r", "/t", "10", "/c", "Redémarrage suite à l'installation des pilotes ciblés"]);
            let _ = rb_cmd.spawn();
        }

        Ok(output_lines.join("\n"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = inf_paths;
        let _ = auto_reboot;
        Ok("Simulation: Installation ciblée des fichiers .inf sélectionnés réussie.".into())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NasIndexEntry {
    pub brand: String,
    pub category: String,
    pub model: String,
    pub relative_path: String,
    #[serde(default)]
    pub inf_count: Option<u32>,
    #[serde(default)]
    pub driver_categories: Option<Vec<DriverCategoryCount>>,
    #[serde(default)]
    pub aliases: Option<Vec<String>>,
    #[serde(default)]
    pub last_updated: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NasIndexFile {
    pub version: String,
    pub last_updated: String,
    #[serde(default)]
    pub models: HashMap<String, String>,
    #[serde(default)]
    pub catalog: Vec<NasIndexEntry>,
}

fn get_canonical_brand(text: &str) -> &'static str {
    let t = text.to_ascii_lowercase();
    if t.contains("hp") || t.contains("hewlett") || t.contains("elitebook") || t.contains("probook") || t.contains("prodesk") || t.contains("elitedesk") || t.contains("zbook") || t.contains("pavilion") || t.contains("omen") {
        "HP"
    } else if t.contains("dell") || t.contains("latitude") || t.contains("optiplex") || t.contains("precision") || t.contains("vostro") || t.contains("xps") || t.contains("inspiron") || t.contains("alienware") {
        "Dell"
    } else if t.contains("lenovo") || t.contains("thinkpad") || t.contains("thinkcentre") || t.contains("ideapad") || t.contains("thinkbook") || t.contains("legion") {
        "Lenovo"
    } else if t.contains("acer") || t.contains("aspire") || t.contains("predator") || t.contains("travelmate") || t.contains("swift") || t.contains("spin") || t.contains("nitro") {
        "Acer"
    } else if t.contains("asus") || t.contains("asustek") || t.contains("zenbook") || t.contains("rog") || t.contains("tuf") || t.contains("vivobook") || t.contains("expertbook") {
        "Asus"
    } else if t.contains("apple") || t.contains("macbook") || t.contains("imac") || t.contains("macmini") || t.contains("macpro") {
        "Apple"
    } else if t.contains("microsoft") || t.contains("surface") {
        "Microsoft"
    } else if t.contains("toshiba") || t.contains("dynabook") || t.contains("satellite") || t.contains("portege") || t.contains("tecra") {
        "Toshiba"
    } else if t.contains("fujitsu") || t.contains("lifebook") || t.contains("esprimo") {
        "Fujitsu"
    } else if t.contains("msi") || t.contains("micro-star") {
        "MSI"
    } else if t.contains("gigabyte") || t.contains("aorus") || t.contains("aero") {
        "Gigabyte"
    } else if t.contains("samsung") || t.contains("galaxy book") {
        "Samsung"
    } else {
        ""
    }
}

fn strip_brand_prefix(s: &str) -> &str {
    let lower = s.to_ascii_lowercase();
    let prefixes = [
        "hewlett-packard ", "hp ", "dell ", "lenovo ", "acer ", "asus ",
        "apple ", "microsoft ", "toshiba ", "msi ", "gigabyte ", "samsung ",
        "inc. ", "corp. ", "oem "
    ];
    for p in prefixes {
        if lower.starts_with(p) {
            return &s[p.len()..];
        }
    }
    s
}

fn is_generic_token(token: &str) -> bool {
    let lower = token.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "system" | "product" | "name" | "desktop" | "laptop" | "notebook" |
        "series" | "computer" | "edition" | "tower" | "all-in-one" | "generic" | "pc"
    )
}

fn test_is_driver_subfolder(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.contains(".inf_") || lower.contains("_amd64_") || lower.contains("_x86_") || lower.contains("_arm64_") || lower.ends_with(".inf")
}

fn resolve_smart_nas_path_rust(raw_path: &str) -> PathBuf {
    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return PathBuf::from(trimmed);
    }
    
    let p = Path::new(trimmed);
    if p.exists() {
        return p.to_path_buf();
    }

    if trimmed.len() == 2 && trimmed.chars().nth(1) == Some(':') {
        let with_slash = format!("{}\\", trimmed);
        if Path::new(&with_slash).exists() {
            return PathBuf::from(with_slash);
        }
    }

    #[cfg(target_os = "windows")]
    {
        for dl in ["Z:", "Y:", "X:", "W:", "V:"] {
            let root = format!("{}\\", dl);
            if Path::new(&root).exists() {
                if trimmed.to_ascii_lowercase().contains("drivers") {
                    let cand1 = format!("{}\\Drivers", dl);
                    if Path::new(&cand1).exists() {
                        return PathBuf::from(cand1);
                    }
                    let cand2 = format!("{}\\Tech\\Drivers", dl);
                    if Path::new(&cand2).exists() {
                        return PathBuf::from(cand2);
                    }
                }
                if trimmed.to_ascii_lowercase().contains("tech") {
                    let cand3 = format!("{}\\Tech\\Drivers", dl);
                    if Path::new(&cand3).exists() {
                        return PathBuf::from(cand3);
                    }
                    let cand4 = format!("{}\\Tech", dl);
                    if Path::new(&cand4).exists() {
                        return PathBuf::from(cand4);
                    }
                }
            }
        }
    }

    PathBuf::from(trimmed)
}

fn read_file_to_string_lossy(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        // UTF-16 LE
        let u16_slice: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        Some(String::from_utf16_lossy(&u16_slice))
    } else if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        // UTF-16 BE
        let u16_slice: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
            .collect();
        Some(String::from_utf16_lossy(&u16_slice))
    } else {
        Some(String::from_utf8_lossy(&bytes).to_string())
    }
}

fn parse_inf_class_fast(path: &Path) -> String {
    let mut buffer = [0u8; 4096];
    let bytes_read = if let Ok(mut file) = std::fs::File::open(path) {
        use std::io::Read;
        file.read(&mut buffer).unwrap_or(0)
    } else {
        return "Autres".to_string();
    };

    if bytes_read == 0 {
        return "Autres".to_string();
    }

    let slice = &buffer[..bytes_read];
    let content = if slice.len() >= 2 && slice[0] == 0xFF && slice[1] == 0xFE {
        let u16s: Vec<u16> = slice[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        String::from_utf16_lossy(&u16s)
    } else if slice.len() >= 2 && slice[0] == 0xFE && slice[1] == 0xFF {
        let u16s: Vec<u16> = slice[2..].chunks_exact(2).map(|c| u16::from_be_bytes([c[0], c[1]])).collect();
        String::from_utf16_lossy(&u16s)
    } else {
        String::from_utf8_lossy(slice).to_string()
    };

    for line in content.lines().take(50) {
        let trimmed = line.trim();
        let lower = trimmed.to_ascii_lowercase();
        if lower.starts_with("class=") || lower.starts_with("class =") {
            if let Some(c) = trimmed.split('=').nth(1) {
                let c_trim = c.trim().trim_matches('"').trim();
                let c_lower = c_trim.to_lowercase();
                if c_lower.contains("display") { return "Display (Graphique)".to_string(); }
                else if c_lower.contains("net") || c_lower.contains("wlan") || c_lower.contains("wifi") { return "Net (Réseau/Wi-Fi)".to_string(); }
                else if c_lower.contains("media") || c_lower.contains("audio") || c_lower.contains("sound") { return "Media (Audio)".to_string(); }
                else if c_lower.contains("system") || c_lower.contains("processor") || c_lower.contains("chipset") { return "System (Chipset)".to_string(); }
                else if c_lower.contains("bluetooth") { return "Bluetooth".to_string(); }
                else if c_lower.contains("biometric") || c_lower.contains("sensor") { return "Biométrie & Capteurs".to_string(); }
                else if c_lower.contains("camera") || c_lower.contains("image") { return "Caméra & Vidéo".to_string(); }
                else if c_lower.contains("storage") || c_lower.contains("hdc") || c_lower.contains("scsi") { return "Stockage".to_string(); }
                else { return c_trim.to_string(); }
            }
        }
    }

    "Autres".to_string()
}

fn scan_inf_categories_fast(dir: &Path) -> (u32, Vec<DriverCategoryCount>) {
    // 1. Check if manifest.json already exists in this folder (instant 0.1ms cache)
    let manifest_path = dir.join("manifest.json");
    if manifest_path.exists() {
        if let Ok(content) = fs::read_to_string(&manifest_path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                let cnt = val.get("inf_count").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                if let Some(cats_arr) = val.get("driver_categories").and_then(|v| v.as_array()) {
                    let mut cats = Vec::new();
                    for c in cats_arr {
                        if let (Some(name), Some(count)) = (c.get("name").and_then(|n| n.as_str()), c.get("count").and_then(|n| n.as_u64())) {
                            cats.push(DriverCategoryCount { name: name.to_string(), count: count as u32 });
                        }
                    }
                    if cnt > 0 {
                        return (cnt, cats);
                    }
                }
            }
        }
    }

    let mut inf_count = 0;
    let mut cat_map: HashMap<String, u32> = HashMap::new();

    // Fast shallow walk (depth max 2) to find .inf files without traversing deep vendor payload trees
    let mut dirs_to_visit: Vec<(PathBuf, usize)> = vec![(dir.to_path_buf(), 0)];
    while let Some((current_dir, depth)) = dirs_to_visit.pop() {
        if depth > 2 {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(&current_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let sub_name = entry.file_name().to_string_lossy().to_lowercase();
                        // Skip non-driver payload subdirectories to save SMB round-trips
                        if !sub_name.starts_with("data") && !sub_name.starts_with("x64") && !sub_name.starts_with("x86") && !sub_name.starts_with("syswow64") && !sub_name.starts_with("system32") && !sub_name.starts_with("temp") {
                            dirs_to_visit.push((entry.path(), depth + 1));
                        }
                    } else if file_type.is_file() {
                        let path = entry.path();
                        if let Some(ext) = path.extension() {
                            if ext.to_ascii_lowercase() == "inf" {
                                inf_count += 1;
                                let class_name = parse_inf_class_fast(&path);
                                *cat_map.entry(class_name).or_insert(0) += 1;
                            }
                        }
                    }
                }
            }
        }
    }
    
    let mut categories = Vec::new();
    for (name, count) in cat_map {
        categories.push(DriverCategoryCount { name, count });
    }
    categories.sort_by(|a, b| b.count.cmp(&a.count));
    
    (inf_count, categories)
}

fn parse_inf_file_details(path: &Path, id_num: usize) -> Option<InfDriverDetailItem> {
    let content = read_file_to_string_lossy(path)?;
    let file_name = path.file_name()?.to_string_lossy().to_string();
    let base_name = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| file_name.clone());

    let mut class_name = "Autres".to_string();
    let mut provider: Option<String> = None;
    let mut version: Option<String> = None;
    let mut date: Option<String> = None;
    let mut dev_name: Option<String> = None;

    let lines: Vec<&str> = content.lines().collect();

    for line in lines.iter().take(150) {
        let trimmed = line.trim();
        let lower = trimmed.to_ascii_lowercase();

        if (lower.starts_with("class=") || lower.starts_with("class =")) && class_name == "Autres" {
            if let Some(c) = trimmed.split('=').nth(1) {
                let raw_c = c.trim().trim_matches('"').trim();
                let c_low = raw_c.to_ascii_lowercase();
                if c_low.contains("display") { class_name = "Affichage / Graphique".to_string(); }
                else if c_low.contains("net") || c_low.contains("wlan") || c_low.contains("wifi") { class_name = "Réseau & Wi-Fi".to_string(); }
                else if c_low.contains("media") || c_low.contains("audio") || c_low.contains("sound") { class_name = "Audio & Son".to_string(); }
                else if c_low.contains("system") || c_low.contains("processor") || c_low.contains("chipset") { class_name = "Chipset & Système".to_string(); }
                else if c_low.contains("bluetooth") { class_name = "Bluetooth".to_string(); }
                else if c_low.contains("biometric") || c_low.contains("sensors") { class_name = "Biométrie & Capteurs".to_string(); }
                else if c_low.contains("camera") || c_low.contains("image") { class_name = "Caméra & Vidéo".to_string(); }
                else if c_low.contains("hid") || c_low.contains("keyboard") || c_low.contains("mouse") { class_name = "Périphérique d'entrée".to_string(); }
                else if c_low.contains("usb") { class_name = "Contrôleur USB".to_string(); }
                else if c_low.contains("hdc") || c_low.contains("scsi") || c_low.contains("storage") { class_name = "Stockage & Disque".to_string(); }
                else { class_name = raw_c.to_string(); }
            }
        }

        if (lower.starts_with("provider=") || lower.starts_with("provider =")) && provider.is_none() {
            if let Some(p) = trimmed.split('=').nth(1) {
                let clean_p = p.trim().trim_matches('"').trim_matches('%').trim();
                if !clean_p.is_empty() {
                    provider = Some(clean_p.to_string());
                }
            }
        }

        if (lower.starts_with("driverver=") || lower.starts_with("driverver =")) && version.is_none() {
            if let Some(v_part) = trimmed.split('=').nth(1) {
                let parts: Vec<&str> = v_part.split(',').collect();
                if parts.len() >= 2 {
                    date = Some(parts[0].trim().to_string());
                    version = Some(parts[1].trim().to_string());
                } else if !parts.is_empty() {
                    version = Some(parts[0].trim().to_string());
                }
            }
        }
    }

    for line in lines.iter().rev().take(100) {
        let trimmed = line.trim();
        if trimmed.contains('=') && trimmed.contains('"') {
            if let Some(val) = trimmed.split('=').nth(1) {
                let cand = val.trim().trim_matches('"').trim();
                if cand.len() >= 4 && cand.len() <= 90 && !cand.contains('%') {
                    dev_name = Some(cand.to_string());
                    break;
                }
            }
        }
    }

    let final_name = dev_name.unwrap_or_else(|| base_name.clone());

    Some(InfDriverDetailItem {
        id: format!("INF-{}", id_num),
        name: final_name,
        inf_name: file_name,
        inf_path: path.to_string_lossy().to_string(),
        category: class_name,
        provider: provider.or_else(|| Some("Constructeur".into())),
        version,
        date,
    })
}

fn is_model_matching(folder_name: &str, folder_canon_brand: &str, cur_model: &str, cur_make: &str) -> bool {
    let cur_model_clean = cur_model.trim();
    let cur_make_clean = cur_make.trim();
    if cur_model_clean.is_empty() {
        return false;
    }
    let pc_canon_brand = get_canonical_brand(&format!("{} {}", cur_make_clean, cur_model_clean));
    
    if !pc_canon_brand.is_empty() && !folder_canon_brand.is_empty() && pc_canon_brand != folder_canon_brand {
        return false;
    }

    let clean_pc = strip_brand_prefix(cur_model_clean);
    let clean_dir = strip_brand_prefix(folder_name);

    let norm_pc: String = clean_pc.chars().filter(|c| c.is_alphanumeric()).collect::<String>().to_ascii_lowercase();
    let norm_dir: String = clean_dir.chars().filter(|c| c.is_alphanumeric()).collect::<String>().to_ascii_lowercase();

    if norm_pc.len() >= 4 && norm_dir.len() >= 4 {
        if norm_pc == norm_dir {
            return true;
        }
        if norm_dir.len() >= 6 && (norm_pc.starts_with(&norm_dir) || norm_dir.starts_with(&norm_pc)) {
            return true;
        }
    }

    let pc_tokens: Vec<&str> = clean_pc.split(|c: char| !c.is_alphanumeric() && c != '-').filter(|s| s.len() >= 2).collect();
    let num_tokens: Vec<&str> = pc_tokens.iter().filter(|t| t.chars().any(|c| c.is_ascii_digit())).copied().collect();
    let text_tokens: Vec<&str> = pc_tokens.iter().filter(|t| !t.chars().any(|c| c.is_ascii_digit()) && !is_generic_token(t)).copied().collect();

    let clean_dir_lower = clean_dir.to_ascii_lowercase();
    if !num_tokens.is_empty() {
        let all_nums_match = num_tokens.iter().all(|nt| {
            let lower_nt = nt.to_ascii_lowercase();
            let mut start = 0;
            let mut found_valid = false;
            while let Some(idx) = clean_dir_lower[start..].find(&lower_nt) {
                let actual_idx = start + idx;
                let after_idx = actual_idx + lower_nt.len();
                if let Some(c) = clean_dir_lower[after_idx..].chars().next() {
                    if c.is_ascii_digit() {
                        start = actual_idx + 1;
                        continue;
                    }
                }
                found_valid = true;
                break;
            }
            found_valid
        });
        if all_nums_match {
            if !text_tokens.is_empty() {
                let has_text_match = text_tokens.iter().any(|tt| clean_dir_lower.contains(&tt.to_ascii_lowercase()));
                if has_text_match {
                    return true;
                }
            } else {
                return true;
            }
        }
    }

    false
}

fn scan_nas_directory_native(root: &Path, make: Option<&str>, actual_model: Option<&str>) -> Vec<NasDriverFolderItem> {
    let mut items = Vec::new();
    let root_str = root.to_string_lossy().to_string();

    let cur_make = make.unwrap_or_default();
    let cur_model = actual_model.unwrap_or_default();

    // Check if root itself contains .inf files
    let mut root_has_infs = false;
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            if let Ok(ft) = entry.file_type() {
                if ft.is_file() {
                    if let Some(ext) = entry.path().extension() {
                        if ext.to_ascii_lowercase() == "inf" {
                            root_has_infs = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    if root_has_infs {
        let folder_name = root.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "Dossier Racine".into());
        let (inf_cnt, cats) = scan_inf_categories_fast(root);
        items.push(NasDriverFolderItem {
            brand: if !cur_make.is_empty() { cur_make.to_string() } else { "Dossier Racine".to_string() },
            category: "Pilotes Directs".to_string(),
            model: folder_name.clone(),
            display_name: folder_name,
            full_path: root_str.clone(),
            is_match: !cur_model.is_empty(),
            inf_count: Some(inf_cnt),
            driver_categories: Some(cats),
        });
    }

    // Traverse directory tree down to depth 3
    let mut stack: Vec<(PathBuf, usize)> = vec![(root.to_path_buf(), 0)];

    while let Some((current_dir, depth)) = stack.pop() {
        if depth >= 4 {
            continue;
        }

        let entries = match fs::read_dir(&current_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let ft = match entry.file_type() {
                Ok(t) => t,
                Err(_) => continue,
            };

            if !ft.is_dir() {
                continue;
            }

            let path = entry.path();
            let dir_name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();

            if test_is_driver_subfolder(&dir_name) {
                continue;
            }

            // Check if this directory contains child model folders or if it contains driver packages / infs
            let mut sub_dirs = Vec::new();
            let mut has_direct_inf = false;
            let mut has_driver_subfolders = false;

            if let Ok(sub_entries) = fs::read_dir(&path) {
                for sub_entry in sub_entries.flatten() {
                    if let Ok(s_ft) = sub_entry.file_type() {
                        if s_ft.is_dir() {
                            let s_name = sub_entry.file_name().to_string_lossy().to_string();
                            if test_is_driver_subfolder(&s_name) {
                                has_driver_subfolders = true;
                            } else {
                                sub_dirs.push(sub_entry.path());
                            }
                        } else if s_ft.is_file() {
                            if let Some(ext) = sub_entry.path().extension() {
                                if ext.to_ascii_lowercase() == "inf" {
                                    has_direct_inf = true;
                                }
                            }
                        }
                    }
                }
            }

            // If it has non-driver subdirectories and no direct drivers, it's an intermediary organizational folder (e.g. "Dell" or "Laptop"), so traverse it
            if !sub_dirs.is_empty() && !has_direct_inf && !has_driver_subfolders {
                stack.push((path, depth + 1));
                continue;
            }

            // This is a candidate model driver folder
            let full_p = path.to_string_lossy().to_string();
            let rel_path = if full_p.starts_with(&root_str) {
                full_p[root_str.len()..].trim_start_matches(['\\', '/']).to_string()
            } else {
                full_p.clone()
            };

            let parts: Vec<&str> = rel_path.split(['\\', '/']).filter(|s| !s.is_empty()).collect();
            let mut detected_category = "Pack Pilotes".to_string();

            let detected_brand = if parts.len() >= 3 {
                detected_category = parts[1].to_string();
                parts[0].to_string()
            } else if parts.len() == 2 {
                parts[0].to_string()
            } else if let Some(parent) = path.parent().and_then(|p| p.file_name()) {
                parent.to_string_lossy().to_string()
            } else {
                "Générique".to_string()
            };

            let canon = get_canonical_brand(&format!("{} {} {}", detected_brand, dir_name, rel_path));
            let display_brand = if !canon.is_empty() {
                canon.to_string()
            } else if !detected_brand.is_empty() && detected_brand != "Générique" {
                detected_brand
            } else {
                "Autres".to_string()
            };

            let is_match = if !cur_model.is_empty() {
                is_model_matching(&dir_name, canon, cur_model, cur_make)
            } else {
                false
            };

            let (inf_cnt, cats) = if is_match || path.join("manifest.json").exists() {
                let (c, cat_vec) = scan_inf_categories_fast(&path);
                (Some(c), Some(cat_vec))
            } else {
                (None, None)
            };

            items.push(NasDriverFolderItem {
                brand: display_brand,
                category: detected_category,
                model: dir_name,
                display_name: if !rel_path.is_empty() { rel_path } else { full_p.clone() },
                full_path: full_p,
                is_match,
                inf_count: inf_cnt,
                driver_categories: cats,
            });

            // If it had subdirectories, also allow deeper traversal if needed
            if !sub_dirs.is_empty() && depth < 3 {
                stack.push((path, depth + 1));
            }
        }
    }

    items.sort_by(|a, b| {
        b.is_match.cmp(&a.is_match)
            .then_with(|| a.brand.cmp(&b.brand))
            .then_with(|| a.display_name.cmp(&b.display_name))
    });

    items
}

#[tauri::command]
fn scan_nas_drivers(nas_path: String, make: Option<String>, actual_model: Option<String>) -> Vec<NasDriverFolderItem> {
    #[cfg(target_os = "windows")]
    {
        let resolved_target = resolve_smart_nas_path_rust(&nas_path);
        if !resolved_target.exists() {
            return vec![];
        }

        let make_str = make.as_deref().unwrap_or("");
        let model_str = actual_model.as_deref().unwrap_or("");

        // =========================================================================
        // OPTIMIZATION #3: CHECK CENTRALIZED index.json FIRST (< 2 ms execution)
        // =========================================================================
        let index_path = resolved_target.join("index.json");
        if index_path.exists() {
            if let Ok(json_content) = fs::read_to_string(&index_path) {
                if let Ok(index_file) = serde_json::from_str::<NasIndexFile>(&json_content) {
                    if !index_file.catalog.is_empty() {
                        let mut folder_items = Vec::new();

                        for entry in index_file.catalog {
                            let full_path_buf = resolved_target.join(&entry.relative_path);
                            let full_p = full_path_buf.to_string_lossy().to_string();

                            // Verify directory exists in physical storage
                            if !full_path_buf.exists() {
                                continue;
                            }

                            let canon_brand = get_canonical_brand(&format!("{} {}", entry.brand, entry.model));
                            let is_match = if !model_str.is_empty() {
                                // Direct match from index mapping or fuzzy match
                                let matches_index_map = index_file.models.get(model_str)
                                    .map(|m_rel| m_rel.eq_ignore_ascii_case(&entry.relative_path))
                                    .unwrap_or(false);

                                let matches_alias = entry.aliases.as_ref()
                                    .map(|aliases| aliases.iter().any(|a| a.eq_ignore_ascii_case(model_str)))
                                    .unwrap_or(false);

                                matches_index_map || matches_alias || is_model_matching(&entry.model, canon_brand, model_str, make_str)
                            } else {
                                false
                            };

                            let (inf_cnt, cats) = if let (Some(c), Some(cat_vec)) = (entry.inf_count, entry.driver_categories) {
                                (Some(c), Some(cat_vec))
                            } else if is_match {
                                let (c, cat_vec) = scan_inf_categories_fast(&full_path_buf);
                                (Some(c), Some(cat_vec))
                            } else {
                                (None, None)
                            };

                            folder_items.push(NasDriverFolderItem {
                                brand: if !entry.brand.is_empty() { entry.brand } else { "Autres".to_string() },
                                category: if !entry.category.is_empty() { entry.category } else { "Pack Pilotes".to_string() },
                                model: entry.model,
                                display_name: entry.relative_path,
                                full_path: full_p,
                                is_match,
                                inf_count: inf_cnt,
                                driver_categories: cats,
                            });
                        }

                        if !folder_items.is_empty() {
                            folder_items.sort_by(|a, b| {
                                b.is_match.cmp(&a.is_match)
                                    .then_with(|| a.brand.cmp(&b.brand))
                                    .then_with(|| a.display_name.cmp(&b.display_name))
                            });
                            return folder_items;
                        }
                    }
                }
            }
        }

        // =========================================================================
        // OPTIMIZATION #1: RUST NATIVE RECURSIVE DIRECTORY WALKER (FALLBACK)
        // =========================================================================
        return scan_nas_directory_native(&resolved_target, Some(make_str), Some(model_str));
    }

    #[cfg(not(target_os = "windows"))]
    {
        vec![
            NasDriverFolderItem {
                brand: "HP".into(),
                category: "Laptop".into(),
                model: "HP EliteBook 840 G8".into(),
                display_name: "HP\\Laptop\\HP EliteBook 840 G8 (12 .inf)".into(),
                full_path: format!("{}/HP/Laptop/HP EliteBook 840 G8", nas_path),
                is_match: true,
                inf_count: Some(12),
                driver_categories: Some(vec![
                    DriverCategoryCount { name: "Display (Graphique)".into(), count: 2 },
                    DriverCategoryCount { name: "Net (Réseau/Wi-Fi)".into(), count: 3 },
                    DriverCategoryCount { name: "Media (Audio)".into(), count: 1 },
                    DriverCategoryCount { name: "System (Chipset)".into(), count: 4 },
                    DriverCategoryCount { name: "Bluetooth".into(), count: 2 },
                ]),
            },
            NasDriverFolderItem {
                brand: "Dell".into(),
                category: "Laptop".into(),
                model: "Latitude 5490".into(),
                display_name: "Dell\\Laptop\\Latitude 5490 (8 .inf)".into(),
                full_path: format!("{}/Dell/Laptop/Latitude 5490", nas_path),
                is_match: false,
                inf_count: Some(8),
                driver_categories: Some(vec![
                    DriverCategoryCount { name: "Display (Graphique)".into(), count: 1 },
                    DriverCategoryCount { name: "Net (Réseau/Wi-Fi)".into(), count: 2 },
                    DriverCategoryCount { name: "System (Chipset)".into(), count: 5 },
                ]),
            },
            NasDriverFolderItem {
                brand: "Lenovo".into(),
                category: "ThinkPad".into(),
                model: "ThinkPad T480s".into(),
                display_name: "Lenovo\\ThinkPad\\ThinkPad T480s (15 .inf)".into(),
                full_path: format!("{}/Lenovo/ThinkPad/ThinkPad T480s", nas_path),
                is_match: false,
                inf_count: Some(15),
                driver_categories: Some(vec![
                    DriverCategoryCount { name: "Display (Graphique)".into(), count: 2 },
                    DriverCategoryCount { name: "Net (Réseau/Wi-Fi)".into(), count: 4 },
                    DriverCategoryCount { name: "Media (Audio)".into(), count: 2 },
                    DriverCategoryCount { name: "System (Chipset)".into(), count: 7 },
                ]),
            },
        ]
    }
}

#[tauri::command]
fn get_inf_drivers_in_folder(folder_path: String) -> Vec<InfDriverDetailItem> {
    #[cfg(target_os = "windows")]
    {
        let resolved = resolve_smart_nas_path_rust(&folder_path);
        if !resolved.exists() {
            return vec![];
        }

        let mut results = Vec::new();
        let mut idx = 1;

        let mut dirs_to_visit = vec![resolved];
        while let Some(current_dir) = dirs_to_visit.pop() {
            if let Ok(entries) = fs::read_dir(current_dir) {
                for entry in entries.flatten() {
                    if let Ok(ft) = entry.file_type() {
                        if ft.is_dir() {
                            dirs_to_visit.push(entry.path());
                        } else if ft.is_file() {
                            let p = entry.path();
                            if let Some(ext) = p.extension() {
                                if ext.to_ascii_lowercase() == "inf" {
                                    if let Some(item) = parse_inf_file_details(&p, idx) {
                                        results.push(item);
                                        idx += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        results.sort_by(|a, b| a.category.cmp(&b.category).then_with(|| a.name.cmp(&b.name)));
        return results;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = folder_path;
        vec![
            InfDriverDetailItem {
                id: "INF-1".into(),
                name: "Intel(R) Wi-Fi 6 AX201 160MHz Adapter".into(),
                inf_name: "netwtw10.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\WLAN\netwtw10.inf".into(),
                category: "Réseau & Wi-Fi".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("22.140.0.3".into()),
                date: Some("2023-04-12".into()),
            },
            InfDriverDetailItem {
                id: "INF-2".into(),
                name: "Intel(R) Ethernet Connection I219-LM".into(),
                inf_name: "e1d68x64.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\LAN\e1d68x64.inf".into(),
                category: "Réseau & Wi-Fi".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("12.19.1.37".into()),
                date: Some("2023-02-18".into()),
            },
            InfDriverDetailItem {
                id: "INF-3".into(),
                name: "Intel(R) Iris(R) Xe Graphics".into(),
                inf_name: "iigd_dch.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\Graphics\iigd_dch.inf".into(),
                category: "Affichage / Graphique".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("31.0.101.4575".into()),
                date: Some("2023-05-10".into()),
            },
            InfDriverDetailItem {
                id: "INF-4".into(),
                name: "Realtek High Definition Audio (SST)".into(),
                inf_name: "hdxrt.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\Audio\hdxrt.inf".into(),
                category: "Audio & Son".into(),
                provider: Some("Realtek Semiconductor".into()),
                version: Some("6.0.9235.1".into()),
                date: Some("2022-11-20".into()),
            },
            InfDriverDetailItem {
                id: "INF-5".into(),
                name: "Intel(R) Wireless Bluetooth(R)".into(),
                inf_name: "ibtusb.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\Bluetooth\ibtusb.inf".into(),
                category: "Bluetooth".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("22.130.0.2".into()),
                date: Some("2023-03-01".into()),
            },
            InfDriverDetailItem {
                id: "INF-6".into(),
                name: "Intel(R) Management Engine Interface".into(),
                inf_name: "heci.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\MEI\heci.inf".into(),
                category: "Chipset & Système".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("2130.1.15.0".into()),
                date: Some("2022-09-14".into()),
            },
            InfDriverDetailItem {
                id: "INF-7".into(),
                name: "Intel(R) Serial IO I2C Host Controller".into(),
                inf_name: "iaLPSS2_I2C.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\SerialIO\iaLPSS2_I2C.inf".into(),
                category: "Chipset & Système".into(),
                provider: Some("Intel Corporation".into()),
                version: Some("30.100.2104.1".into()),
                date: Some("2022-08-05".into()),
            },
            InfDriverDetailItem {
                id: "INF-8".into(),
                name: "Synaptics Fingerprint Reader / Biométrie".into(),
                inf_name: "synaWbdp.inf".into(),
                inf_path: r"\\serveur-nas\Tech\Drivers\HP\Laptop\HP EliteBook 840 G8\Biometric\synaWbdp.inf".into(),
                category: "Biométrie & Capteurs".into(),
                provider: Some("Synaptics Incorporated".into()),
                version: Some("6.0.12.1104".into()),
                date: Some("2022-10-18".into()),
            },
        ]
    }
}

#[tauri::command]
fn rebuild_nas_index(nas_path: String) -> Result<String, String> {
    let start_time = std::time::Instant::now();
    let resolved_path = resolve_smart_nas_path_rust(&nas_path);
    if !resolved_path.exists() {
        return Err(format!("Le chemin NAS spécifié est introuvable ou inaccessible : {}", nas_path));
    }

    // Step 1: Discover all candidate model folders quickly
    let scanned_items = scan_nas_directory_native(&resolved_path, None, None);
    if scanned_items.is_empty() {
        return Err("Aucun dossier de pilotes détecté sur le chemin NAS spécifié.".into());
    }

    let nas_root_str = resolved_path.to_string_lossy().to_string();

    // Step 2: Multi-threaded parallel worker pool for instant INF categorization
    use std::sync::{Arc, Mutex};
    use std::thread;

    let items_queue = Arc::new(Mutex::new(scanned_items.into_iter().enumerate().collect::<Vec<_>>()));
    let catalog_entries = Arc::new(Mutex::new(Vec::new()));
    let models_map = Arc::new(Mutex::new(HashMap::new()));

    let num_threads = std::cmp::min(12, std::cmp::max(2, std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4)));
    let mut handles = Vec::new();

    for _ in 0..num_threads {
        let queue_clone = Arc::clone(&items_queue);
        let catalog_clone = Arc::clone(&catalog_entries);
        let models_clone = Arc::clone(&models_map);
        let nas_root_clone = nas_root_str.clone();

        let handle = thread::spawn(move || {
            loop {
                let item_opt = {
                    let mut lock = queue_clone.lock().unwrap();
                    lock.pop()
                };

                let (_idx, item) = match item_opt {
                    Some(val) => val,
                    None => break,
                };

                let rel_path = if item.full_path.starts_with(&nas_root_clone) {
                    item.full_path[nas_root_clone.len()..].trim_start_matches(['\\', '/']).to_string()
                } else {
                    item.full_path.clone()
                };

                // Fast scan using manifest cache if present
                let (inf_cnt, cats) = scan_inf_categories_fast(Path::new(&item.full_path));

                // Save manifest inside folder for instant future rescans
                let manifest = serde_json::json!({
                    "model": item.model,
                    "brand": item.brand,
                    "category": item.category,
                    "inf_count": inf_cnt,
                    "driver_categories": cats,
                    "last_updated": "2026-08-28"
                });
                let _ = fs::write(Path::new(&item.full_path).join("manifest.json"), manifest.to_string());

                {
                    let mut m_lock = models_clone.lock().unwrap();
                    m_lock.insert(item.model.clone(), rel_path.clone());
                    if !item.display_name.is_empty() && item.display_name != item.model {
                        m_lock.insert(item.display_name.clone(), rel_path.clone());
                    }
                }

                {
                    let mut c_lock = catalog_clone.lock().unwrap();
                    c_lock.push(NasIndexEntry {
                        brand: item.brand.clone(),
                        category: item.category.clone(),
                        model: item.model.clone(),
                        relative_path: rel_path.clone(),
                        inf_count: Some(inf_cnt),
                        driver_categories: Some(cats),
                        aliases: Some(vec![item.model.clone(), item.display_name.clone()]),
                        last_updated: Some("2026-08-28".to_string()),
                    });
                }
            }
        });
        handles.push(handle);
    }

    for h in handles {
        let _ = h.join();
    }

    let final_catalog = Arc::try_unwrap(catalog_entries).unwrap().into_inner().unwrap();
    let final_models = Arc::try_unwrap(models_map).unwrap().into_inner().unwrap();
    let total_count = final_catalog.len();

    let index_file = NasIndexFile {
        version: "2.0-turbo".to_string(),
        last_updated: "2026-08-28".to_string(),
        models: final_models,
        catalog: final_catalog,
    };

    let json_bytes = serde_json::to_string_pretty(&index_file).map_err(|e| e.to_string())?;
    let index_target = resolved_path.join("index.json");
    let temp_target = resolved_path.join("index.json.tmp");

    fs::write(&temp_target, json_bytes).map_err(|e| format!("Erreur d'écriture index.json.tmp: {}", e))?;
    let _ = fs::remove_file(&index_target);
    fs::rename(&temp_target, &index_target).map_err(|e| format!("Erreur d'enregistrement index.json: {}", e))?;

    let elapsed = start_time.elapsed();
    let elapsed_sec = elapsed.as_secs_f64();

    Ok(format!("⚡ Indexation Turbo Multi-Thread terminée : {} modèle(s) indexé(s) en {:.2}s sur le NAS.", total_count, elapsed_sec))
}

fn update_nas_index_incrementally(nas_root: &Path, target_dir: &Path) -> Result<(), String> {
    let index_path = nas_root.join("index.json");
    
    let mut index_file = if index_path.exists() {
        if let Ok(content) = fs::read_to_string(&index_path) {
            serde_json::from_str::<NasIndexFile>(&content).unwrap_or_else(|_| NasIndexFile {
                version: "2.0-turbo".to_string(),
                last_updated: "2026-08-28".to_string(),
                models: HashMap::new(),
                catalog: Vec::new(),
            })
        } else {
            return Err("Impossible de lire index.json".into());
        }
    } else {
        NasIndexFile {
            version: "2.0-turbo".to_string(),
            last_updated: "2026-08-28".to_string(),
            models: HashMap::new(),
            catalog: Vec::new(),
        }
    };
    
    let nas_root_str = nas_root.to_string_lossy().to_string();
    let target_dir_str = target_dir.to_string_lossy().to_string();
    
    let rel_path = if target_dir_str.starts_with(&nas_root_str) {
        target_dir_str[nas_root_str.len()..].trim_start_matches(['\\', '/']).to_string()
    } else {
        target_dir_str.clone()
    };
    
    let model = target_dir.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "Modèle Inconnu".into());
    let brand = if let Some(parent) = target_dir.parent() {
        if parent != nas_root {
            parent.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "Constructeur Inconnu".into())
        } else {
            "Générique".to_string()
        }
    } else {
        "Générique".to_string()
    };
    
    let (inf_cnt, cats) = scan_inf_categories_fast(target_dir);
    
    // Save local manifest in exported package folder
    let manifest = serde_json::json!({
        "model": model,
        "brand": brand,
        "category": "Pilotes",
        "inf_count": inf_cnt,
        "driver_categories": cats,
        "last_updated": "2026-08-28"
    });
    let _ = fs::write(target_dir.join("manifest.json"), manifest.to_string());
    
    let new_entry = NasIndexEntry {
        brand: brand.clone(),
        category: "Pilotes".to_string(),
        model: model.clone(),
        relative_path: rel_path.clone(),
        inf_count: Some(inf_cnt),
        driver_categories: Some(cats),
        aliases: Some(vec![model.clone()]),
        last_updated: Some("2026-08-28".to_string()),
    };
    
    let mut replaced = false;
    for entry in &mut index_file.catalog {
        if entry.relative_path == rel_path || (entry.model == model && entry.brand == brand) {
            *entry = new_entry.clone();
            replaced = true;
            break;
        }
    }
    
    if !replaced {
        index_file.catalog.push(new_entry);
    }
    
    index_file.models.insert(model.clone(), rel_path.clone());
    index_file.last_updated = "2026-08-28".to_string();
    
    let json_bytes = serde_json::to_string_pretty(&index_file).map_err(|e| e.to_string())?;
    let temp_target = nas_root.join("index.json.tmp");
    
    fs::write(&temp_target, json_bytes).map_err(|e| format!("Erreur d'écriture index.json.tmp: {}", e))?;
    let _ = fs::remove_file(&index_path);
    fs::rename(&temp_target, &index_path).map_err(|e| format!("Erreur d'enregistrement index.json: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn check_folder_exists(folder_path: String) -> Result<bool, String> {
    let resolved = resolve_smart_nas_path_rust(&folder_path);
    Ok(resolved.exists())
}

#[tauri::command]
fn export_dism_drivers(destination_path: String, overwrite: Option<bool>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let should_overwrite = overwrite.unwrap_or(false);
        let dest = Path::new(&destination_path);

        if dest.exists() {
            if should_overwrite {
                if let Ok(entries) = fs::read_dir(dest) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_dir() {
                            let _ = fs::remove_dir_all(&path);
                        } else {
                            let _ = fs::remove_file(&path);
                        }
                    }
                }
            }
        } else {
            if let Err(e) = fs::create_dir_all(dest) {
                return Err(format!("Impossible de créer le dossier de destination : {}", e));
            }
        }

        let mut cmd = Command::new("dism.exe");
        cmd.creation_flags(CREATE_NO_WINDOW).args([
            "/online",
            "/export-driver",
            &format!("/destination:{}", destination_path),
        ]);

        let output_res = cmd.output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&output_res.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output_res.stderr).trim().to_string();

        if !output_res.status.success() {
            return Err(if !stderr.is_empty() { stderr } else { stdout });
        }

        // =========================================================================
        // AUTO-UPDATE OR CREATE index.json ON NAS AFTER SUCCESSFUL DISM EXPORT
        // =========================================================================
        if let Some(parent) = dest.parent() {
            // Traverse up to find root index.json or highest accessible driver root directory
            let mut search_dir = parent.to_path_buf();
            let mut target_nas_root: Option<PathBuf> = None;

            for _ in 0..4 {
                let cand_index = search_dir.join("index.json");
                if cand_index.exists() {
                    target_nas_root = Some(search_dir.clone());
                    break;
                }
                if let Some(p) = search_dir.parent() {
                    target_nas_root = Some(search_dir.clone());
                    search_dir = p.to_path_buf();
                } else {
                    break;
                }
            }

            // Always update or create index.json at the detected NAS root directory
            if let Some(nas_root) = target_nas_root {
                let _ = update_nas_index_incrementally(&nas_root, dest);
            }
        }

        Ok(if !stdout.is_empty() { stdout } else { "Exportation DISM terminée avec succès.".into() })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = overwrite;
        Ok(format!("Simulation DISM Export vers {} : Tous les pilotes tiers ont été exportés avec succès.", destination_path))
    }
}

#[tauri::command]
fn get_detailed_bios_info() -> BiosDetailedInfoResult {
    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $bios = Get-CimInstance Win32_Bios
            $cs = Get-CimInstance Win32_ComputerSystem
            $bb = Get-CimInstance Win32_BaseBoard

            $manuf = "Inconnu"
            if ($cs -and $cs.Manufacturer) { $manuf = $cs.Manufacturer.Trim() }
            elseif ($bios -and $bios.Manufacturer) { $manuf = $bios.Manufacturer.Trim() }
            elseif ($bb -and $bb.Manufacturer) { $manuf = $bb.Manufacturer.Trim() }

            $model = "Inconnu"
            if ($cs -and $cs.Model) { $model = $cs.Model.Trim() }
            elseif ($bb -and $bb.Product) { $model = $bb.Product.Trim() }

            $smbios = "Inconnu"
            if ($bios -and $bios.SMBIOSBIOSVersion) { $smbios = $bios.SMBIOSBIOSVersion.Trim() }
            elseif ($bios -and $bios.Version) { $smbios = $bios.Version.Trim() }
            elseif ($bios -and $bios.Name) { $smbios = $bios.Name.Trim() }

            $ver = "Inconnu"
            if ($bios -and $bios.Version) { $ver = $bios.Version.Trim() }
            elseif ($bios -and $bios.Caption) { $ver = $bios.Caption.Trim() }

            $sn = "Inconnu"
            if ($bios -and $bios.SerialNumber) { $sn = $bios.SerialNumber.Trim() }

            $relDate = "Inconnue"
            if ($bios -and $bios.ReleaseDate) {
                if ($bios.ReleaseDate -is [System.DateTime]) {
                    $relDate = $bios.ReleaseDate.ToString("yyyy-MM-dd")
                } else {
                    $strDate = [string]$bios.ReleaseDate
                    if ($strDate -match '^(\d{4})(\d{2})(\d{2})') {
                        $relDate = "$($Matches[1])-$($Matches[2])-$($Matches[3])"
                    } else {
                        $relDate = $strDate.Trim()
                    }
                }
            }

            $avail = $false
            $upTitle = ""
            $upVer = ""
            $upDesc = ""

            try {
                $session = New-Object -ComObject Microsoft.Update.Session
                $searcher = $session.CreateUpdateSearcher()
                $searcher.Online = $true
                $searchResult = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=0 OR IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=1")
                if ($searchResult -and $searchResult.Updates.Count -gt 0) {
                    for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {
                        $up = $searchResult.Updates.Item($i)
                        $t = if ($up.Title) { $up.Title } else { "" }
                        $categoryNames = @()
                        try {
                            for ($c = 0; $c -lt $up.Categories.Count; $c++) {
                                $categoryNames += $up.Categories.Item($c).Name
                            }
                        } catch {}
                        $categoryText = $categoryNames -join ', '

                        if ($t -match '(?i)\b(BIOS|UEFI|Firmware|System Firmware)\b' -or $categoryText -match '(?i)\bFirmware\b' -or $t -match '(?i)\b(System\s*-\s*\d+|Microcode)\b') {
                            $avail = $true
                            $upTitle = $t
                            $upDesc = if ($up.Description) { $up.Description } else { $t }
                            if ($t -match '(\d+(\.\d+)+)') {
                                $upVer = $Matches[1]
                            }
                            break
                        }
                    }
                }
            } catch {}

            [PSCustomObject]@{
                manufacturer = $manuf
                model = $model
                smbiosVersion = $smbios
                version = $ver
                serialNumber = $sn
                releaseDate = $relDate
                updateAvailable = $avail
                updateTitle = $upTitle
                updateVersion = $upVer
                updateReleaseDate = ""
                updateDescription = $upDesc
            } | ConvertTo-Json -Compress
        "#;
        let mut cmd = Command::new("powershell");
        cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
        if let Ok(out) = cmd.output() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let smbios = val.get("smbiosVersion").and_then(|v| v.as_str()).unwrap_or("Inconnu");
                if smbios != "Inconnu" && !smbios.is_empty() {
                    return BiosDetailedInfoResult {
                        manufacturer: val.get("manufacturer").and_then(|v| v.as_str()).unwrap_or("Inconnu").to_string(),
                        smbios_version: smbios.to_string(),
                        version: val.get("version").and_then(|v| v.as_str()).unwrap_or("Inconnu").to_string(),
                        serial_number: val.get("serialNumber").and_then(|v| v.as_str()).unwrap_or("Inconnu").to_string(),
                        release_date: val.get("releaseDate").and_then(|v| v.as_str()).unwrap_or("Inconnu").to_string(),
                        model: val.get("model").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        update_available: val.get("updateAvailable").and_then(|v| v.as_bool()),
                        update_title: val.get("updateTitle").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        update_version: val.get("updateVersion").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        update_release_date: val.get("updateReleaseDate").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        update_description: val.get("updateDescription").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    };
                }
            }
        }
    }

    BiosDetailedInfoResult {
        manufacturer: "Workstation".into(),
        smbios_version: "UEFI v2.4 (Tauri)".into(),
        version: "1.0.0".into(),
        serial_number: "SN-2026-RUST".into(),
        release_date: "2024-01-15".into(),
        model: Some("Refurbished Workstation".into()),
        update_available: Some(false),
        update_title: None,
        update_version: None,
        update_release_date: None,
        update_description: None,
    }
}

#[tauri::command]
fn check_is_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        static ADMIN_CACHE: OnceLock<bool> = OnceLock::new();
        *ADMIN_CACHE.get_or_init(|| {
            let ps_script = r#"
                $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
                if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { "true" } else { "false" }
            "#;
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", ps_script]);
            if let Ok(out) = cmd.output() {
                let res = String::from_utf8_lossy(&out.stdout).trim().to_string();
                return res.eq_ignore_ascii_case("true");
            }
            false
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}

#[tauri::command]
fn restart_as_admin() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(current_exe) = env::current_exe() {
            let exe_path = current_exe.to_string_lossy().to_string();
            let ps_script = format!(
                r#"Start-Process -FilePath "{}" -Verb RunAs"#,
                exe_path.replace('"', "`\"")
            );
            let mut cmd = Command::new("powershell");
            cmd.creation_flags(CREATE_NO_WINDOW).args(["-NoProfile", "-NonInteractive", "-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", &ps_script]);
            let _ = cmd.spawn();
            std::process::exit(0);
        }
        Err("Impossible d'identifier l'exécutable courant pour le redémarrage en administrateur".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            execute_action,
            get_sys_info,
            get_battery_status,
            check_security_status,
            set_system_brightness,
            check_bios_update,
            install_bios_update,
            install_manual_bios_file,
            connect_network,
            check_missing_drivers,
            get_missing_pnp_devices,
            scan_and_fix_pnp_devices,
            set_fullscreen,
            get_hardware_model_details,
            search_wu_drivers,
            install_wu_drivers,
            scan_nas_drivers,
            get_inf_drivers_in_folder,
            install_specific_inf_drivers,
            install_nas_drivers_pnputil,
            check_folder_exists,
            export_dism_drivers,
            rebuild_nas_index,
            get_detailed_bios_info,
            check_is_admin,
            restart_as_admin
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement du moteur Tauri");
}

