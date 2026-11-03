<#
  Make a Desktop shortcut for Shad's Build Guide, with the guide's icon.

  Double-click the shortcut and it does what "Start Guide Assistant.cmd" does: starts the small local
  guide server if it is not running, then opens http://localhost:8790/ in the browser. The first time it is
  open in Chrome or Edge, use the "Install app" button on the page to get a window of its own that also works offline.

  Run it from the repo folder:
      powershell -ExecutionPolicy Bypass -File scripts\standalone\make-shortcut.ps1

  Options (all optional):
      -Folder  where to put the shortcut   (default: your Desktop)
      -Target  the .cmd that starts it     (default: "Start Guide Assistant.cmd" in THIS repo folder)
      -Icon    the .ico to show            (default: docs\icons\favicon.ico in this repo folder)
      -Name    the shortcut's name         (default: Shad's Build Guide)

  It only creates (or overwrites) that one .lnk file. It does not delete or move anything.
  If the repo folder moves or the branch is merged into another folder, run it again with -Target pointing
  at the new "Start Guide Assistant.cmd".
#>
param(
  [string]$Folder = [Environment]::GetFolderPath("Desktop"),
  [string]$Target = "",
  [string]$Icon = "",
  [string]$Name = "Shad's Build Guide"
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $Target) { $Target = Join-Path $repo "Start Guide Assistant.cmd" }
if (-not $Icon)   { $Icon   = Join-Path $repo "docs\icons\favicon.ico" }

if (-not (Test-Path -LiteralPath $Target)) { throw "Cannot find the launcher: $Target" }
if (-not (Test-Path -LiteralPath $Icon))   { throw "Cannot find the icon: $Icon (run: python scripts\standalone\make-icons.py)" }
if (-not (Test-Path -LiteralPath $Folder)) { throw "Cannot find the folder: $Folder" }

$link = Join-Path $Folder ($Name + ".lnk")
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath       = (Resolve-Path -LiteralPath $Target).Path
$sc.WorkingDirectory = Split-Path -Parent (Resolve-Path -LiteralPath $Target).Path
$sc.IconLocation     = (Resolve-Path -LiteralPath $Icon).Path + ",0"
$sc.WindowStyle      = 7          # minimised: the launcher's console window stays out of the way
$sc.Description      = "Open Shad's Build Guide"
$sc.Save()

$check = $shell.CreateShortcut($link)
"Created: $link"
"  opens:     " + $check.TargetPath
"  icon:      " + $check.IconLocation
"  runs in:   " + $check.WorkingDirectory
