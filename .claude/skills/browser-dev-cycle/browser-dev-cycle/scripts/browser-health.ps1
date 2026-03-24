# browser-health.ps1 - Quick browser automation health check
param([int]$Port = 9222)

$results = @()

# Check 1: Chrome running with CDP?
Write-Host "=== Browser Automation Health Check ===" -ForegroundColor Cyan
Write-Host ""

try {
    $cdp = Invoke-RestMethod -Uri "http://localhost:$Port/json/version" -TimeoutSec 3
    Write-Host "[PASS] Chrome CDP active on port $Port" -ForegroundColor Green
    Write-Host "       Browser: $($cdp.Browser)"
    $results += "CDP: OK"
} catch {
    Write-Host "[FAIL] Chrome CDP not responding on port $Port" -ForegroundColor Red
    Write-Host "       Run: .\browser-setup.ps1"
    $results += "CDP: FAIL"
}

# Check 2: Playwright MCP available?
$playwrightMcp = Get-Command npx -ErrorAction SilentlyContinue
if ($playwrightMcp) {
    Write-Host "[PASS] npx available (for @playwright/mcp)" -ForegroundColor Green
    $results += "npx: OK"
} else {
    Write-Host "[FAIL] npx not found - install Node.js" -ForegroundColor Red
    $results += "npx: FAIL"
}

# Check 3: playwright-core installed?
$pwCore = npm list playwright-core 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] playwright-core installed" -ForegroundColor Green
    $results += "playwright-core: OK"
} else {
    Write-Host "[WARN] playwright-core not installed (needed for Tier 3 scripts)" -ForegroundColor Yellow
    Write-Host "       Run: npm install playwright-core"
    $results += "playwright-core: WARN"
}

# Check 4: Open tabs
try {
    $tabs = Invoke-RestMethod -Uri "http://localhost:$Port/json" -TimeoutSec 3
    $pageCount = ($tabs | Where-Object { $_.type -eq "page" }).Count
    Write-Host "[INFO] $pageCount open tab(s)" -ForegroundColor Cyan
    foreach ($tab in ($tabs | Where-Object { $_.type -eq "page" })) {
        Write-Host "       - $($tab.title): $($tab.url)"
    }
} catch {
    Write-Host "[SKIP] Cannot list tabs (CDP not active)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$results | ForEach-Object { Write-Host "  $_" }
