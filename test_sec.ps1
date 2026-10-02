$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$ErrorActionPreference = 'SilentlyContinue'
$tpmOk = $false
$sb = $false

# --- 1. DETECTION TPM 2.0 / 1.2 ---
try {
    $t = Get-Tpm -ErrorAction SilentlyContinue
    if ($t -and ($t.TpmPresent -or $t.TpmReady -or $t.TpmEnabled -or $t.TpmActivated -or $null -ne $t.ManufacturerId)) {
        $tpmOk = $true
    }
} catch {}

if (-not $tpmOk) {
    try {
        $ttool = & tpmtool.exe getdeviceinformation 2>$null
        if ($ttool -match 'TPM Present:\s*True|TPM Ready:\s*True|TPM Version:\s*2\.0|TPM Version:\s*1\.2') {
            $tpmOk = $true
        }
    } catch {}
}

if (-not $tpmOk) {
    try {
        $tpmWmi = Get-CimInstance -Namespace 'root/cimv2/Security/MicrosoftTpm' -ClassName Win32_Tpm -ErrorAction SilentlyContinue
        if ($tpmWmi -and ($tpmWmi.IsActivated_InitialValue -or $tpmWmi.IsEnabled_InitialValue -or $tpmWmi.SpecVersion -or $null -ne $tpmWmi.ManufacturerId)) {
            $tpmOk = $true
        }
    } catch {}
}

if (-not $tpmOk) {
    try {
        $secPnp = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object {
            $_.PNPClass -eq 'SecurityDevices' -or 
            $_.ClassGuid -eq '{d94ee5d8-d18d-4444-9981-1f1c3f6b18d0}' -or 
            $_.Service -eq 'TPM' -or 
            $_.DeviceID -match 'MSFT0101|PNP0C31|IFX0102|AMD0020|AMDIF030|INTC0102' -or 
            $_.Name -match 'TPM|Trusted Platform|Plateforme|AMD PSP|Pluton|Security Device'
        }
        if ($secPnp) { $tpmOk = $true }
    } catch {}
}

if (-not $tpmOk) {
    try {
        if (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Services\TPM') {
            $tpmSvc = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\TPM' -ErrorAction SilentlyContinue
            if ($tpmSvc -and $tpmSvc.Start -ne 4) { $tpmOk = $true }
        }
        if (-not $tpmOk -and (Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Services\TBS')) {
            $tbsSvc = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\TBS' -ErrorAction SilentlyContinue
            if ($tbsSvc -and $tbsSvc.Start -ne 4) { $tpmOk = $true }
        }
    } catch {}
}

# --- 2. DETECTION SECURE BOOT ---
try {
    $sbVal = (Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\SecureBoot\State' -Name 'UEFISecureBootEnabled' -ErrorAction SilentlyContinue).UEFISecureBootEnabled
    if ($sbVal -eq 1) { $sb = $true }
} catch {}

if (-not $sb) {
    try {
        $sbCmd = Confirm-SecureBootUEFI -ErrorAction Stop
        if ($sbCmd -eq $true) { $sb = $true }
    } catch {}
}

if (-not $sb) {
    try {
        $dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction SilentlyContinue
        if ($dg -and ($dg.SecurityServicesConfigured -contains 1 -or $dg.SecurityServicesRunning -contains 1)) {
            $sb = $true
        }
    } catch {}
}

# --- 3. DETECTION DU MODE DE DEMARRAGE HDD (UEFI vs Legacy) ---
$peFirmware = $null
try {
    $peFirmware = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control' -Name 'PEFirmwareType' -ErrorAction SilentlyContinue).PEFirmwareType
} catch {}

$envFw = $env:firmware_type

$partitionStyle = "GPT"
try {
    $bootDisk = Get-Disk | Where-Object { $_.IsSystem -eq $true -or $_.IsBoot -eq $true } -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $bootDisk) {
        $bootDisk = Get-Disk -Number 0 -ErrorAction SilentlyContinue
    }
    if ($bootDisk -and $bootDisk.PartitionStyle) {
        $partitionStyle = $bootDisk.PartitionStyle.ToString()
    }
} catch {}

$hasUefiSupport = $false
try {
    Confirm-SecureBootUEFI -ErrorAction Stop
    $hasUefiSupport = $true
} catch {
    if ($_.Exception.Message -notmatch 'not supported|non pris en charge') {
        $hasUefiSupport = $true
    }
}

$isUefi = $true
if ($peFirmware -eq 1 -or $envFw -eq 'Legacy' -or $partitionStyle -eq 'MBR') {
    if ($sb -eq $false -and -not $hasUefiSupport -and $peFirmware -ne 2) {
        $isUefi = $false
    }
}

if ($peFirmware -eq 2 -or $envFw -eq 'UEFI' -or $partitionStyle -eq 'GPT' -or $sb -eq $true -or $hasUefiSupport -or (Test-Path 'HKLM:\System\CurrentControlSet\Control\SecureBoot')) {
    $isUefi = $true
}

$bootMode = if ($isUefi) { "UEFI" } else { "Legacy" }

@{ tpm = $tpmOk; secureBoot = $sb; isUefi = $isUefi; bootMode = $bootMode; partitionStyle = $partitionStyle } | ConvertTo-Json -Compress
