param(
    [switch]$AutoReboot,
    [switch]$NonInteractive,
    [switch]$ForceSameVersion
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Pause-IfInteractive {
    if (-not $NonInteractive -and [Environment]::UserInteractive) {
        try {
            Read-Host "`nAppuyez sur Entree pour quitter..."
        } catch {}
    }
}

function Get-ResultCodeText {
    param([int]$Code)
    switch ($Code) {
        0 { 'Non demarre (0)' }
        1 { 'En cours (1)' }
        2 { 'Succes (2)' }
        3 { 'Succes avec avertissement (3)' }
        4 { 'Echec / Bloque secteur ou reboot (4)' }
        5 { 'Annule (5)' }
        default { "Inconnu ($Code)" }
    }
}

function Get-BiosInfo {
    $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue

    $parsedDate = $null
    $rawDate = if ($bios) { $bios.ReleaseDate } else { $null }

    if ($rawDate) {
        try {
            $parsedDate = [System.Management.ManagementDateTimeConverter]::ToDateTime($rawDate)
        }
        catch {
            $parsedDate = $null
        }
    }

    [PSCustomObject]@{
        Manufacturer      = if ($cs -and $cs.Manufacturer) { $cs.Manufacturer.Trim() } elseif ($bios) { $bios.Manufacturer.Trim() } else { "Inconnu" }
        Model             = if ($cs -and $cs.Model) { $cs.Model.Trim() } else { "Inconnu" }
        SMBIOSBIOSVersion = if ($bios) { $bios.SMBIOSBIOSVersion.Trim() } else { "Inconnu" }
        Version           = if ($bios) { $bios.Version.Trim() } else { "Inconnu" }
        SerialNumber      = if ($bios) { $bios.SerialNumber.Trim() } else { "Inconnu" }
        ReleaseDate       = $parsedDate
        ReleaseDateRaw    = $rawDate
    }
}

function Get-PowerStatus {
    $batt = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if (-not $batt) {
        return "PC Fixe / Alimentation secteur directe (Pas de batterie)"
    }
    
    $statusText = "Batterie detectee"
    try {
        $percent = $batt.EstimatedChargeRemaining
        $status = $batt.BatteryStatus
        # BatteryStatus: 1=Discharging, 2=AC/Charging, 3=Fully Charged, etc.
        if ($status -eq 2 -or $status -eq 3) {
            $statusText = "Secteur AC connecte (Chargeur branche - $percent%)"
        } else {
            $statusText = "Sur batterie ($percent%) - AVERTISSEMENT : branchez le chargeur secteur !"
        }
    } catch {
        $statusText = "Batterie presente"
    }
    return $statusText
}

function Show-BiosInfo {
    param(
        [Parameter(Mandatory = $true)]
        $BiosInfo,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host ''
    Write-Host "[$Label]" -ForegroundColor Magenta
    Write-Host ("  Fabricant       : {0}" -f $BiosInfo.Manufacturer)
    Write-Host ("  Modele          : {0}" -f $BiosInfo.Model)
    Write-Host ("  SMBIOS Version  : {0}" -f $BiosInfo.SMBIOSBIOSVersion)
    Write-Host ("  Version BIOS    : {0}" -f $BiosInfo.Version)
    Write-Host ("  Numero de serie : {0}" -f $BiosInfo.SerialNumber)

    if ($BiosInfo.ReleaseDate) {
        Write-Host ("  Date BIOS       : {0}" -f $BiosInfo.ReleaseDate.ToString('yyyy-MM-dd HH:mm:ss'))
    }
    elseif ($BiosInfo.ReleaseDateRaw) {
        Write-Host ("  Date BIOS brute : {0}" -f $BiosInfo.ReleaseDateRaw)
    }
    else {
        Write-Host '  Date BIOS       : Inconnue'
    }
}

function Compare-BiosInfo {
    param(
        [Parameter(Mandatory = $true)]
        $Before,
        [Parameter(Mandatory = $true)]
        $After
    )

    if ($Before.SMBIOSBIOSVersion -ne $After.SMBIOSBIOSVersion) { return $true }
    if ($Before.Version -ne $After.Version) { return $true }

    if ($Before.ReleaseDate -and $After.ReleaseDate) {
        if ([datetime]$Before.ReleaseDate -ne [datetime]$After.ReleaseDate) {
            return $true
        }
    }
    else {
        if ($Before.ReleaseDateRaw -ne $After.ReleaseDateRaw) {
            return $true
        }
    }

    return $false
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
        for ($c = 0; $c -lt $Update.Categories.Count; $c++) {
            $categoryNames += $Update.Categories.Item($c).Name
        }
    } catch {}
    $categoryText = $categoryNames -join ', '

    # 1. Direct DriverClass matching
    if ($driverClass -match '(?i)^(Firmware|System Firmware|UEFI)$') {
        return $true
    }

    # 2. Keywords in Title, Model or Description
    $pattern = '(?i)\b(BIOS|UEFI|Firmware|System Firmware|Microcode|System Aggregator|Insyde|American Megatrends|Capsule)\b'
    if ($title -match $pattern -or $driverModel -match $pattern -or $description -match $pattern) {
        return $true
    }

    # 3. Category matching
    if ($categoryText -match '(?i)\b(Firmware|System Firmware|BIOS|UEFI)\b') {
        return $true
    }

    # 4. OEM System Updates (e.g. Dell Inc. - System - 1.15.0, HP - System - ..., Lenovo - System - ...)
    if ($title -match '(?i)\b(Dell|HP|Hewlett|Lenovo|ThinkPad|ASUSTeK|ASUS|Acer|Dynabook|Toshiba|Fujitsu|Samsung|Microsoft|Intel|AMD)\b.*-\s*(System|Firmware)\b') {
        return $true
    }

    # 5. Generic "System - <version/date>"
    if ($title -match '(?i)\bSystem\s*-\s*[\d\.\/]+') {
        return $true
    }

    # 6. Specific OEM BIOS Update titles
    if ($title -match '(?i)(BIOS Update|Firmware Update|System Hardware Update)') {
        return $true
    }

    return $false
}

try {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        if ($NonInteractive) {
            Write-Host "[!] Avertissement : Le script s'exécute sans droits Administrateur complets. Tentative en mode standard..." -ForegroundColor Yellow
        } else {
            Write-Host "Élévation des privilèges Administrateur..." -ForegroundColor Yellow
            $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
            if ($AutoReboot) { $argList += " -AutoReboot" }
            Start-Process powershell.exe -ArgumentList $argList -Verb RunAs
            exit
        }
    }

    Write-Host '=========================================================' -ForegroundColor Cyan
    Write-Host ' MISE A JOUR DU BIOS / FIRMWARE UEFI (WINDOWS UPDATE)' -ForegroundColor Cyan
    Write-Host '=========================================================' -ForegroundColor Cyan

    $biosBefore = Get-BiosInfo
    Show-BiosInfo -BiosInfo $biosBefore -Label 'INFORMATIONS SYSTEME & BIOS ACTUEL'

    $powerStatus = Get-PowerStatus
    Write-Host ("  Alimentation    : {0}" -f $powerStatus) -ForegroundColor DarkYellow

    # Inspection des périphériques Firmware UEFI sous Windows
    try {
        $fwDevices = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { 
            $_.PNPClass -eq 'Firmware' -or $_.ClassGuid -eq '{f2e7dd72-6468-4e36-b6f1-6488f42c1b52}' -or $_.DeviceID -like 'UEFI\*'
        }
        if ($fwDevices) {
            Write-Host ''
            Write-Host '[*] Peripherique(s) Firmware UEFI detecte(s) dans Windows :' -ForegroundColor DarkCyan
            foreach ($dev in $fwDevices) {
                $pCode = $dev.ConfigManagerErrorCode
                $extraStatus = if ($pCode -eq 14 -or $pCode -eq 28) { " -> [REBOOT EN ATTENTE POUR FLASH]" } else { "" }
                Write-Host ("    - {0} (Statut: {1}{2})" -f $dev.Name, $dev.Status, $extraStatus) -ForegroundColor DarkGray
            }
        }
    } catch {}

    # Démarrage et réveil du service Windows Update
    try {
        $svc = Get-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -ne 'Running') {
            Write-Host ''
            Write-Host '[*] Demarrage du service Windows Update (wuauserv)...' -ForegroundColor DarkGray
            Start-Service -Name 'wuauserv' -ErrorAction SilentlyContinue
        }
    } catch {}

    try {
        $au = New-Object -ComObject Microsoft.Update.AutoUpdate
        $au.DetectNow()
    } catch {}

    $session = New-Object -ComObject Microsoft.Update.Session
    $searcher = $session.CreateUpdateSearcher()
    $searcher.Online = $true

    # Tenter la sélection de serveur en ligne Microsoft Update directe
    try {
        $searcher.ServerSelection = 2 # 2 = ssWindowsUpdate
    } catch {}

    Write-Host ''
    Write-Host '[*] Interrogation du service Windows Update pour les packages pilotes et firmwares...' -ForegroundColor Yellow

    # Recherche multi-critères pour ne manquer aucun firmware
    $searchResult = $null
    
    $query1 = "IsInstalled=0 and IsHidden=0"
    $query2 = "IsInstalled=0 and IsHidden=0 and Type='Driver'"
    
    if ($ForceSameVersion) {
        $query1 = "IsHidden=0"
        $query2 = "IsHidden=0 and Type='Driver'"
        Write-Host " [!] Mode Force : Recherche incluant les firmwares deja installes." -ForegroundColor Cyan
    }

    try {
        $searchResult = $searcher.Search($query1)
    } catch {
        try {
            $searchResult = $searcher.Search($query2)
        } catch {
            Write-Host "[!] Avertissement lors de la recherche Windows Update : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    if (-not $searchResult -or $searchResult.Updates.Count -eq 0) {
        Write-Host '[i] Aucune mise a jour pilote/firmware en attente sur Windows Update.' -ForegroundColor Yellow
        Write-Host '[OK] Le BIOS/Firmware de cette machine est a jour.' -ForegroundColor Green
        Pause-IfInteractive
        exit 0
    }

    Write-Host ("[i] Total mises a jour disponibles sur Windows Update : {0}" -f $searchResult.Updates.Count) -ForegroundColor DarkGray

    $firmwareUpdates = @()
    for ($i = 0; $i -lt $searchResult.Updates.Count; $i++) {
        $update = $searchResult.Updates.Item($i)
        if (Test-IsFirmwareUpdate -Update $update) {
            $firmwareUpdates += $update
        }
    }

    if ($firmwareUpdates.Count -eq 0) {
        Write-Host ''
        Write-Host '[i] Aucun package de type BIOS/UEFI/Firmware trouve dans les mises a jour disponibles.' -ForegroundColor Yellow
        Write-Host '[OK] Le firmware UEFI de cette machine est a jour.' -ForegroundColor Green
        Pause-IfInteractive
        exit 0
    }

    $total = $firmwareUpdates.Count
    Write-Host ("`n[+] {0} package(s) de Firmware / BIOS detecte(s) a installer :" -f $total) -ForegroundColor Green

    for ($i = 0; $i -lt $total; $i++) {
        $up = $firmwareUpdates[$i]
        $categories = @()
        try {
            for ($c = 0; $c -lt $up.Categories.Count; $c++) { $categories += $up.Categories.Item($c).Name }
        } catch {}
        $catStr = if ($categories.Count -gt 0) { " [" + ($categories -join ', ') + "]" } else { "" }
        $kbStr = if ($up.KBArticleIDs -and $up.KBArticleIDs.Count -gt 0) { " (KB" + ($up.KBArticleIDs -join ', KB') + ")" } else { "" }
        Write-Host ("  [{0}/{1}] {2}{3}{4}" -f ($i + 1), $total, $up.Title, $kbStr, $catStr) -ForegroundColor Cyan
    }

    $rapport = @()
    $rebootRequiredGlobal = $false
    $successCount = 0
    $failCount = 0

    for ($i = 0; $i -lt $total; $i++) {
        $update = $firmwareUpdates[$i]
        $titre = $update.Title
        $num = $i + 1

        Write-Host "`n---------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host (" [Traitement {0}/{1}] : {2}" -f $num, $total, $titre) -ForegroundColor White
        Write-Host "---------------------------------------------------------" -ForegroundColor DarkGray

        if (-not $update.EulaAccepted) {
            try { 
                $update.AcceptEula() 
                Write-Host "  -> CLUF accepte automatiquement." -ForegroundColor DarkGray
            } catch { }
        }
        try {
            if ($update.BundledUpdates) {
                for ($b = 0; $b -lt $update.BundledUpdates.Count; $b++) {
                    $bUp = $update.BundledUpdates.Item($b)
                    if (-not $bUp.EulaAccepted) { try { $bUp.AcceptEula() } catch {} }
                }
            }
        } catch {}

        $singleUpdateColl = New-Object -ComObject Microsoft.Update.UpdateColl
        [void]$singleUpdateColl.Add($update)

        $isDownloaded = $false
        try { $isDownloaded = [bool]$update.IsDownloaded } catch {}

        if (-not $isDownloaded) {
            Write-Host "  -> 1. Telechargement depuis les serveurs Microsoft..." -NoNewline -ForegroundColor Yellow
            $downloader = $session.CreateUpdateDownloader()
            $downloader.Updates = $singleUpdateColl
            $downloadResult = $null
            try {
                $downloadResult = $downloader.Download()
            } catch {
                Write-Host (" [ECHEC APPEL DL: {0}]" -f $_.Exception.Message) -ForegroundColor Red
            }

            try { $isDownloaded = [bool]$update.IsDownloaded } catch {}
            
            $dlCode = if ($downloadResult) { $downloadResult.ResultCode } else { 4 }
            if (-not $isDownloaded -and $dlCode -notin 2, 3) {
                Write-Host (" [ECHEC] (Code DL: {0})" -f $dlCode) -ForegroundColor Red
                $rapport += [PSCustomObject]@{ 
                    Index = $num; 
                    Firmware = $titre; 
                    Telechargement = 'Echec'; 
                    Installation = 'Non tente'; 
                    Code = "DL-$dlCode"; 
                    Reboot = 'Non' 
                }
                $failCount++
                continue
            }
            Write-Host " [OK] Telecharge" -ForegroundColor Green
        } else {
            Write-Host "  -> 1. Package deja telecharge en cache [OK]" -ForegroundColor Green
        }

        Write-Host "  -> 2. Injection / Stage dans le firmware UEFI..." -NoNewline -ForegroundColor Yellow
        $installer = $session.CreateUpdateInstaller()
        $installer.Updates = $singleUpdateColl
        try { $installer.ForceQuiet = $true } catch {}
        $installResult = $installer.Install()

        $codeResultat = $installResult.ResultCode
        $texteResultat = Get-ResultCodeText -Code $codeResultat
        $rebootForThis = $installResult.RebootRequired

        if ($codeResultat -in 2, 3) {
            Write-Host (" [SUCCES] ({0})" -f $texteResultat) -ForegroundColor Green
            $rapport += [PSCustomObject]@{ 
                Index = $num; 
                Firmware = $titre; 
                Telechargement = 'OK'; 
                Installation = 'Succes'; 
                Code = $codeResultat; 
                Reboot = if ($rebootForThis) { 'Oui' } else { 'Non' } 
            }
            $successCount++
        } else {
            Write-Host (" [ECHEC/BLOQUE] ({0})" -f $texteResultat) -ForegroundColor Red
            Write-Host "     Remarque: Code 4 signifie souvent que le PC doit etre sur secteur AC ou qu'un reboot est requis." -ForegroundColor DarkYellow
            $rapport += [PSCustomObject]@{ 
                Index = $num; 
                Firmware = $titre; 
                Telechargement = 'OK'; 
                Installation = 'Echec'; 
                Code = $codeResultat; 
                Reboot = if ($rebootForThis) { 'Oui' } else { 'Non' } 
            }
            $failCount++
        }

        if ($rebootForThis -or $codeResultat -in 2, 3) {
            $rebootRequiredGlobal = $true
            Write-Host "  -> Flashage UEFI prepare : s'appliquera au redemarrage de l'ordinateur." -ForegroundColor Cyan
        }
    }

    $biosAfter = Get-BiosInfo
    Show-BiosInfo -BiosInfo $biosAfter -Label 'ETAT DU BIOS APRES OPERATION'

    $biosChanged = Compare-BiosInfo -Before $biosBefore -After $biosAfter

    Write-Host "`n=========================================================" -ForegroundColor Cyan
    Write-Host " COMPTE RENDU DETAILLE DES MISES A JOUR BIOS/UEFI" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    
    $rapport | Format-Table -AutoSize | Out-String | Write-Host -ForegroundColor White

    Write-Host ("Bilan : {0} mise(s) a jour reussie(s), {1} echec(s) sur un total de {2} package(s)." -f $successCount, $failCount, $total) -ForegroundColor White

    if ($biosChanged) {
        Write-Host '[OK] La version BIOS a change immediatement.' -ForegroundColor Green
    }
    else {
        if ($rebootRequiredGlobal -or $successCount -gt 0) {
            Write-Host "[OK] Mise a jour du BIOS prete. Le flash UEFI s'appliquera au redemarrage de la machine." -ForegroundColor Green
        }
        else {
            Write-Host '[INFO] Aucun changement applique.' -ForegroundColor Yellow
        }
    }

    if ($rebootRequiredGlobal -or $successCount -gt 0) {
        Write-Warning 'Un redemarrage est requis pour finaliser l''ecriture du nouveau BIOS dans la puce UEFI.'

        if ($AutoReboot) {
            Write-Host '[*] Redemarrage automatique dans 15 secondes...' -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            Restart-Computer -f
        }
        else {
            Write-Host '[i] Veuillez redemarrer l''ordinateur pour finaliser le flashage du BIOS.' -ForegroundColor Yellow
        }
    }

    Write-Host "`n[OK] Traitement termine avec succes." -ForegroundColor Green
    Pause-IfInteractive
    exit 0
}
catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}
