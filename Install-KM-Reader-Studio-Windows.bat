@echo off
setlocal EnableExtensions
title KM-Reader Studio - Desktop App Setup
echo ==========================================================
echo  Installing KM-Reader Studio v33 (Desktop Application)
echo ==========================================================
echo.

set "SRC_DIR=%~dp0"
set "APP_DIR=%LOCALAPPDATA%\KM-Reader-Studio"

if not exist "%SRC_DIR%index.html" (
    echo [ERROR] index.html not found in "%SRC_DIR%".
    echo Please right-click the ZIP file and choose "Extract All..." first,
    echo then double-click Install-KM-Reader-Studio-Windows.bat inside the extracted folder.
    echo.
    pause
    exit /b 1
)

if not exist "%APP_DIR%" mkdir "%APP_DIR%"
if not exist "%APP_DIR%\js" mkdir "%APP_DIR%\js"

echo [1/4] Copying application files to %APP_DIR% ...
copy /y "%SRC_DIR%index.html" "%APP_DIR%\index.html" >nul
if exist "%SRC_DIR%styles.css" copy /y "%SRC_DIR%styles.css" "%APP_DIR%\styles.css" >nul
if exist "%SRC_DIR%manifest.json" copy /y "%SRC_DIR%manifest.json" "%APP_DIR%\manifest.json" >nul
if exist "%SRC_DIR%sw.js" copy /y "%SRC_DIR%sw.js" "%APP_DIR%\sw.js" >nul
if exist "%SRC_DIR%version.json" copy /y "%SRC_DIR%version.json" "%APP_DIR%\version.json" >nul
xcopy /y /q /i "%SRC_DIR%js\*.js" "%APP_DIR%\js\" >nul

echo [2/4] Creating Desktop ^& Start Menu shortcuts...
set "PS_TMP=%TEMP%\km_reader_shortcut.ps1"
> "%PS_TMP%" echo $ErrorActionPreference = 'SilentlyContinue'
>> "%PS_TMP%" echo $dir = Join-Path $env:LOCALAPPDATA 'KM-Reader-Studio'
>> "%PS_TMP%" echo $htmlPath = Join-Path $dir 'index.html'
>> "%PS_TMP%" echo $ico = Join-Path $dir 'km-reader.ico'
>> "%PS_TMP%" echo Add-Type -AssemblyName System.Drawing
>> "%PS_TMP%" echo $bmp = New-Object System.Drawing.Bitmap(64,64)
>> "%PS_TMP%" echo $g = [System.Drawing.Graphics]::FromImage($bmp)
>> "%PS_TMP%" echo $g.SmoothingMode = 'AntiAlias'
>> "%PS_TMP%" echo $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point(64,64)), [System.Drawing.Color]::FromArgb(220,38,38), [System.Drawing.Color]::FromArgb(67,56,202))
>> "%PS_TMP%" echo $g.FillRectangle($brush, 0, 0, 64, 64)
>> "%PS_TMP%" echo $font = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold)
>> "%PS_TMP%" echo $g.DrawString('KM', $font, [System.Drawing.Brushes]::White, 6, 16)
>> "%PS_TMP%" echo $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
>> "%PS_TMP%" echo $fs = [System.IO.File]::OpenWrite($ico)
>> "%PS_TMP%" echo $icon.Save($fs); $fs.Close(); $g.Dispose(); $bmp.Dispose()
>> "%PS_TMP%" echo $candidates = @((Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'), (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'), (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'), (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'))
>> "%PS_TMP%" echo $browser = $candidates ^| Where-Object { $_ -and (Test-Path -LiteralPath $_) } ^| Select-Object -First 1
>> "%PS_TMP%" echo $uri = ([System.Uri]$htmlPath).AbsoluteUri
>> "%PS_TMP%" echo $ws = New-Object -ComObject WScript.Shell
>> "%PS_TMP%" echo $targets = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'KM-Reader Studio.lnk'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\KM-Reader Studio.lnk'))
>> "%PS_TMP%" echo foreach ($lnk in $targets) {
>> "%PS_TMP%" echo   $s = $ws.CreateShortcut($lnk)
>> "%PS_TMP%" echo   if ($browser) { $s.TargetPath = $browser; $s.Arguments = '--app=' + $uri } else { $s.TargetPath = $htmlPath }
>> "%PS_TMP%" echo   $s.WorkingDirectory = $dir
>> "%PS_TMP%" echo   if (Test-Path -LiteralPath $ico) { $s.IconLocation = $ico + ',0' }
>> "%PS_TMP%" echo   $s.Save()
>> "%PS_TMP%" echo }

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_TMP%"
del /f /q "%PS_TMP%" >nul 2>&1

echo [3/4] Finding browser engine...
set "BROWSER_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

echo [4/4] Launching KM-Reader Studio window...
if defined BROWSER_EXE (
    start "" "%BROWSER_EXE%" --app="file:///%APP_DIR:\=/%/index.html"
) else (
    start "" "%APP_DIR%\index.html"
)

echo.
echo ==========================================================
echo  Installation complete! KM-Reader Studio is opening...
echo ==========================================================
timeout /t 3 >nul
exit /b 0
