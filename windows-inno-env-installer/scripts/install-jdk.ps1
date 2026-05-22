param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot,
    [Parameter(Mandatory = $true)]
    [string]$ResultFile
)

$ErrorActionPreference = 'Stop'

function Write-Result($Status, $Message) {
    @($Status, $Message) | Set-Content -LiteralPath $ResultFile -Encoding UTF8
}

try {
    New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

    $ext = [IO.Path]::GetExtension(([uri]$Url).AbsolutePath)
    if (-not $ext) { $ext = '.zip' }
    $zip = Join-Path $env:TEMP ('installer_jdk_' + [guid]::NewGuid().ToString('N') + $ext)

    Write-Host "Downloading JDK..."
    Invoke-WebRequest -Uri $Url -OutFile $zip -UseBasicParsing

    if ($ext -ieq '.zip') {
        Write-Host "Extracting..."
        Expand-Archive -LiteralPath $zip -DestinationPath $InstallRoot -Force
        $java = Get-ChildItem -LiteralPath $InstallRoot -Recurse -Filter 'java.exe' |
            Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
            Select-Object -First 1
        if ($null -eq $java) { throw 'java.exe not found after extract' }
        $javaHome = Split-Path (Split-Path $java.FullName -Parent) -Parent
    } elseif ($ext -ieq '.msi') {
        $args = "/i `"$zip`" /qn /norestart INSTALLDIR=`"$InstallRoot`""
        $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList $args -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "msiexec exit $($p.ExitCode)" }
        $java = Get-ChildItem -LiteralPath $InstallRoot -Recurse -Filter 'java.exe' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\bin\\java\.exe$' } |
            Select-Object -First 1
        if ($null -eq $java) { $javaHome = $InstallRoot } else { $javaHome = Split-Path (Split-Path $java.FullName -Parent) -Parent }
    } else {
        throw "Unsupported package type: $ext"
    }

    $javaHome = $javaHome.TrimEnd('\')
    [Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $binEntry = "$javaHome\bin"
    $hasBin = $false
    if ($userPath) {
        foreach ($part in $userPath.Split(';')) {
            if ($part.Trim().TrimEnd('\').ToLower() -eq $binEntry.ToLower()) { $hasBin = $true; break }
        }
    }
    if (-not $hasBin) {
        if ($userPath) { $userPath = "$binEntry;$userPath" } else { $userPath = $binEntry }
        [Environment]::SetEnvironmentVariable('Path', $userPath, 'User')
    }

    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
    Write-Result 'OK' $javaHome
    exit 0
}
catch {
    Write-Result 'FAIL' $_.Exception.Message
    exit 1
}
