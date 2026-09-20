param(
    [string]$PrimaryId = "",
    [string]$PrimaryPass = "",
    [string]$SecondaryId = "",
    [string]$SecondaryPass = "",
    [switch]$Force
)

# Automatically resolve the root directory regardless of which PC, drive, or folder this runs in
$root = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = (Get-Location).Path
}
$configFile = Join-Path $root "ebs_config.json"
$cookieFile = Join-Path $root "scratch\cookie.txt"
$scratchDir = Join-Path $root "scratch"
if (-not (Test-Path $scratchDir)) { New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null }

$todayStr = (Get-Date -Format "yyyy-MM-dd")

$config = if (Test-Path $configFile) {
    Get-Content $configFile -Raw | ConvertFrom-Json
} elseif (Test-Path (Join-Path $root "ebs_config.example.json")) {
    Get-Content (Join-Path $root "ebs_config.example.json") -Raw | ConvertFrom-Json
} else {
    [PSCustomObject]@{
        primary = [PSCustomObject]@{ userId = ""; password = ""; name = "Primary Employee" }
        secondary = [PSCustomObject]@{ userId = ""; password = ""; name = "Secondary Fallback User" }
        lastAuthStatus = "pending"
        activeUser = ""
        lastLoginDate = ""
        authMessage = ""
        lastChecked = ""
    }
}

if (![string]::IsNullOrWhiteSpace($PrimaryId)) { $config.primary.userId = $PrimaryId }
if (![string]::IsNullOrWhiteSpace($PrimaryPass)) { $config.primary.password = $PrimaryPass }
if (![string]::IsNullOrWhiteSpace($SecondaryId)) { $config.secondary.userId = $SecondaryId }
if (![string]::IsNullOrWhiteSpace($SecondaryPass)) { $config.secondary.password = $SecondaryPass }

# "sara din e akbar login jothesto hoi jeno":
# If already logged in successfully today, and not forcing a re-test with new credentials:
if (-not $Force -and ($config.lastAuthStatus -eq "success" -or $config.lastAuthStatus -eq "fallback_success") -and $config.lastLoginDate -eq $todayStr) {
    $cachedResult = [PSCustomObject]@{
        status = $config.lastAuthStatus
        activeUser = $config.activeUser
        message = "Active session valid for today ($todayStr). Logged in as ID: $($config.activeUser)."
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        cached = $true
    }
    $cachedResult | ConvertTo-Json
    exit 0
}

function Try-Login([string]$userId, [string]$password) {
    if ([string]::IsNullOrWhiteSpace($userId) -or [string]::IsNullOrWhiteSpace($password)) {
        return @{ Success = $false; Reason = "Missing Employee ID or Password" }
    }

    try {
        $tempCookie = Join-Path $scratchDir "temp_cookie_$userId.txt"
        if (Test-Path $tempCookie) { Remove-Item $tempCookie -Force }

        # Initial GET to initialize session
        $null = & curl.exe -k -s -c $tempCookie "https://webs.waltonbd.com/1225/index.php" --max-time 10

        # POST login
        $uEnc = [System.Uri]::EscapeDataString($userId)
        $pEnc = [System.Uri]::EscapeDataString($password)
        $postData = "userName=$uEnc&password=$pEnc&submit=Login"

        $tempOut = [System.IO.Path]::GetTempFileName()
        & curl.exe -k -s -i -b $tempCookie -c $tempCookie -d $postData "https://webs.waltonbd.com/1225/index.php" -o $tempOut --max-time 12

        if (Test-Path $tempOut) {
            $resp = [System.IO.File]::ReadAllText($tempOut)
            Remove-Item $tempOut -Force -ErrorAction SilentlyContinue

            # If redirected to main page or not showing login form
            if ($resp -match "HTTP/1\.[01] 302" -or ($resp -notmatch "Enter Login Details" -and $resp -notmatch "WEBS \| Log in" -and $resp.Length -gt 100)) {
                # Copy working cookie to main cookie file
                Copy-Item $tempCookie $cookieFile -Force
                return @{ Success = $true; Reason = "Authentication successful" }
            } else {
                return @{ Success = $false; Reason = "Invalid credentials or login rejected by Walton EBS" }
            }
        }
    } catch {
        return @{ Success = $false; Reason = $_.Exception.Message }
    }

    return @{ Success = $false; Reason = "Connection timeout reaching webs.waltonbd.com" }
}

$pUser = $config.primary.userId
$pPass = $config.primary.password
$sUser = $config.secondary.userId
$sPass = $config.secondary.password

$pRes = Try-Login $pUser $pPass

$finalStatus = "failed"
$activeUser = ""
$authMsg = ""

if ($pRes.Success) {
    $finalStatus = "success"
    $activeUser = $pUser
    $authMsg = "Successfully authenticated as Employee ID: $pUser. Active session valid for today."
    $config.lastLoginDate = $todayStr
} else {
    # Fallback to secondary owner if primary fails
    $sRes = Try-Login $sUser $sPass

    if ($sRes.Success) {
        $finalStatus = "fallback_success"
        $activeUser = $sUser
        $authMsg = "Primary ID $pUser failed. Authenticated using Secondary ID: $sUser (Fallback). Active session valid for today."
        $config.lastLoginDate = $todayStr
    } else {
        $finalStatus = "failed"
        $activeUser = ""
        $authMsg = "Oracle EBS Login Notice (Monthly Password Update Required): Unable to authenticate with ID $pUser or fallback ID $sUser. If monthly credentials have expired or changed, please log in with your updated ID & Password."
    }
}

$config.lastAuthStatus = $finalStatus
$config.activeUser = $activeUser
$config.authMessage = $authMsg
$config.lastChecked = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Save updated config
$config | ConvertTo-Json -Depth 5 | Set-Content $configFile -Encoding UTF8

# Update last_sync.json if exists
$lastSyncPath = Join-Path $root "last_sync.json"
if (Test-Path $lastSyncPath) {
    try {
        $syncData = Get-Content $lastSyncPath -Raw | ConvertFrom-Json
        $syncData | Add-Member -Name "lastAuthStatus" -Value $finalStatus -MemberType NoteProperty -Force
        $syncData | Add-Member -Name "activeUser" -Value $activeUser -MemberType NoteProperty -Force
        $syncData | Add-Member -Name "authMessage" -Value $authMsg -MemberType NoteProperty -Force
        $syncData | Add-Member -Name "lastLoginDate" -Value $config.lastLoginDate -MemberType NoteProperty -Force
        $syncData | ConvertTo-Json -Depth 5 | Set-Content $lastSyncPath -Encoding UTF8
    } catch {}
}

$outputResult = [PSCustomObject]@{
    status = $finalStatus
    activeUser = $activeUser
    message = $authMsg
    lastLoginDate = $config.lastLoginDate
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

$outputResult | ConvertTo-Json
