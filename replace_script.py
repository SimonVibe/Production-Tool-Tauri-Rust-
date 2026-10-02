import re

with open('src-tauri/src/main.rs', 'r') as f:
    content = f.read()

# Define the pattern to replace
start_str = "#[tauri::command]\nfn check_security_status() -> SecurityStatusResult {\n    #[cfg(target_os = \"windows\")]\n    {"
end_str = "        }\n    }\n}"

# Find the block
start_idx = content.find(start_str)
if start_idx == -1:
    print("Start not found!")
    exit(1)
    
end_idx = content.find(end_str, start_idx)
if end_idx == -1:
    print("End not found!")
    exit(1)

new_content = content[:start_idx] + '''#[tauri::command]
fn check_security_status() -> SecurityStatusResult {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        
        let mut tpm_ok = false;
        let mut secure_boot = false;
        let mut is_uefi = false;
        let mut partition_style = "GPT".to_string();

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // --- 1. DETECTION SECURE BOOT ---
        if let Ok(key) = hklm.open_subkey("System\\\\CurrentControlSet\\\\Control\\\\SecureBoot\\\\State") {
            if let Ok(val) = key.get_value::<u32, _>("UEFISecureBootEnabled") {
                if val == 1 {
                    secure_boot = true;
                }
            }
        }

        // --- 2. DETECTION UEFI ---
        // On vérifie PEFirmwareType (1 = BIOS, 2 = UEFI)
        if let Ok(key) = hklm.open_subkey("SYSTEM\\\\CurrentControlSet\\\\Control") {
            if let Ok(val) = key.get_value::<u32, _>("PEFirmwareType") {
                if val == 2 {
                    is_uefi = true;
                }
            }
        }
        
        // Si Secure Boot est activé, on est forcément en UEFI
        if secure_boot {
            is_uefi = true;
        }

        // --- 3. DETECTION TPM ---
        // A. Vérification rapide par registre des services TBS / TPM
        if let Ok(key) = hklm.open_subkey("SYSTEM\\\\CurrentControlSet\\\\Services\\\\TPM") {
            if let Ok(start) = key.get_value::<u32, _>("Start") {
                if start != 4 { 
                    tpm_ok = true;
                }
            }
        }
        if !tpm_ok {
            if let Ok(key) = hklm.open_subkey("SYSTEM\\\\CurrentControlSet\\\\Services\\\\TBS") {
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
        
        // Fallback pour partition style
        if !is_uefi {
            partition_style = "MBR".to_string();
        }
        
        let boot_mode = if is_uefi { "UEFI" } else { "Legacy" }.to_string();

        SecurityStatusResult {
            tpm: tpm_ok,
            secure_boot,
            is_uefi: Some(is_uefi),
            boot_mode: Some(boot_mode),
            partition_style: Some(partition_style),
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
            error: None,
        }
    }
}''' + content[end_idx + len(end_str):]

with open('src-tauri/src/main.rs', 'w') as f:
    f.write(new_content)
    
print("Successfully replaced!")
