$ErrorActionPreference = 'Continue'

# End-to-end check of the AI path, with no API key needed:
#   mock OpenAI-compatible provider -> server/assistant-server.js -> the page
#
# The page opens with ?ga-ask=<question>, streams the answer, and POSTs a report
# of what it actually rendered back to /api/probe. This script waits for that
# report and asserts on it, so nothing depends on headless timing heuristics.

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$mockPort = 8791
$appPort = 8792
$chrome = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chrome) { throw 'No Chrome or Edge found.' }

function Wait-Http([string]$url, [int]$seconds = 15) {
  for ($i = 0; $i -lt $seconds * 4; $i++) {
    try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { return $true } } catch { }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

$fail = 0
function Check([string]$name, [bool]$ok, [string]$detail = '') {
  if (-not $ok) { $script:fail++ }
  '{0} {1}{2}' -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $name, $(if ($detail) { "  [$detail]" } else { '' })
}

$mock = Start-Process -FilePath 'node' -ArgumentList (Join-Path $repo 'scripts\dev\mock-llm.js'), $mockPort `
  -WorkingDirectory $repo -WindowStyle Hidden -PassThru
$env:PROVIDER = 'openai'
$env:BASE_URL = "http://127.0.0.1:$mockPort/v1"
$env:MODEL = 'mock-model'
$env:API_KEY = 'test-key-not-real'
$env:PORT = "$appPort"
$env:GA_TEST = '1'
$env:SETTINGS_FILE = Join-Path $env:TEMP "ga-llm-path-settings-$PID.json"
$env:CONVERSATIONS_DIR = Join-Path $env:TEMP "ga-llm-path-conversations-$PID"
$app = Start-Process -FilePath 'node' -ArgumentList (Join-Path $repo 'server\assistant-server.js') `
  -WorkingDirectory $repo -WindowStyle Hidden -PassThru
$browser = $null

try {
  if (-not (Wait-Http "http://127.0.0.1:$mockPort/v1/models")) { throw 'mock provider did not start' }
  if (-not (Wait-Http "http://127.0.0.1:$appPort/api/health")) { throw 'assistant server did not start' }

  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/health" -TimeoutSec 5
  "health: provider=$($health.provider) model=$($health.model) keyConfigured=$($health.keyConfigured)"
  Check 'health endpoint reports the provider' ($health.ok -and $health.model -eq 'mock-model')

  # 1. the proxy must refuse to ask a model without retrieved evidence
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/ask" -Method Post `
      -ContentType 'application/json' -Body '{"question":"anything","passages":[]}' -TimeoutSec 10 | Out-Null
    Check 'empty-passage request rejected' $false 'it was accepted'
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Check 'empty-passage request rejected (422)' ($code -eq 422) "got $code"
  }

  # 2. browser -> server -> provider -> stream -> render
  $q = [uri]::EscapeDataString('thermal image is noisy at 8 Hz')
  $url = "http://127.0.0.1:$appPort/index.html?ga-ask=$q#ga-open"
  $browser = Start-Process -FilePath $chrome -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-sandbox', "--user-data-dir=$env:TEMP\ga-profile-$PID", $url
  ) -PassThru -WindowStyle Hidden

  $probe = $null
  for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $r = Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/probe" -TimeoutSec 3
      if ($r.probe) { $probe = $r.probe; break }
    } catch { }
  }

  if (-not $probe) {
    Check 'the page reported a rendered answer' $false 'no report arrived'
  } else {
    Check 'the page reported a rendered answer' $true
    Check 'the answer came from the AI endpoint' ($probe.endpoint -match 'api/(ask|probe)') $probe.endpoint
    # 10 Nov 2026 (Fable audit S4): the server now takes up to 12 passages (it was 6), so 1 to 12 is the valid count
    Check 'retrieval supplied passages before the model call' ($probe.text -match 'Passages received: ([1-9]|1[0-2])\.')
    Check 'answer text streamed into the page' ($probe.chars -gt 120) "chars=$($probe.chars)"
    Check 'markdown list rendered as real list items' ($probe.renderedListItems -ge 3) "li=$($probe.renderedListItems)"
    Check 'NAV directive became a working button' ($probe.renderedLinks -ge 1) "links=$($probe.renderedLinks)"
    Check 'NAV directive was stripped from the prose' (-not $probe.hasNavDirective)
    Check 'streaming finished (card no longer live)' ($probe.stillStreaming -eq 0) "live=$($probe.stillStreaming)"
    Check 'a source is shown under the answer' ($probe.src -match 'guide')
    "  answer: " + $probe.text.Substring(0, [Math]::Min(180, $probe.text.Length))
  }
}
finally {
  foreach ($p in @($browser, $app, $mock)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } }
  Remove-Item Env:PROVIDER, Env:BASE_URL, Env:MODEL, Env:API_KEY, Env:PORT, Env:GA_TEST, Env:SETTINGS_FILE, Env:CONVERSATIONS_DIR -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $env:TEMP "ga-llm-path-conversations-$PID") -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $env:TEMP "ga-profile-$PID") -Recurse -Force -ErrorAction SilentlyContinue
}

if ($fail -gt 0) { "`n$fail check(s) failed."; exit 1 }
"`nAI path verified end to end."
