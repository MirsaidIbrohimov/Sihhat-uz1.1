param([ValidateSet('start', 'status', 'stop')][string]$Action = 'start')

$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimePath = Join-Path $workspacePath '.local/runtime'
$nodePath = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$services = @(
    @{ Name = 'api'; Entry = 'apps/api/dist/src/main.js'; Cwd = 'apps/api'; Args = @(); Url = 'http://127.0.0.1:4000/health/ready' },
    @{ Name = 'worker'; Entry = 'apps/api/dist/src/worker.js'; Cwd = 'apps/api'; Args = @(); Url = $null },
    @{ Name = 'superadmin'; Entry = 'node_modules/next/dist/bin/next'; Cwd = 'apps/superadmin-web'; Args = @('start', '--hostname', '127.0.0.1', '--port', '3000'); Url = 'http://127.0.0.1:3000' },
    @{ Name = 'director'; Entry = 'node_modules/next/dist/bin/next'; Cwd = 'apps/partner-web'; Args = @('start', '--hostname', '127.0.0.1', '--port', '3001'); Url = 'http://127.0.0.1:3001' }
)

function Get-OwnedProcess($Service) {
    $markerPath = Join-Path $runtimePath ($Service.Name + '.json')
    if (-not (Test-Path -LiteralPath $markerPath)) { return $null }
    $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
    $ownedProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$marker.pid)
    if (-not $ownedProcess) { return $null }
    $entryPath = Join-Path $workspacePath $Service.Entry
    $createdAt = $ownedProcess.CreationDate.ToUniversalTime().ToString('o')
    if ($ownedProcess.Name -ne 'node.exe' -or
        -not $ownedProcess.CommandLine.Contains($entryPath) -or
        $createdAt -ne $marker.created_at -or
        $marker.workspace -ne $workspacePath) {
        throw ('Process ownership check failed: ' + $Service.Name)
    }
    foreach ($argument in $Service.Args) {
        if (-not $ownedProcess.CommandLine.Contains($argument)) {
            throw ('Process arguments do not match: ' + $Service.Name)
        }
    }
    return $ownedProcess
}

function Test-Ready($Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch { return $false }
}

if ($Action -eq 'start') {
    New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
    foreach ($service in $services) {
        if (-not (Test-Path -LiteralPath (Join-Path $workspacePath $service.Entry))) {
            throw ('Build missing for ' + $service.Name + '. Run npm run build:api and npm run build:web.')
        }
        if ($service.Name -in @('superadmin', 'director') -and
            -not (Test-Path -LiteralPath (Join-Path $workspacePath ($service.Cwd + '/.next/BUILD_ID')))) {
            throw ('Web build missing for ' + $service.Name + '. Run npm run build:web.')
        }
    }
    Push-Location $workspacePath
    try {
        & node (Join-Path $PSScriptRoot 'local-postgres.mjs') start
        if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL did not start.' }
    } finally { Pop-Location }
}

foreach ($service in $services) {
    $ownedProcess = Get-OwnedProcess $service
    if ($Action -eq 'stop') {
        if ($ownedProcess) {
            Stop-Process -Id $ownedProcess.ProcessId
            Write-Output ($service.Name + ': stopped')
        } else { Write-Output ($service.Name + ': already stopped') }
        continue
    }
    if ($Action -eq 'start' -and -not $ownedProcess) {
        if ($service.Url -and (Test-Ready $service.Url)) {
            throw ('Port already serves another process: ' + $service.Name + '. Existing process was left running.')
        }
        $entryPath = Join-Path $workspacePath $service.Entry
        $arguments = @(('"' + $entryPath + '"')) + $service.Args
        $started = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory (Join-Path $workspacePath $service.Cwd) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath ($service.Name + '.log')) -RedirectStandardError (Join-Path $runtimePath ($service.Name + '-error.log')) -PassThru
        $ownedProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $started.Id)
        if (-not $ownedProcess) { throw ('Service exited during startup: ' + $service.Name) }
        @{ pid = $started.Id; workspace = $workspacePath; created_at = $ownedProcess.CreationDate.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimePath ($service.Name + '.json')) -Encoding UTF8
    }
    if ($Action -eq 'start' -and $ownedProcess) {
        $deadline = (Get-Date).AddSeconds(45)
        if ($service.Url) {
            while (-not (Test-Ready $service.Url)) {
                if (-not (Get-OwnedProcess $service) -or (Get-Date) -gt $deadline) {
                    throw ('Readiness failed for ' + $service.Name + '. Inspect .local/runtime logs.')
                }
                Start-Sleep -Milliseconds 500
            }
        } else {
            Start-Sleep -Milliseconds 750
            if (-not (Get-OwnedProcess $service)) { throw ('Worker did not stay running: ' + $service.Name) }
        }
    }
    $state = if (-not $ownedProcess) { 'stopped' } elseif ($service.Url -and -not (Test-Ready $service.Url)) { 'not ready' } else { 'running' }
    Write-Output ($service.Name + ': ' + $state + $(if ($service.Url) { ' - ' + $service.Url } else { '' }))
}

if ($Action -eq 'start') {
    $adbPath = if ($env:ANDROID_HOME) { Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe' } elseif ($env:ANDROID_SDK_ROOT) { Join-Path $env:ANDROID_SDK_ROOT 'platform-tools/adb.exe' } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe' }
    if (Test-Path -LiteralPath $adbPath) {
        $devices = & $adbPath devices
        foreach ($line in $devices) {
            if ($line -match '^([A-Za-z0-9._:-]+)\s+device$') {
                & $adbPath -s $Matches[1] reverse tcp:4000 tcp:4000 | Out-Null
                if ($LASTEXITCODE -ne 0) { throw 'Android USB connection setup failed.' }
                Write-Output 'Android USB API connection: ready'
            }
        }
    }
    Write-Output 'Local services stay running until local:stop, sign-out, or shutdown. PostgreSQL remains running after local:stop.'
}
