param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

# Automatically resolve the root directory regardless of which PC, drive, or folder this runs in
$root = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = (Get-Location).Path
}

# Clean up any lingering process on port 8080
try {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            if ($p -and $p -ne $PID) {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 400
    }
} catch {}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "Failed to bind to both prefixes. Retrying with localhost only..." -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   WALTON BOM UNIFIED APPLICATION SERVER (HTTP.SYS)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  > Local Access             : http://localhost:$Port/" -ForegroundColor Yellow
Write-Host "  > Local IP Access          : http://127.0.0.1:$Port/" -ForegroundColor Yellow
Write-Host "  > Tab 1 & 2                : BOM Observation & Modification" -ForegroundColor Gray
Write-Host "  > Tab 3                    : Active BOM Cross Verification" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Server is running live. Press Ctrl+C to stop.`n" -ForegroundColor Gray

# Automatically launch browser once server is confirmed listening
if (-not $NoBrowser) {
    try {
        Start-Process "http://localhost:$Port/"
    } catch {}
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add Global CORS & Cache headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        $response.Headers.Add("Access-Control-Allow-Headers", "*")
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $urlPath = $request.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($urlPath) -or $urlPath -eq "") {
            $urlPath = "index.html"
        }

        # API: Stop EBS Sync
        if ($urlPath -eq "api/stop-sync" -or $urlPath -eq "api/ebs-stop-sync") {
            Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { 
                $_.CommandLine -like "*sync_daily_bom.ps1*" -or $_.CommandLine -like "*sync_all_boms.ps1*" -or $_.CommandLine -like "*fetch_bom.ps1*"
            } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
            $configFile = Join-Path $root "ebs_config.json"
            if (Test-Path $configFile) {
                try {
                    $c = Get-Content $configFile -Raw | ConvertFrom-Json
                    $c | Add-Member -Name "syncDisabled" -Value $true -MemberType NoteProperty -Force
                    $c.lastAuthStatus = "logged_out"
                    $c.activeUser = ""
                    $c.lastLoginDate = ""
                    $c.authMessage = "Oracle EBS synchronization has been stopped and disabled."
                    $c | ConvertTo-Json -Depth 5 | Set-Content $configFile -Encoding UTF8
                } catch {}
            }
            $cookieFile = Join-Path $root "scratch\cookie.txt"
            if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force -ErrorAction SilentlyContinue }

            $json = '{"status":"stopped","message":"Oracle EBS synchronization has been stopped and disabled."}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: Trigger EBS Auto-Sync
        if ($urlPath -eq "api/sync-ebs") {
            $configFile = Join-Path $root "ebs_config.json"
            $cfg = if (Test-Path $configFile) { Get-Content $configFile -Raw | ConvertFrom-Json } else { $null }
            if ($cfg -and $cfg.syncDisabled) {
                $json = '{"status":"disabled","message":"Oracle EBS synchronization is currently stopped and disabled."}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            $syncScript = Join-Path $root "sync_daily_bom.ps1"
            Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`"" -WindowStyle Hidden
            $json = '{"status":"initiated","message":"EBS Daily BOM Sync started in background"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: Check EBS Sync Status
        if ($urlPath -eq "api/sync-status") {
            $lastSyncPath = Join-Path $root "last_sync.json"
            $json = if (Test-Path $lastSyncPath) { [System.IO.File]::ReadAllText($lastSyncPath) } else { '{"status":"none"}' }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: EBS Config Get & Update
        if ($urlPath -eq "api/ebs-config") {
            $configFile = Join-Path $root "ebs_config.json"
            $exampleFile = Join-Path $root "ebs_config.example.json"
            if (-not (Test-Path $configFile) -and (Test-Path $exampleFile)) {
                Copy-Item $exampleFile $configFile -Force
            }
            if ($request.HttpMethod -eq "POST") {
                $sr = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $sr.ReadToEnd()
                $bodyData = $bodyText | ConvertFrom-Json

                $cfg = if (Test-Path $configFile) { Get-Content $configFile -Raw | ConvertFrom-Json } else { [PSCustomObject]@{} }
                if ($bodyData.primaryUser) { $cfg.primary.userId = $bodyData.primaryUser }
                if (![string]::IsNullOrEmpty($bodyData.primaryPass)) { $cfg.primary.password = $bodyData.primaryPass }
                if ($bodyData.secondaryUser) { $cfg.secondary.userId = $bodyData.secondaryUser }
                if (![string]::IsNullOrEmpty($bodyData.secondaryPass)) { $cfg.secondary.password = $bodyData.secondaryPass }
                $cfg | ConvertTo-Json -Depth 5 | Set-Content $configFile -Encoding UTF8

                # Run Auth Test
                $testScript = Join-Path $root "test_ebs_auth.ps1"
                if (Test-Path $testScript) {
                    & powershell -NoProfile -ExecutionPolicy Bypass -File $testScript | Out-Null
                }
                $json = if (Test-Path $configFile) { [System.IO.File]::ReadAllText($configFile) } else { '{"status":"ok"}' }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            } else {
                $json = if (Test-Path $configFile) { [System.IO.File]::ReadAllText($configFile) } else { '{"status":"none"}' }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            }
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: Test EBS Auth Directly
        if ($urlPath -eq "api/test-ebs-auth") {
            $testScript = Join-Path $root "test_ebs_auth.ps1"
            if (Test-Path $testScript) {
                & powershell -NoProfile -ExecutionPolicy Bypass -File $testScript | Out-Null
            }
            $configFile = Join-Path $root "ebs_config.json"
            $json = if (Test-Path $configFile) { [System.IO.File]::ReadAllText($configFile) } else { '{"status":"ok"}' }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: EBS Direct Login (One-click login with session retention)
        if ($urlPath -eq "api/ebs-login") {
            $configFile = Join-Path $root "ebs_config.json"
            $testScript = Join-Path $root "test_ebs_auth.ps1"
            if ($request.HttpMethod -eq "POST") {
                $sr = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $sr.ReadToEnd()
                $bodyData = $bodyText | ConvertFrom-Json

                $pUser = if ($bodyData.userId) { $bodyData.userId } else { "" }
                $pPass = if ($bodyData.password) { $bodyData.password } else { "" }
                $sUser = if ($bodyData.fallbackUserId) { $bodyData.fallbackUserId } else { "" }
                $sPass = if ($bodyData.fallbackPassword) { $bodyData.fallbackPassword } else { "" }

                if (Test-Path $testScript) {
                    $authArgs = @{
                        Force = $true
                        PrimaryId = $pUser
                        PrimaryPass = $pPass
                        SecondaryId = $sUser
                        SecondaryPass = $sPass
                    }
                    & $testScript @authArgs | Out-Null
                }
            }
            $cfg = if (Test-Path $configFile) { Get-Content $configFile -Raw | ConvertFrom-Json } else { [PSCustomObject]@{} }
            $cfg | Add-Member -Name "status" -Value $cfg.lastAuthStatus -MemberType NoteProperty -Force
            $json = $cfg | ConvertTo-Json -Depth 5
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # API: EBS Logout
        if ($urlPath -eq "api/ebs-logout") {
            try {
                if ($request.HasEntityBody) {
                    $sr = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $null = $sr.ReadToEnd()
                }
            } catch {}

            $configFile = Join-Path $root "ebs_config.json"
            $cookieFile = Join-Path $root "scratch\cookie.txt"
            if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force -ErrorAction SilentlyContinue }
            Get-ChildItem (Join-Path $root "scratch") -Filter "temp_cookie_*.txt" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

            $cfg = if (Test-Path $configFile) { Get-Content $configFile -Raw | ConvertFrom-Json } else { [PSCustomObject]@{} }
            $cfg.lastAuthStatus = "logged_out"
            $cfg.activeUser = ""
            $cfg.lastLoginDate = ""
            $cfg.authMessage = "Oracle EBS session logged out. Please log in with Employee ID & Password."
            $cfg.lastChecked = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            $cfg | ConvertTo-Json -Depth 5 | Set-Content $configFile -Encoding UTF8

            $lastSyncPath = Join-Path $root "last_sync.json"
            if (Test-Path $lastSyncPath) {
                try {
                    $syncData = Get-Content $lastSyncPath -Raw | ConvertFrom-Json
                    $syncData.lastAuthStatus = "logged_out"
                    $syncData.activeUser = ""
                    $syncData.lastLoginDate = ""
                    $syncData | ConvertTo-Json -Depth 5 | Set-Content $lastSyncPath -Encoding UTF8
                } catch {}
            }

            $json = '{"status":"logged_out","message":"Successfully logged out of Oracle EBS"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # Static File Serving
        $localPath = [System.Uri]::UnescapeDataString($urlPath).Replace('/', '\')
        $filePath = Join-Path $root $localPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".csv"  { "text/csv; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                ".xlsx" { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
                ".xls"  { "application/vnd.ms-excel" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $mime
            $fileInfo = New-Object System.IO.FileInfo($filePath)
            $response.ContentLength64 = $fileInfo.Length
            $response.StatusCode = 200

            if ($request.HttpMethod -ne "HEAD") {
                $fileStream = [System.IO.File]::OpenRead($filePath)
                try {
                    $buffer = New-Object byte[] 65536
                    while (($bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                        $response.OutputStream.Write($buffer, 0, $bytesRead)
                    }
                } finally {
                    $fileStream.Close()
                }
            }
            $response.Close()
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.StatusCode = 404
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $msg.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            $response.Close()
        }
    } catch {
        try {
            if ($response) { $response.Close() }
        } catch {}
    }
}
