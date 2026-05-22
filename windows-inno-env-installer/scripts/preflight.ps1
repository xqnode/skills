param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,
    [string]$IssRelative = 'installer\apache-maven-installer.iss',
    [string]$ToolDirName = 'apache-maven-3.8',
    [string[]]$RequiredBin = @('mvn.cmd')
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $ProjectRoot).Path
$fail = 0

function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:fail++ }
function Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }

Write-Host "=== Inno installer preflight ===" -ForegroundColor Cyan

$iscc = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Inno\ISCC.exe",
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($iscc) { Ok "ISCC: $iscc" } else { Fail 'Inno Setup 6 (ISCC.exe) not found' }

$lang = "$env:LOCALAPPDATA\Programs\Inno Setup 6\Languages\ChineseSimplified.isl"
if (Test-Path $lang) { Ok 'ChineseSimplified.isl' } else { Fail "Missing $lang" }

$iss = Join-Path $root $IssRelative
if (Test-Path $iss) { Ok "ISS: $iss" } else { Fail "Missing ISS: $iss" }

$tool = Join-Path $root $ToolDirName
if (-not (Test-Path $tool)) { Fail "Missing tool dir: $tool" }
else {
    Ok "Tool dir: $tool"
    foreach ($b in $RequiredBin) {
        $p = Join-Path $tool "bin\$b"
        if (Test-Path $p) { Ok "bin\$b" } else { Fail "Missing $p" }
    }
    $jars = Get-ChildItem (Join-Path $tool 'lib\maven-*.jar') -ErrorAction SilentlyContinue
    if ($jars.Count -gt 0) { Ok "maven jars: $($jars.Count)" }
    else { Fail 'No lib\maven-*.jar - copy from official bin.zip' }
}

$ps1 = Join-Path $root 'installer\scripts\install-jdk.ps1'
if (Test-Path $ps1) { Ok 'install-jdk.ps1' } else { Fail 'Missing installer\scripts\install-jdk.ps1' }

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "PREFLIGHT FAILED: $fail issue(s). Fix before compile." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "PREFLIGHT OK. Run build-installer.bat or ISCC." -ForegroundColor Green
exit 0
