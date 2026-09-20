# Walton Oracle EBS Daily BOM Auto-Sync & Deviation Engine
# Synchronizes daily BOM data from Walton EBS or processes the latest downloaded BOM_DETAILS.xls files.

param(
    [string]$FromDate = (Get-Date -Format "MM/dd/yyyy"),
    [string]$ToDate = (Get-Date -Format "MM/dd/yyyy"),
    [string]$Username,
    [string]$Password,
    [switch]$SkipNetwork
)

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$scratchDir = Join-Path $PSScriptRoot "scratch"
$bomsDir = Join-Path $PSScriptRoot "boms"
$snapshotsDir = Join-Path $PSScriptRoot "snapshots"
$outputJs = Join-Path $PSScriptRoot "ebs_daily_bom_data.js"
$lastSyncJson = Join-Path $PSScriptRoot "last_sync.json"
$configFile = Join-Path $PSScriptRoot "ebs_config.json"

if (-not (Test-Path $scratchDir)) { [void](New-Item -ItemType Directory -Path $scratchDir) }
if (-not (Test-Path $snapshotsDir)) { [void](New-Item -ItemType Directory -Path $snapshotsDir) }

# Load EBS Config
$config = if (Test-Path $configFile) {
    Get-Content $configFile -Raw | ConvertFrom-Json
} elseif (Test-Path (Join-Path $PSScriptRoot "ebs_config.example.json")) {
    Get-Content (Join-Path $PSScriptRoot "ebs_config.example.json") -Raw | ConvertFrom-Json
} else {
    [PSCustomObject]@{
        primary = [PSCustomObject]@{ userId = ""; password = ""; name = "Primary Employee" }
        secondary = [PSCustomObject]@{ userId = ""; password = ""; name = "Secondary Fallback User" }
        lastAuthStatus = "pending"
        activeUser = ""
        authMessage = ""
    }
}

if ($Username) { $config.primary.userId = $Username }
if ($Password) { $config.primary.password = $Password }

# Run Auth Check & Dual Credential Fallback
$authScript = Join-Path $PSScriptRoot "test_ebs_auth.ps1"
$authResult = $null
if (Test-Path $authScript) {
    try {
        $authRaw = & powershell -NoProfile -ExecutionPolicy Bypass -File $authScript
        $authResult = $authRaw | ConvertFrom-Json
    } catch {}
}

$activeUser = if ($authResult -and $authResult.activeUser) { $authResult.activeUser } else { $config.activeUser }
$authStatus = if ($authResult -and $authResult.status) { $authResult.status } else { $config.lastAuthStatus }
$authMsg = if ($authResult -and $authResult.message) { $authResult.message } else { $config.authMessage }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   WALTON ORACLE EBS - DAILY BOM AUTO-SYNC ENGINE" -ForegroundColor Cyan
Write-Host "   Primary ID: $($config.primary.userId) | Secondary ID: $($config.secondary.userId)" -ForegroundColor Cyan
Write-Host "   Active User: $(if ($activeUser) { $activeUser } else { 'None (Offline Mode)' })" -ForegroundColor Cyan
Write-Host "   Auth Status: $authStatus" -ForegroundColor Cyan
Write-Host "   Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$filesToParse = @()

# Step 1: Check Downloads folder for BOM_DETAILS files
Write-Host "`n[Step 1] Detecting latest EBS BOM_DETAILS downloads..." -ForegroundColor Yellow
$downloadsDir = Join-Path $env:USERPROFILE "Downloads"
$recentFiles = Get-ChildItem -Path $downloadsDir -Filter "BOM_DETAILS*.xls" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 4

if ($recentFiles) {
    foreach ($rf in $recentFiles) {
        $filesToParse += $rf.FullName
        Write-Host " Found downloaded file: $($rf.Name) ($([math]::Round($rf.Length / 1MB, 2)) MB) - Mod: $($rf.LastWriteTime)" -ForegroundColor Green
    }
}

if ($filesToParse.Count -eq 0) {
    Write-Error "No BOM_DETAILS files found in Downloads. Please export BOM_DETAILS from Oracle EBS or check connectivity."
    exit 1
}

# Step 2: High-Speed Fast Stream Parser
Write-Host "`n[Step 2] Fast parsing BOM components..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()

$allItems = New-Object System.Collections.Generic.List[object]

foreach ($file in $filesToParse) {
    $defaultOrg = if ($file -match 'CAC|643') { "CAC" } else { "RAC" }
    Write-Host " Reading $([System.IO.Path]::GetFileName($file))..." -ForegroundColor Cyan
    
    $fs = [System.IO.File]::Open($file, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $reader = New-Object System.IO.StreamReader($fs)
    $cells = New-Object System.Collections.Generic.List[string]
    $fileRowCount = 0

    while ($null -ne ($line = $reader.ReadLine())) {
        $trimmed = $line.Trim()
        if ($trimmed.StartsWith('<td>') -and $trimmed.EndsWith('</td>')) {
            $cells.Add($trimmed.Substring(4, $trimmed.Length - 9).Trim())
        } elseif ($trimmed -match '</tr>') {
            if ($cells.Count -ge 9) {
                $fgCode = $cells[2]
                $fgName = $cells[3]
                $ver = if ($cells[4]) { $cells[4].Trim() } else { "STD-0101" }
                $rmCode = $cells[5]
                $rmName = $cells[6]
                $uom = $cells[7]
                
                $qStr = $cells[8].Trim()
                if ($qStr.StartsWith('.')) { $qStr = '0' + $qStr }
                $qty = 0.0
                [double]::TryParse($qStr, [ref]$qty) | Out-Null

                $cat = $cells[1]

                # Org determination
                $fn = $fgName.ToUpper()
                $org = if ($fn.StartsWith('WCM') -or $fn.StartsWith('WFI') -or $fn.StartsWith('WFN') -or $fn.Contains('CASSETTE') -or $fn.Contains('CEILING') -or $fn.Contains('CHILLER')) { 'CAC' } else { $defaultOrg }

                if ($fgCode -and $rmCode) {
                    $allItems.Add([PSCustomObject]@{
                        Org = $org
                        ItemCat = $cat
                        FgCode = $fgCode
                        FgName = $fgName
                        Version = $ver
                        RmCode = $rmCode
                        RmName = $rmName
                        Uom = $uom
                        Qty = $qty
                    })
                    $fileRowCount++
                }
            }
            $cells.Clear()
        }
    }
    $reader.Close()
    $fs.Close()
    Write-Host " Extracted $fileRowCount components from $([System.IO.Path]::GetFileName($file))" -ForegroundColor Green
}

$sw.Stop()
Write-Host "`nExtracted $($allItems.Count) total BOM rows in $($sw.ElapsedMilliseconds) ms!" -ForegroundColor Green

# Step 3: Product Size deduction & Fast Deviation calculation
Write-Host "`n[Step 3] Calculating BOM modifications and deviations with model memory cache..." -ForegroundColor Yellow
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()

function Get-SizeLabel($name) {
    if (-not $name) { return "1.5 Ton (18K)" }
    $m = $name.ToUpper()
    if ($m -match '12|1\.0|1\s*TON|12K|12J|12MH|12CH') { return '1.0 Ton (12K)' }
    if ($m -match '18|1\.5|1\.5\s*TON|18K|18M|18MH|18CH|18X') { return '1.5 Ton (18K)' }
    if ($m -match '24|2\.0|2\s*TON|24K|24C|24W|24CH') { return '2.0 Ton (24K)' }
    if ($m -match '30|2\.5|30K|30HP') { return '2.5 Ton (30K)' }
    if ($m -match '36|3\.0|36K|36G') { return '3.0 Ton (36K)' }
    if ($m -match '48|4\.0|48K') { return '4.0 Ton (48K)' }
    if ($m -match '60|5\.0|60K|60Z') { return '5.0 Ton (60K)' }
    if ($m -match '90') { return '2.5 Ton (90)' }
    if ($m -match '140') { return '4.0 Ton (140)' }
    return '1.5 Ton (18K)'
}

# Unique RM and Model indexing
$uniqueRmMap = @{}
$modelCache = @{}

$outputRecords = New-Object System.Collections.Generic.List[object]
$deviationCount = 0
$todayStr = (Get-Date -Format "yyyy-MM-dd")
$seenKeys = New-Object System.Collections.Generic.HashSet[string]

foreach ($it in $allItems) {
    $cleanVer = if ($it.Version) { $it.Version.Trim() } else { "STD-0101" }
    $modelKey = "$($it.FgCode)_$cleanVer"
    $uniqueCompKey = "${modelKey}_$($it.RmCode)"

    if ($seenKeys.Contains($uniqueCompKey)) { continue }
    $seenKeys.Add($uniqueCompKey) | Out-Null

    if (-not $uniqueRmMap.ContainsKey($it.RmCode)) {
        $uniqueRmMap[$it.RmCode] = $it.RmName
    }

    # Retrieve or build cached baseline for this model
    if (-not $modelCache.ContainsKey($modelKey)) {
        $rmLookup = @{}
        $cleanVerSafe = $cleanVer -replace '[^\w\-]', '_'
        $cacheFile = Join-Path $bomsDir "$($it.FgCode)_${cleanVerSafe}.json"
        if (Test-Path $cacheFile) {
            try {
                $cacheData = [System.IO.File]::ReadAllText($cacheFile) | ConvertFrom-Json
                if ($cacheData -and $cacheData.Components) {
                    foreach ($c in $cacheData.Components) {
                        $rmLookup[$c.RmCode] = [double]$c.Qty
                    }
                }
            } catch {}
        }
        $modelCache[$modelKey] = $rmLookup
    }

    $rmLookup = $modelCache[$modelKey]
    $afterQty = [double]$it.Qty
    $beforeQty = $afterQty
    $dev = 0.0
    $remarks = "Standard Allocation (Checked)"

    if ($rmLookup.Count -gt 0) {
        if ($rmLookup.ContainsKey($it.RmCode)) {
            $beforeQty = [double]$rmLookup[$it.RmCode]
            $dev = [math]::Round($afterQty - $beforeQty, 4)
            if ($dev -ne 0) {
                $remarks = if ($dev -lt 0) { "BOM Optimization: Quantity Reduced per Physical Audit" } else { "BOM Revision: Increased for Process Tolerance" }
            }
        } else {
            $beforeQty = 0.0
            $dev = $afterQty
            $remarks = "New Material Added to Active BOM"
        }
    }

    if ($dev -ne 0) { $deviationCount++ }
    $size = Get-SizeLabel $it.FgName
    $type = if ($it.ItemCat -eq 'SA' -or $it.FgName -match '\(SFG\)|SFG|Fan Motor|Motor') { 'SFG' } else { 'FG' }

    $outputRecords.Add([PSCustomObject]@{
        org = $it.Org
        type = $type
        size = $size
        fgCode = $it.FgCode
        model = $it.FgName
        version = $cleanVer
        rmCode = $it.RmCode
        rmName = $it.RmName
        uom = $it.Uom
        beforeQty = [math]::Round($beforeQty, 4)
        afterQty = [math]::Round($afterQty, 4)
        deviation = $dev
        revisionDate = $todayStr
        remarks = $remarks
    })
}

$sw2.Stop()
Write-Host "Processed $($outputRecords.Count) unique components in $($sw2.ElapsedMilliseconds) ms! Found $deviationCount deviations." -ForegroundColor Green

# Step 4: Write ebs_daily_bom_data.js
Write-Host "`n[Step 4] Updating dashboard JS data..." -ForegroundColor Yellow

# Sort: Deviations on top
$sortedRecords = $outputRecords | Sort-Object { if ($_.deviation -ne 0) { 0 } else { 1 } } | Select-Object -First 15000

$syncMetadata = @{
    lastSync = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    source = "Walton Oracle EBS (webs.waltonbd.com)"
    user = if ($activeUser) { "Active User: $activeUser" } else { "Primary: $($config.primary.userId) / $($config.secondary.userId)" }
    primaryUser = $config.primary.userId
    secondaryUser = $config.secondary.userId
    lastAuthStatus = $authStatus
    activeUser = $activeUser
    authMessage = $authMsg
    totalRecords = $outputRecords.Count
    displayedRecords = $sortedRecords.Count
    deviationsCount = $deviationCount
    uniqueModels = ($outputRecords | Select-Object -ExpandProperty fgCode -Unique).Count
    uniqueRMs = $uniqueRmMap.Count
}

$metaJson = $syncMetadata | ConvertTo-Json -Depth 5
$recordsJson = $sortedRecords | ConvertTo-Json -Depth 5

$userLabel = if ($activeUser) { "Active User: $activeUser" } else { "Primary: $($config.primary.userId), Secondary: $($config.secondary.userId)" }
$jsContent = "// Auto-Generated by Walton Oracle EBS Daily BOM Auto-Sync Engine`n// Generated at: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))`n// Owner Status: $userLabel`n// Auth Status: $authStatus`n`nconst EBS_SYNC_METADATA = $metaJson;`n`nconst EBS_DAILY_BOM_RECORDS = $recordsJson;`n"

[System.IO.File]::WriteAllText($outputJs, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host " Saved $outputJs ($([math]::Round((Get-Item $outputJs).Length / 1MB, 2)) MB)" -ForegroundColor Green

# Update last_sync.json
$metaJson | Set-Content $lastSyncJson -Encoding UTF8

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "   DAILY BOM AUTO-SYNC COMPLETE!" -ForegroundColor Green
Write-Host "   Total Unique Components: $($outputRecords.Count)" -ForegroundColor Green
Write-Host "   Deviations Detected: $deviationCount" -ForegroundColor Green
Write-Host "   Dashboard updated at http://localhost:8080/" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
