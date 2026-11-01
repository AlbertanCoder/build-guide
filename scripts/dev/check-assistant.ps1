# Runs the Guide Assistant self-test in headless Chrome/Edge and prints the results.
#
#   powershell -NoProfile -File scripts/dev/check-assistant.ps1
#   powershell -NoProfile -File scripts/dev/check-assistant.ps1 -Target "http://127.0.0.1:8899/index.html"
#   powershell -NoProfile -File scripts/dev/check-assistant.ps1 -Target "dist/Shad's Build Guide.html"
#
# The page's own self-test lives in docs/js/assistant.js and runs when the URL
# contains "ga-selftest". This script just loads the page with that flag and
# scrapes the <pre id="ga-selftest"> block it writes.
param(
  [string]$Target = "index.html",
  [int]$WaitMs = 8000
)

$ErrorActionPreference = 'Continue'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$browser = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $browser) { throw 'No Chrome or Edge found for the headless check.' }

if ($Target -match '^https?://') {
  $url = $Target
} else {
  $path = if ([System.IO.Path]::IsPathRooted($Target)) { $Target } else { Join-Path $repo $Target }
  if (-not (Test-Path -LiteralPath $path)) { throw "Target not found: $path" }
  $url = ([System.Uri](Resolve-Path -LiteralPath $path).Path).AbsoluteUri
}

$sep = if ($url.Contains('#')) { '&' } else { '#' }
$url = $url + $sep + 'ga-selftest'

$stamp = [guid]::NewGuid().ToString('N').Substring(0, 8)
$dom = Join-Path $env:TEMP "ga-selftest-dom-$stamp.html"
$log = Join-Path $env:TEMP "ga-selftest-browser-$stamp.log"

& $browser --headless=new --disable-gpu --no-sandbox --virtual-time-budget=$WaitMs `
  --allow-file-access-from-files --dump-dom $url 2>$log | Out-File -FilePath $dom -Encoding utf8

$html = Get-Content -LiteralPath $dom -Raw
$m = [regex]::Match($html, '(?s)<pre id="ga-selftest">(.*?)</pre>')

if (-not $m.Success) {
  Write-Host 'FAIL: the self-test block was never written.' -ForegroundColor Red
  Write-Host 'Page length: ' + $html.Length
  Write-Host '--- browser log tail ---'
  Get-Content -LiteralPath $log -ErrorAction SilentlyContinue | Select-Object -Last 25
  exit 1
}

$results = $m.Groups[1].Value
Write-Host $results
$failed = ([regex]::Matches($results, '(?m)^FAIL ')).Count
if ($failed -gt 0) {
  Write-Host ("`n$failed check(s) failed.") -ForegroundColor Red
  exit 1
}
Write-Host "`nAll checks passed." -ForegroundColor Green
