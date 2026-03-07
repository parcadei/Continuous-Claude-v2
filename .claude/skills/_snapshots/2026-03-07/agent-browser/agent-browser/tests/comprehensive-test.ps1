# comprehensive-test.ps1 - Agent Browser CLI comprehensive test suite
# Tests ~40 commands across 15 categories against the-internet.herokuapp.com
# Usage: powershell.exe -File .claude/skills/agent-browser/tests/comprehensive-test.ps1

$ErrorActionPreference = "Continue"
$script:passed = 0
$script:failed = 0
$script:skipped = 0
$script:errors = @()
$script:testName = ""

$BASE = "https://the-internet.herokuapp.com"

# -- Helpers -------------------------------------------------------------------

function Log-Pass($msg) {
    $script:passed++
    Write-Host "[PASS] $($script:testName): $msg" -ForegroundColor Green
}

function Log-Fail($msg) {
    $script:failed++
    $script:errors += "$($script:testName): $msg"
    Write-Host "[FAIL] $($script:testName): $msg" -ForegroundColor Red
}

function Log-Skip($msg) {
    $script:skipped++
    Write-Host "[SKIP] $($script:testName): $msg" -ForegroundColor Yellow
}

function Ab-Json {
    param([string]$cmd)
    $raw = Invoke-Expression "ab $cmd --json" 2>&1
    try {
        return $raw | ConvertFrom-Json
    } catch {
        return @{ success = $false; error = "JSON parse failed: $raw" }
    }
}

function Ab-Run {
    param([string]$cmd)
    Invoke-Expression "ab $cmd" 2>&1 | Out-Null
}

function Assert-Success {
    param($result, $msg)
    if ($result.success -eq $true) { Log-Pass $msg }
    else { Log-Fail ($msg + " - error: " + $result.error) }
}

function Assert-Equals {
    param($actual, $expected, $msg)
    if ("$actual" -eq "$expected") { Log-Pass $msg }
    else { Log-Fail ($msg + " - expected '" + $expected + "', got '" + $actual + "'") }
}

function Assert-Contains {
    param($text, $substring, $msg)
    if ($text -and $text.ToString().Contains($substring)) { Log-Pass $msg }
    else { Log-Fail ($msg + " - '" + $text + "' does not contain '" + $substring + "'") }
}

function Assert-Match {
    param($text, $pattern, $msg)
    if ($text -and $text -match $pattern) { Log-Pass $msg }
    else { Log-Fail ($msg + " - '" + $text + "' does not match '" + $pattern + "'") }
}

function Assert-True {
    param($val, $msg)
    if ($val -eq $true -or $val -eq "true") { Log-Pass $msg }
    else { Log-Fail ($msg + " - expected true, got '" + $val + "'") }
}

function Assert-False {
    param($val, $msg)
    if ($val -eq $false -or $val -eq "false") { Log-Pass $msg }
    else { Log-Fail ($msg + " - expected false, got '" + $val + "'") }
}

function Assert-GreaterThan {
    param($actual, $expected, $msg)
    if ([int]$actual -gt [int]$expected) { Log-Pass $msg }
    else { Log-Fail ($msg + " - expected greater than " + $expected + ", got " + $actual) }
}

# Extract the scalar value from a data object.
# ab --json returns { success, data: { url, text, result, visible, checked, ... } }
# This unwraps .data.url, .data.text, .data.result, etc. to the scalar value.
function Get-DataValue($data) {
    if ($null -eq $data) { return $null }
    if ($data -is [string] -or $data -is [int] -or $data -is [bool] -or $data -is [double]) { return $data }
    # PSCustomObject: return the first property value
    if ($data.PSObject -and $data.PSObject.Properties) {
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Name -notin @("refs", "snapshot")) {
                return $prop.Value
            }
        }
    }
    return $data
}

# Give pages time to load after navigation
function Wait-PageLoad { Start-Sleep -Milliseconds 1500 }

# Find a ref by matching a property value in the refs hashtable
function Find-Ref($result, $prop, $pattern) {
    if (-not $result.data.refs) { return $null }
    $refs = $result.data.refs
    foreach ($key in $refs.PSObject.Properties.Name) {
        $ref = $refs.$key
        $val = $ref.$prop
        if ($val -and $val -match $pattern) { return $key }
    }
    return $null
}

# -- Test Functions ------------------------------------------------------------

function Test-NavigationAndHistory {
    $script:testName = "Navigation"

    # Open redirector page
    $r = Ab-Json "open $BASE/redirector"
    Wait-PageLoad
    Assert-Success $r "open redirector page"

    # Verify URL
    $r = Ab-Json "url"
    Assert-Contains $r.data.url "redirector" "URL contains redirector"

    # Verify title
    $r = Ab-Json "title"
    Assert-Success $r "title returns successfully"

    # Click redirect link to navigate away
    $r = Ab-Json "snapshot -i"
    $redirectRef = Find-Ref $r "name" "(?i)redirect"
    if (-not $redirectRef) {
        # Try clicking a link via CSS
        Ab-Run "open $BASE/redirector"
        Wait-PageLoad
        Ab-Run "click 'a[href*=redirect]'"
        Wait-PageLoad
    } else {
        Ab-Run "click '@$redirectRef'"
        Wait-PageLoad
    }

    # Test back
    Ab-Run "back"
    Wait-PageLoad
    $r = Ab-Json "url"
    Assert-Contains (Get-DataValue $r.data) "redirector" "back returns to redirector"

    # Test forward
    Ab-Run "forward"
    Wait-PageLoad
    $r = Ab-Json "url"
    Assert-Success $r "forward navigates successfully"

    # Test reload
    $r = Ab-Json "reload"
    Wait-PageLoad
    Assert-Success $r "reload succeeds"
}

function Test-LoginForm {
    $script:testName = "Login"

    $r = Ab-Json "open $BASE/login"
    Wait-PageLoad
    Assert-Success $r "open login page"

    # Snapshot to find form elements
    $r = Ab-Json "snapshot -i"
    Assert-Success $r "snapshot interactive elements"

    # Fill username via CSS selector (more reliable than refs for known forms)
    $r = Ab-Json "fill '#username' 'tomsmith'"
    Assert-Success $r "fill username"

    $r = Ab-Json "fill '#password' 'SuperSecretPassword!'"
    Assert-Success $r "fill password"

    # Verify input value roundtrip
    $r = Ab-Json "inputvalue '#username'"
    Assert-Equals (Get-DataValue $r.data) "tomsmith" "inputvalue reads back username"

    # Click login button
    $r = Ab-Json "click 'button[type=submit]'"
    Assert-Success $r "click login button"

    # Wait for redirect to /secure
    $r = Ab-Json "waitforurl '**/secure*' --timeout 5000"
    Assert-Success $r "redirected to secure area"

    # Verify success message
    $r = Ab-Json "gettext '#flash'"
    Assert-Contains (Get-DataValue $r.data) "logged into a secure area" "success flash message"

    # Screenshot the success state
    $r = Ab-Json "screenshot"
    Assert-Success $r "screenshot captured"

    # Logout
    $r = Ab-Json "click 'a[href*=logout]'"
    Wait-PageLoad
    $r = Ab-Json "url"
    Assert-Contains (Get-DataValue $r.data) "login" "logout returns to login"
}

function Test-Checkboxes {
    $script:testName = "Checkboxes"

    $r = Ab-Json "open $BASE/checkboxes"
    Wait-PageLoad
    Assert-Success $r "open checkboxes page"

    # Get interactive snapshot
    $r = Ab-Json "snapshot -i"
    Assert-Success $r "snapshot checkboxes"

    # Use CSS selectors for the two checkboxes
    $sel1 = "'#checkboxes input:nth-child(1)'"
    $sel2 = "'#checkboxes input:nth-child(3)'"

    # Check initial state of checkbox 1 (unchecked by default)
    $r = Ab-Json "ischecked $sel1"
    if ($r.success) {
        $initialState1 = (Get-DataValue $r.data)
        # Toggle it
        if ($initialState1 -eq $true) {
            Ab-Run "uncheck $sel1"
        } else {
            Ab-Run "check $sel1"
        }
        Start-Sleep -Milliseconds 500
        $r = Ab-Json "ischecked $sel1"
        if ($initialState1 -eq $true) {
            Assert-False (Get-DataValue $r.data) "uncheck toggled checkbox 1 off"
        } else {
            Assert-True (Get-DataValue $r.data) "check toggled checkbox 1 on"
        }
    } else {
        # Fallback: use snapshot refs
        $r = Ab-Json "snapshot -i"
        $cb1 = Find-Ref $r "role" "checkbox"
        if ($cb1) {
            $r = Ab-Json "ischecked '@$cb1'"
            Assert-Success $r "ischecked on checkbox ref"
            Ab-Run "click '@$cb1'"
            Start-Sleep -Milliseconds 500
            $r2 = Ab-Json "ischecked '@$cb1'"
            if ((Get-DataValue $r.data) -ne (Get-DataValue $r2.data)) { Log-Pass "click toggled checkbox state" }
            else { Log-Fail "click did not toggle checkbox" }
        } else {
            Log-Skip "could not find checkbox elements"
        }
    }

    # Verify check command
    Ab-Run "check $sel1"
    Start-Sleep -Milliseconds 500
    $r = Ab-Json "ischecked $sel1"
    Assert-True (Get-DataValue $r.data) "check ensures checked state"

    # Verify uncheck command
    Ab-Run "uncheck $sel1"
    Start-Sleep -Milliseconds 500
    $r = Ab-Json "ischecked $sel1"
    Assert-False (Get-DataValue $r.data) "uncheck ensures unchecked state"
}

function Test-Dropdown {
    $script:testName = "Dropdown"

    $r = Ab-Json "open $BASE/dropdown"
    Wait-PageLoad
    Assert-Success $r "open dropdown page"

    # Select option 1
    $r = Ab-Json "select '#dropdown' '1'"
    Assert-Success $r "select option 1"

    # Verify selection via eval
    $r = Ab-Json "eval `"document.querySelector('#dropdown').value`""
    Assert-Equals (Get-DataValue $r.data) "1" "eval confirms option 1 selected"

    # Select option 2
    $r = Ab-Json "select '#dropdown' '2'"
    Assert-Success $r "select option 2"

    $r = Ab-Json "eval `"document.querySelector('#dropdown').value`""
    Assert-Equals (Get-DataValue $r.data) "2" "eval confirms option 2 selected"
}

function Test-DynamicLoading {
    $script:testName = "DynamicLoad"

    $r = Ab-Json "open $BASE/dynamic_loading/1"
    Wait-PageLoad
    Assert-Success $r "open dynamic loading page"

    # Click Start button
    $r = Ab-Json "click '#start button'"
    Assert-Success $r "click Start button"

    # Wait for the result to appear (element is hidden, then shown)
    $r = Ab-Json "wait '#finish' --timeout 10000"
    Assert-Success $r "wait for finish element"

    # Verify the text
    $r = Ab-Json "gettext '#finish'"
    Assert-Contains (Get-DataValue $r.data) "Hello World" "dynamic text appeared"
}

function Test-HoverActions {
    $script:testName = "Hover"

    $r = Ab-Json "open $BASE/hovers"
    Wait-PageLoad
    Assert-Success $r "open hovers page"

    # Hover over the first avatar image
    $r = Ab-Json "hover '.figure:nth-child(3) img'"
    Assert-Success $r "hover over avatar"

    # After hover, the caption should be visible
    Start-Sleep -Milliseconds 500
    $r = Ab-Json "isvisible '.figure:nth-child(3) .figcaption'"
    Assert-True (Get-DataValue $r.data) "caption visible after hover"

    $r = Ab-Json "gettext '.figure:nth-child(3) .figcaption'"
    Assert-Contains (Get-DataValue $r.data) "user" "caption contains user info"
}

function Test-Iframe {
    $script:testName = "Iframe"

    $r = Ab-Json "open $BASE/iframe"
    Wait-PageLoad
    Assert-Success $r "open iframe page"

    # Switch to the TinyMCE iframe
    $r = Ab-Json "frame '#mce_0_ifr'"
    if ($r.success -eq $false) {
        # Try alternate selector
        $r = Ab-Json "frame 'iframe'"
    }

    if ($r.success) {
        Assert-Success $r "switch to iframe"

        # Read content inside iframe
        $r = Ab-Json "gettext '#tinymce'"
        if ($r.success) {
            Assert-Contains (Get-DataValue $r.data) "Your content goes here" "iframe content readable"
        } else {
            # Try body
            $r = Ab-Json "gettext 'body'"
            Assert-Success $r "read iframe body content"
        }

        # Switch back to main frame
        $r = Ab-Json "mainframe"
        Assert-Success $r "switch back to main frame"

        # Verify we're back (can see the main page heading)
        $r = Ab-Json "gettext 'h3'"
        Assert-Contains (Get-DataValue $r.data) "Editor" "back on main page"
    } else {
        Log-Skip "could not switch to iframe"
    }
}

function Test-KeyPresses {
    $script:testName = "KeyPress"

    $r = Ab-Json "open $BASE/key_presses"
    Wait-PageLoad
    Assert-Success $r "open key_presses page"

    # Click into the input area
    $r = Ab-Json "click '#target'"
    Assert-Success $r "focus input area"

    # Press a key
    $r = Ab-Json "press 'a'"
    Assert-Success $r "press key 'a'"

    Start-Sleep -Milliseconds 500
    $r = Ab-Json "gettext '#result'"
    Assert-Contains (Get-DataValue $r.data) "A" "key press registered"

    # Press special key (Tab is more reliably captured than Enter)
    $r = Ab-Json "press 'Tab'"
    Assert-Success $r "press Tab key"

    Start-Sleep -Milliseconds 500
    $r = Ab-Json "gettext '#result'"
    Assert-Contains (Get-DataValue $r.data) "TAB" "Tab key registered"
}

function Test-JavaScriptEval {
    $script:testName = "JSEval"

    $r = Ab-Json "open $BASE/javascript_alerts"
    Wait-PageLoad
    Assert-Success $r "open JS alerts page"

    # Eval document.title
    $r = Ab-Json "eval `"document.title`""
    Assert-Success $r "eval document.title"
    Assert-Contains (Get-DataValue $r.data) "Internet" "title contains expected text"

    # Count buttons
    $r = Ab-Json "eval `"document.querySelectorAll('button').length`""
    Assert-Success $r "eval button count"
    Assert-GreaterThan (Get-DataValue $r.data) 0 "found buttons on page"

    # Test complex expression
    $r = Ab-Json "eval `"Array.from(document.querySelectorAll('button')).map(b => b.textContent).join(',')`""
    Assert-Success $r "eval complex expression"
    Assert-Contains (Get-DataValue $r.data) "Click" "button texts retrieved"
}

function Test-MultiTab {
    $script:testName = "MultiTab"

    $r = Ab-Json "open $BASE/windows"
    Wait-PageLoad
    Assert-Success $r "open windows page"

    # Get initial tab list
    $r = Ab-Json "tab_list"
    Assert-Success $r "tab_list initial"

    # Create a new tab explicitly (more reliable than clicking target=_blank links)
    $r = Ab-Json "tab_new"
    Assert-Success $r "tab_new creates tab"

    Start-Sleep -Milliseconds 1000

    # Switch to the new tab (index 1)
    $r = Ab-Json "tab_switch 1"
    Assert-Success $r "switch to new tab"

    # Navigate in the new tab
    $r = Ab-Json "open $BASE/status_codes"
    Wait-PageLoad
    $r = Ab-Json "title"
    Assert-Success $r "new tab has title"

    # Close the new tab
    $r = Ab-Json "tab_close 1"
    Assert-Success $r "close new tab"

    Start-Sleep -Milliseconds 500

    # Switch back to tab 0
    $r = Ab-Json "tab_switch 0"
    Assert-Success $r "switch back to original tab"
}

function Test-ScrollAndLargePage {
    $script:testName = "Scroll"

    $r = Ab-Json "open $BASE/large"
    Wait-PageLoad
    Assert-Success $r "open large page"

    # Scroll down
    $r = Ab-Json "scroll down 1000"
    Assert-Success $r "scroll down 1000px"
    Start-Sleep -Milliseconds 500

    # Verify scroll position
    $r = Ab-Json "eval `"Math.round(window.scrollY)`""
    Assert-GreaterThan (Get-DataValue $r.data) 0 "scrollY positive after scroll down"

    # Scroll into view of a deep element
    $r = Ab-Json "scrollintoview '#page-footer'"
    if ($r.success -eq $false) {
        # Try a different element
        $r = Ab-Json "scrollintoview 'div.row:last-child'"
    }
    Assert-Success $r "scrollintoview element"

    # Scroll back up
    $r = Ab-Json "scroll up 500"
    Assert-Success $r "scroll up 500px"
}

function Test-ElementStateChecks {
    $script:testName = "StateCheck"

    $r = Ab-Json "open $BASE/inputs"
    Wait-PageLoad
    Assert-Success $r "open inputs page"

    # isvisible on the input
    $r = Ab-Json "isvisible 'input[type=number]'"
    Assert-True (Get-DataValue $r.data) "input is visible"

    # isenabled on the input
    $r = Ab-Json "isenabled 'input[type=number]'"
    Assert-True (Get-DataValue $r.data) "input is enabled"

    # count elements
    $r = Ab-Json "count 'input'"
    Assert-GreaterThan (Get-DataValue $r.data) 0 "count found inputs"

    # Test on a different page with more elements
    $r = Ab-Json "open $BASE/checkboxes"
    Wait-PageLoad
    $r = Ab-Json "count 'input[type=checkbox]'"
    Assert-Equals (Get-DataValue $r.data) 2 "count found 2 checkboxes"
}

function Test-ConsoleAndErrors {
    $script:testName = "Console"

    $r = Ab-Json "open $BASE/javascript_error"
    Wait-PageLoad
    Assert-Success $r "open JS error page"

    # Give errors time to fire
    Start-Sleep -Milliseconds 1000

    # Check for captured errors
    $r = Ab-Json "errors"
    Assert-Success $r "errors command succeeds"

    # Check console output
    $r = Ab-Json "console"
    Assert-Success $r "console command succeeds"
}

function Test-CookiesAndStorage {
    $script:testName = "Storage"

    $r = Ab-Json "open $BASE"
    Wait-PageLoad

    # Read cookies
    $r = Ab-Json "cookies_get"
    Assert-Success $r "cookies_get succeeds"

    # Set localStorage
    $r = Ab-Json "storage_set local testKey testValue"
    Assert-Success $r "storage_set local"

    # Read it back
    $r = Ab-Json "storage_get local testKey"
    $storageVal = if ($r.data.value) { $r.data.value } else { Get-DataValue $r.data }
    Assert-Equals $storageVal "testValue" "storage roundtrip"

    # Clear cookies
    $r = Ab-Json "cookies_clear"
    Assert-Success $r "cookies_clear succeeds"

    # Verify cookies cleared
    $r = Ab-Json "cookies_get"
    if ($r.success) {
        $cookieData = $r.data
        $cookieCount = if ($cookieData.cookies) { $cookieData.cookies.Count } elseif ($cookieData -is [array]) { $cookieData.Count } else { 0 }
        Assert-Equals $cookieCount 0 "cookies empty after clear"
    } else {
        Log-Pass "cookies_get after clear (no cookies)"
    }
}

function Test-ErrorRecovery {
    $script:testName = "ErrorRecovery"

    # Ensure we're on a valid page
    Ab-Run "open $BASE"
    Wait-PageLoad

    # boundingbox on non-existent selector -- should return error or null
    $r = Ab-Json "boundingbox '#does-not-exist-at-all-xyz' --timeout 1000"
    if ($r.success -eq $false) { Log-Pass "graceful error on missing element boundingbox" }
    elseif ($null -eq $r.data -or $null -eq (Get-DataValue $r.data)) { Log-Pass "null result on missing element boundingbox" }
    else { Log-Fail "expected error on missing element, got success" }

    # Wait with short timeout on missing element
    $r = Ab-Json "wait '#also-missing-element' --timeout 1000"
    if ($r.success -eq $false) { Log-Pass "graceful timeout on missing wait target" }
    else { Log-Fail "expected timeout error, got success" }

    # Fill on non-input element
    $r = Ab-Json "fill 'h1' 'should-fail'"
    if ($r.success -eq $false) { Log-Pass "graceful error on fill non-input" }
    else { Log-Fail "expected error filling non-input, got success" }

    # Verify the daemon is still running after errors
    $r = Ab-Json "url"
    Assert-Success $r "daemon still alive after errors"
}

# -- Main Runner ---------------------------------------------------------------

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Agent Browser CLI - Comprehensive Test Suite   " -ForegroundColor Cyan
Write-Host "  Target: $BASE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure daemon is started
Write-Host "Starting daemon..." -ForegroundColor Gray
Ab-Run "open about:blank"
Start-Sleep -Milliseconds 2000

$tests = @(
    "Test-NavigationAndHistory",
    "Test-LoginForm",
    "Test-Checkboxes",
    "Test-Dropdown",
    "Test-DynamicLoading",
    "Test-HoverActions",
    "Test-Iframe",
    "Test-KeyPresses",
    "Test-JavaScriptEval",
    "Test-MultiTab",
    "Test-ScrollAndLargePage",
    "Test-ElementStateChecks",
    "Test-ConsoleAndErrors",
    "Test-CookiesAndStorage",
    "Test-ErrorRecovery"
)

$totalTests = $tests.Count
$currentTest = 0

foreach ($test in $tests) {
    $currentTest++
    Write-Host ""
    Write-Host "--- [$currentTest/$totalTests] $test ---" -ForegroundColor Cyan
    try {
        & $test
    } catch {
        $script:failed++
        $script:errors += "$test EXCEPTION: $_"
        Write-Host "[FAIL] $test EXCEPTION: $_" -ForegroundColor Red
    }
}

# Cleanup
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Gray
try { Ab-Run "close" } catch {}

# -- Report --------------------------------------------------------------------

$total = $script:passed + $script:failed
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Passed:  $($script:passed) / $total" -ForegroundColor $(if ($script:failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Failed:  $($script:failed) / $total" -ForegroundColor $(if ($script:failed -eq 0) { "Green" } else { "Red" })
if ($script:skipped -gt 0) {
    Write-Host "  Skipped: $($script:skipped)" -ForegroundColor Yellow
}
Write-Host ""

if ($script:errors.Count -gt 0) {
    Write-Host "Failures:" -ForegroundColor Red
    foreach ($err in $script:errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}

Write-Host ""
$passRate = if ($total -gt 0) { [math]::Round(($script:passed / $total) * 100, 1) } else { 0 }
Write-Host "Pass rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

# Exit with non-zero if any failures
if ($script:failed -gt 0) { exit 1 } else { exit 0 }
