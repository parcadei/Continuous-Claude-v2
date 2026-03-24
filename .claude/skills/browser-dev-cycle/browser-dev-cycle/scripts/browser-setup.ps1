# browser-setup.ps1 - Launch Chrome with CDP for browser automation
param(
    [int]$Port = 9222,
    [switch]$Force,
    [string]$Profile = "$env:LOCALAPPDATA\browser-dev-cycle\chrome-profile"
)

$ErrorActionPreference = "Stop"

# Check if port already in use
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) {
    if ($Force) {
        Write-Host "Force-killing existing process on port $Port..."
        $pid = $existing[0].OwningProcess
        Stop-Process -Id $pid -Force
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Port $Port already in use. Chrome may already be running with CDP."
        Write-Host "  PID: $($existing[0].OwningProcess)"
        Write-Host "  Use -Force to kill and restart."
        # Verify it responds
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:$Port/json/version" -TimeoutSec 3
            Write-Host "  CDP endpoint active: $($response.webSocketDebuggerUrl)"
            exit 0
        } catch {
            Write-Host "  Port in use but CDP not responding. Use -Force to restart."
            exit 1
        }
    }
}

# Find Chrome
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
    Write-Host "ERROR: Chrome not found. Install Chrome or set path manually."
    exit 1
}

# Create profile directory
if (-not (Test-Path $Profile)) {
    New-Item -ItemType Directory -Path $Profile -Force | Out-Null
}

Write-Host "Launching Chrome with CDP on port $Port..."
Write-Host "  Profile: $Profile"

# Launch Chrome
$args = @(
    "--remote-debugging-port=$Port",
    "--user-data-dir=$Profile",
    "--no-first-run",
    "--no-default-browser-check"
)
Start-Process -FilePath $chrome -ArgumentList $args

# Wait for CDP to be ready
$maxWait = 10
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/json/version" -TimeoutSec 2
        Write-Host "Chrome CDP ready!"
        Write-Host "  Browser: $($response.Browser)"
        Write-Host "  WebSocket: $($response.webSocketDebuggerUrl)"
        Write-Host "  HTTP: http://localhost:$Port"
        exit 0
    } catch {
        Write-Host "  Waiting for CDP... ($($i+1)/$maxWait)"
    }
}

Write-Host "ERROR: Chrome started but CDP not responding after ${maxWait}s"
exit 1
