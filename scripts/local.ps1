[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("setup", "start", "stop", "status", "superuser")]
  [string]$Command,
  [string]$Email,
  [string]$Password
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Local = Join-Path $Root ".local"
$Bin = Join-Path $Local "bin"
$Logs = Join-Path $Local "logs"
$Pids = Join-Path $Local "pids"
$PocketBase = Join-Path $Bin "pocketbase\pocketbase.exe"
$LiveKit = Join-Path $Bin "livekit\livekit-server.exe"
$LiveKitVersion = "1.13.5"
$PocketBaseData = Join-Path $Local "pocketbase\pb_data"
$StandaloneWebDirectory = Join-Path $Root "apps\web\.next\standalone\apps\web"
$StandaloneWebServer = Join-Path $StandaloneWebDirectory "server.js"

function Import-LocalEnvironment {
  $environmentFile = Join-Path $Root "apps\web\.env.local"
  if (!(Test-Path -LiteralPath $environmentFile)) { throw "Missing $environmentFile. Copy apps/web/.env.example first." }
  Get-Content -LiteralPath $environmentFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2] }
  }
}

function Ensure-Directory([string]$Path) { if (!(Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null } }

function Sync-StandaloneWebAssets {
  if (!(Test-Path -LiteralPath $StandaloneWebServer)) { throw "Missing standalone Next.js server after build: $StandaloneWebServer" }
  $staticSource = Join-Path $Root "apps\web\.next\static"
  if (!(Test-Path -LiteralPath $staticSource)) { throw "Missing Next.js static assets after build: $staticSource" }
  $standaloneNextDirectory = Join-Path $StandaloneWebDirectory ".next"
  Ensure-Directory $standaloneNextDirectory
  Copy-Item -LiteralPath $staticSource -Destination $standaloneNextDirectory -Recurse -Force
  $publicSource = Join-Path $Root "apps\web\public"
  if (Test-Path -LiteralPath $publicSource) { Copy-Item -LiteralPath $publicSource -Destination $StandaloneWebDirectory -Recurse -Force }
}

function Download-NativeBinaries {
  Ensure-Directory $Bin
  if (!(Test-Path -LiteralPath $PocketBase)) {
    $archive = Join-Path $Local "pocketbase.zip"
    Ensure-Directory (Split-Path $PocketBase)
    Invoke-WebRequest -Uri "https://github.com/pocketbase/pocketbase/releases/download/v0.39.8/pocketbase_0.39.8_windows_amd64.zip" -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath (Split-Path $PocketBase) -Force
    Remove-Item -LiteralPath $archive -Force
  }
  $downloadLiveKit = !(Test-Path -LiteralPath $LiveKit)
  if (!$downloadLiveKit) {
    $installedLiveKitVersion = (& $LiveKit --version 2>&1 | Out-String)
    $downloadLiveKit = $installedLiveKitVersion -notmatch [regex]::Escape($LiveKitVersion)
  }
  if ($downloadLiveKit) {
    $archive = Join-Path $Local "livekit.zip"
    Ensure-Directory (Split-Path $LiveKit)
    Invoke-WebRequest -Uri "https://github.com/livekit/livekit/releases/download/v$LiveKitVersion/livekit_${LiveKitVersion}_windows_amd64.zip" -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath (Split-Path $LiveKit) -Force
    Remove-Item -LiteralPath $archive -Force
  }
}

function Write-Pid($Process, [string]$Name) { Set-Content -LiteralPath (Join-Path $Pids "$Name.pid") -Value $Process.Id -NoNewline }

function Test-NativeProcessRunning([string]$Name) {
  $pidFile = Join-Path $Pids "$Name.pid"
  if (!(Test-Path -LiteralPath $pidFile)) { return $false }
  $processId = Get-Content -LiteralPath $pidFile
  return $null -ne (Get-Process -Id $processId -ErrorAction SilentlyContinue)
}

function Start-NativeProcess([string]$Name, [string]$FilePath, [string[]]$Arguments) {
  $pidFile = Join-Path $Pids "$Name.pid"
  if (Test-Path -LiteralPath $pidFile) {
    $existingId = Get-Content -LiteralPath $pidFile
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) { return }
    Remove-Item -LiteralPath $pidFile -Force
  }
  $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $Root -RedirectStandardOutput (Join-Path $Logs "$Name.out.log") -RedirectStandardError (Join-Path $Logs "$Name.err.log") -WindowStyle Hidden -PassThru
  Write-Pid $process $Name
}

function Stop-NativeProcess([string]$Name) {
  $pidFile = Join-Path $Pids "$Name.pid"
  if (!(Test-Path -LiteralPath $pidFile)) { return }
  $processId = Get-Content -LiteralPath $pidFile
  if (Get-Process -Id $processId -ErrorAction SilentlyContinue) { & taskkill.exe /PID $processId /T /F | Out-Null }
  Remove-Item -LiteralPath $pidFile -Force
}

function Wait-ForHttp([string]$Url) {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try { if ((Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2).StatusCode -eq 200) { return } } catch {}
    Start-Sleep -Seconds 1
  }
  throw "Service did not become ready: $Url"
}

switch ($Command) {
  "setup" {
    Ensure-Directory $Local; Ensure-Directory $Logs; Ensure-Directory $Pids; Ensure-Directory $PocketBaseData
    Download-NativeBinaries
    if (!(Test-Path -LiteralPath (Join-Path $Root "node_modules"))) { & pnpm.cmd install --frozen-lockfile }
    Write-Output "Native local prerequisites are ready in .local/."
  }
  "start" {
    & $PSCommandPath setup
    $runningServices = @("pocketbase", "livekit", "web", "notifications", "livekit-lifecycle" | Where-Object { Test-NativeProcessRunning $_ })
    if ($runningServices.Count) {
      throw "Local services are already running ($($runningServices -join ', ')). Run 'pnpm local:stop' before rebuilding."
    }
    Import-LocalEnvironment
    $migrationOutput = & $PocketBase migrate up --dir=$PocketBaseData --migrationsDir=$(Join-Path $Root 'services\pocketbase\pb_migrations') --automigrate=false 2>&1
    $migrationOutput | Write-Output
    if ($LASTEXITCODE -ne 0 -or ($migrationOutput -join "`n") -match "(?m)^Error:") { throw "PocketBase migrations failed" }
    Start-NativeProcess "pocketbase" $PocketBase @("serve", "--dev", "--http=127.0.0.1:8090", "--dir=$PocketBaseData", "--migrationsDir=$(Join-Path $Root 'services\pocketbase\pb_migrations')", "--hooksDir=$(Join-Path $Root 'services\pocketbase\pb_hooks')", "--automigrate=false")
    Start-NativeProcess "livekit" $LiveKit @("--config", (Join-Path $Root "infra\local\livekit.native.yaml"))
    Wait-ForHttp "http://127.0.0.1:8090/api/health"
    & pnpm.cmd build
    if ($LASTEXITCODE -ne 0) { throw "Next.js production build failed" }
    Sync-StandaloneWebAssets
    $env:HOSTNAME = "127.0.0.1"; $env:PORT = "3000"
    Start-NativeProcess "web" "node.exe" @($StandaloneWebServer)
    Wait-ForHttp "http://127.0.0.1:3000/"
    Start-NativeProcess "notifications" "node.exe" @("--env-file=apps/web/.env.local", "scripts/notification-worker.mjs")
    Start-NativeProcess "livekit-lifecycle" "node.exe" @("--env-file=apps/web/.env.local", "scripts/livekit-lifecycle-worker.mjs")
    Write-Output "NiceToMeetU is running at http://127.0.0.1:3000 (production Next mode)."
  }
  "stop" { "livekit-lifecycle", "notifications", "web", "livekit", "pocketbase" | ForEach-Object { Stop-NativeProcess $_ }; Write-Output "Native local services stopped." }
  "status" {
    "pocketbase", "livekit", "web", "notifications", "livekit-lifecycle" | ForEach-Object {
      $pidFile = Join-Path $Pids "$_.pid"; $pidValue = if (Test-Path -LiteralPath $pidFile) { Get-Content -LiteralPath $pidFile } else { "-" }
      Write-Output "$_ : $pidValue"
    }
  }
  "superuser" {
    if (!$Email -or !$Password) { throw "Use: ./scripts/local.ps1 superuser -Email you@example.test -Password a-long-password" }
    if (!(Test-Path -LiteralPath $PocketBase)) { throw "Run ./scripts/local.ps1 setup first." }
    & $PocketBase superuser create $Email $Password --dir=$PocketBaseData
  }
}
