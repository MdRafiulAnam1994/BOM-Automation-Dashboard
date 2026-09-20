param (
    [string]$ItemCode,
    [string]$Version,
    [string]$Search,
    [switch]$FetchAllSheet
)

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$catalogPath = Join-Path $PSScriptRoot "active_bom_catalog.json"
$cacheDir = Join-Path $PSScriptRoot "boms"
$cacheJsPath = Join-Path $PSScriptRoot "bom_cache.js"
$scratchDir = Join-Path $PSScriptRoot "scratch"
$cookiePath = Join-Path $scratchDir "cookie.txt"


if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
}

if (-not (Test-Path $catalogPath)) {
    Write-Error "Catalog not found at $catalogPath"
    exit 1
}

$catalog = Get-Content $catalogPath -Raw | ConvertFrom-Json

function Get-BomDetails($item) {
    $cleanVersion = if ($item.Version) { $item.Version } else { "default" }
    $cleanVersionSafe = $cleanVersion -replace '[^\w\-]', '_'
    $outFile = Join-Path $cacheDir "$($item.ItemCode)_$($cleanVersionSafe).json"

    if (Test-Path $outFile) {
        Write-Host " [CACHE HIT] $($item.ItemCode) ($($item.Version)) already exists in cache." -ForegroundColor Green
        return Get-Content $outFile -Raw | ConvertFrom-Json
    }

    $cleanRmUrl = ($item.RmUrl -replace '[\r\n\t]+', '').Trim()
    $url = "https://webs.waltonbd.com/1225/" + $cleanRmUrl
    Write-Host " [FETCHING] $($item.ItemCode) ($($item.Version)) from Walton EBS..." -ForegroundColor Cyan

    $tempHtml = [System.IO.Path]::GetTempFileName()
    $curlParams = @("-k", "-s", "--ssl-no-revoke", "--http1.1", "--no-keepalive", "--max-time", "15", "-b", $cookiePath, $url, "-o", $tempHtml)
    & "C:\Windows\System32\curl.exe" @curlParams

    if (-not (Test-Path $tempHtml) -or (Get-Item $tempHtml).Length -lt 200) {
        Write-Warning "Failed to fetch BOM for $($item.ItemCode)"
        Remove-Item $tempHtml -Force -ErrorAction SilentlyContinue
        return $null
    }
    $html = Get-Content $tempHtml -Raw
    Remove-Item $tempHtml -Force -ErrorAction SilentlyContinue

    # Fast block-based parser
    $trBlocks = $html -split '(?i)<tr[^>]*>'
    $rows = @()
    foreach ($tr in $trBlocks) {
        if ($tr -match '(?i)<th') { continue }
        $tds = [regex]::Matches($tr, '(?si)<td[^>]*>(.*?)</td>')
        if ($tds.Count -ge 8) {
            $vals = @()
            foreach ($td in $tds) {
                $clean = [System.Text.RegularExpressions.Regex]::Replace($td.Groups[1].Value, '<[^>]+>', ' ').Trim()
                $vals += [System.Net.WebUtility]::HtmlDecode($clean)
            }
            $rows += [PSCustomObject]@{
                SL = [int]$vals[0]
                MajorCategory = $vals[1]
                MinorCategory = $vals[2]
                RmCode = $vals[3]
                RmName = $vals[4]
                UOM = $vals[5]
                Qty = [double]$vals[6]
                Price = [double]$vals[7]
                Value = if ($vals.Count -ge 9) { [double]$vals[8] } else { 0.0 }
            }
        }
    }

    $result = [PSCustomObject]@{
        ItemCode = $item.ItemCode
        ItemName = $item.ItemName
        Version = $item.Version
        Org = $item.Org
        UnitCode = $item.UnitCode
        BomId = $item.BomId
        RMCost = $item.RMCost
        FetchedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        TotalRMCount = $rows.Count
        Components = $rows
    }

    $result | ConvertTo-Json -Depth 6 | Set-Content $outFile -Encoding UTF8
    Write-Host " [SUCCESS] Saved $($rows.Count) RM components to $outFile" -ForegroundColor Green
    return $result
}

function Update-BomCacheJs() {
    $allBoms = @{}
    $files = Get-ChildItem -Path $cacheDir -Filter "*.json"
    foreach ($f in $files) {
        $data = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $key = "$($data.ItemCode)_$($data.Version)"
        $allBoms[$key] = $data
    }
    $jsContent = "const BOM_CACHE = " + ($allBoms | ConvertTo-Json -Depth 6) + ";"
    [System.IO.File]::WriteAllText($cacheJsPath, $jsContent, [System.Text.Encoding]::UTF8)
    Write-Host "Updated bom_cache.js with $($allBoms.Count) cached BOMs." -ForegroundColor Yellow
}

# Execution modes
if ($Search) {
    $results = $catalog | Where-Object { 
        $_.ItemCode -like "*$Search*" -or 
        $_.ItemName -like "*$Search*" -or 
        $_.Version -like "*$Search*" 
    }
    Write-Host "`nFound $($results.Count) matching items in Active BOM catalog:`n" -ForegroundColor Cyan
    $results | Select-Object ItemCode, Org, Version, RMCost, ItemName | Format-Table -AutoSize
    exit 0
}

if ($ItemCode) {
    $foundItems = $catalog | Where-Object { $_.ItemCode -eq $ItemCode }
    if ($Version) {
        $foundItems = $foundItems | Where-Object { $_.Version -eq $Version }
    }
    if ($foundItems.Count -eq 0) {
        Write-Warning "Item Code $ItemCode $(if($Version){"Version $Version"}) not found in Active BOM catalog."
        exit 1
    }
    foreach ($item in $foundItems) {
        Get-BomDetails $item | Out-Null
    }
    Update-BomCacheJs
    exit 0
}

if ($FetchAllSheet) {
    $sheetPath = Join-Path $PSScriptRoot "sheet_1588891488.csv"
    $sheet = Import-Csv $sheetPath
    $fgCodes = @()
    foreach ($row in $sheet) {
        if ($row.'Mail Subject' -match 'FG Code:\s*(\d+)') {
            $fgCodes += $matches[1]
        }
    }
    $uniqueFg = $fgCodes | Select-Object -Unique
    Write-Host "Fetching BOM for $($uniqueFg.Count) unique FG codes from sheet..." -ForegroundColor Cyan

    foreach ($code in $uniqueFg) {
        $items = $catalog | Where-Object { $_.ItemCode -eq $code }
        foreach ($it in $items) {
            Get-BomDetails $it | Out-Null
            Start-Sleep -Milliseconds 300
        }
    }
    Update-BomCacheJs
    exit 0
}

Write-Host "Usage:"
Write-Host "  .\fetch_bom.ps1 -Search 'KRYSTALINE'"
Write-Host "  .\fetch_bom.ps1 -ItemCode 470640 -Version 'KSTAL-2224'"
Write-Host "  .\fetch_bom.ps1 -FetchAllSheet"
