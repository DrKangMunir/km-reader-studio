@echo off
setlocal EnableExtensions
title KM-Reader Studio - Desktop App Setup
echo ==========================================================
echo  Installing KM-Reader Studio v22 (Desktop Application)
echo ==========================================================
echo.

set "SRC_DIR=%~dp0"
set "APP_DIR=%LOCALAPPDATA%\KM-Reader-Studio"

if not exist "%SRC_DIR%index.html" (
    echo [ERROR] index.html not found in "%SRC_DIR%".
    echo Please place this installer inside your KM-Reader Studio folder
    echo alongside index.html, styles.css, and the js\ folder.
    echo.
    pause
    exit /b 1
)

if not exist "%APP_DIR%" mkdir "%APP_DIR%"
if not exist "%APP_DIR%\js" mkdir "%APP_DIR%\js"

echo [1/4] Copying latest application files...
copy /y "%SRC_DIR%index.html" "%APP_DIR%\index.html" >nul
if exist "%SRC_DIR%styles.css" copy /y "%SRC_DIR%styles.css" "%APP_DIR%\styles.css" >nul
if exist "%SRC_DIR%manifest.json" copy /y "%SRC_DIR%manifest.json" "%APP_DIR%\manifest.json" >nul
if exist "%SRC_DIR%sw.js" copy /y "%SRC_DIR%sw.js" "%APP_DIR%\sw.js" >nul
xcopy /y /q /i "%SRC_DIR%js\*.js" "%APP_DIR%\js\" >nul

echo [2/4] Generating KM-Reader Studio icon...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Add-Type -AssemblyName System.Drawing; " ^
  "$dir = $env:LOCALAPPDATA + '\KM-Reader-Studio'; " ^
  "$bmp = New-Object System.Drawing.Bitmap(64,64); " ^
  "$g = [System.Drawing.Graphics]::FromImage($bmp); " ^
  "$g.SmoothingMode = 'AntiAlias'; " ^
  "$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point(64,64)), [System.Drawing.Color]::FromArgb(220,38,38), [System.Drawing.Color]::FromArgb(67,56,202)); " ^
  "$g.FillRectangle($brush, 0, 0, 64, 64); " ^
  "$font = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold); " ^
  "$g.DrawString('KM', $font, [System.Drawing.Brushes]::White, 6, 16); " ^
  "$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon()); " ^
  "$fs = [System.IO.File]::OpenWrite((Join-Path $dir 'km-reader.ico')); " ^
  "$icon.Save($fs); $fs.Close(); $g.Dispose(); $bmp.Dispose();"

echo [3/4] Detecting browser runtime and creating shortcuts...
set "BROWSER_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$dir = Join-Path $env:LOCALAPPDATA 'KM-Reader-Studio'; " ^
  "$htmlPath = Join-Path $dir 'index.html'; " ^
  "$uri = ([System.Uri]$htmlPath).AbsoluteUri; " ^
  "$ico = Join-Path $dir 'km-reader.ico'; " ^
  "$browser = $env:BROWSER_EXE; " ^
  "$targets = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'KM-Reader Studio.lnk'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\KM-Reader Studio.lnk')); " ^
  "foreach ($lnk in $targets) { " ^
  "  $s = $ws.CreateShortcut($lnk); " ^
  "  if ($browser -and (Test-Path -LiteralPath $browser)) { " ^
  "    $s.TargetPath = $browser; " ^
  "    $s.Arguments = '--app=' + $uri; " ^
  "  } else { " ^
  "    $s.TargetPath = $htmlPath; " ^
  "  } " ^
  "  $s.WorkingDirectory = $dir; " ^
  "  if (Test-Path -LiteralPath $ico) { $s.IconLocation = $ico + ',0'; } " ^
  "  $s.Save(); " ^
  "}"

echo [4/4] Launching KM-Reader Studio...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = Join-Path $env:LOCALAPPDATA 'KM-Reader-Studio'; " ^
  "$htmlPath = Join-Path $dir 'index.html'; " ^
  "$uri = ([System.Uri]$htmlPath).AbsoluteUri; " ^
  "$browser = $env:BROWSER_EXE; " ^
  "if ($browser -and (Test-Path -LiteralPath $browser)) { " ^
  "  Start-Process -FilePath $browser -ArgumentList ('--app=' + $uri); " ^
  "} else { " ^
  "  Start-Process -FilePath $htmlPath; " ^
  "}"

echo.
echo ==========================================================
echo  Installation complete! Shortcuts updated on Desktop.
echo ==========================================================
timeout /t 2 >nul
exit /b 0
