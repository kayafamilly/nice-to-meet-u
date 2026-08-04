param(
  [string]$TargetUrl = "http://127.0.0.1:3000",
  [int]$VirtualUsers = 10,
  [int]$DurationSeconds = 30
)

$k6 = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6) {
  throw "k6 is required for load validation. Install it from https://grafana.com/docs/k6/latest/set-up/install-k6/."
}

$env:NTMY_TARGET_URL = $TargetUrl
$env:NTMY_VUS = "$VirtualUsers"
$env:NTMY_DURATION = "${DurationSeconds}s"
& $k6.Source run "$PSScriptRoot\sessions.js"
