@echo off
rem Double-click to open the guide with the AI Guide Assistant.
rem Starts this folder's guide server if it is not already running, then opens it in the browser.
rem If a guide server from ANOTHER folder (an older copy) is already running, it says so and stops,
rem instead of opening the wrong copy of the guide.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $h = Invoke-RestMethod http://127.0.0.1:8790/api/health -TimeoutSec 2 } catch { exit 1 }; $here = (Resolve-Path '.').Path.TrimEnd('\'); if (-not $h.folder) { Write-Host 'A guide server from an older copy of the guide is already running.'; exit 2 }; if ($h.folder.TrimEnd('\') -ne $here) { Write-Host ('A guide server from another folder is already running: ' + $h.folder); exit 2 }; exit 0"
if errorlevel 2 (
  echo Close that server's window first, then double-click this file again.
  pause
  exit /b 1
)
if errorlevel 1 (
  start "Guide Assistant server" /min node server\assistant-server.js --allow-write
  powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { Invoke-RestMethod http://127.0.0.1:8790/api/health -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 300 } }; exit 1"
  if errorlevel 1 (
    echo The guide server did not start. Run  node server\assistant-server.js  in this folder to see why.
    pause
    exit /b 1
  )
)
start "" "http://localhost:8790/"
