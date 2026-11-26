(function () {
  'use strict';

  var KM = window.KM = window.KM || {};

  function encodeUtf8Base64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function wrapBase64Lines(b64, width) {
    var out = [];
    for (var i = 0; i < b64.length; i += width) {
      out.push(b64.slice(i, i + width));
    }
    return out.join('\r\n');
  }

  function getCleanAppHtmlString() {
    var clone = document.documentElement.cloneNode(true);
    var pagesEl = clone.querySelector('#pdfPagesContainer');
    if (pagesEl) {
      pagesEl.innerHTML = '';
      pagesEl.classList.add('hidden');
    }
    var emptyEl = clone.querySelector('#emptyStateCard');
    if (emptyEl) emptyEl.classList.remove('hidden');
    var railEl = clone.querySelector('#floatingZoomRail');
    if (railEl) railEl.classList.add('hidden');
    var tabsEl = clone.querySelector('#tabBar');
    if (tabsEl) tabsEl.innerHTML = '';
    ['matrixModal', 'apiSettingsModal', 'desktopInstallerModal', 'stickyNoteModal'].forEach(function (mId) {
      var m = clone.querySelector('#' + mId);
      if (m) {
        m.classList.add('hidden');
        m.style.display = '';
      }
    });
    var closeTag = '<' + '/script>';
    var closeRegex = new RegExp('<' + '/script>', 'gi');
    return '<!DOCTYPE html>\n' + clone.outerHTML.replace(closeRegex, closeTag);
  }

  function downloadWindowsNativeInstaller() {
    if (KM.state && KM.state.isDownloadingInstaller) return;
    if (KM.state) KM.state.isDownloadingInstaller = true;
    setTimeout(function () {
      if (KM.state) KM.state.isDownloadingInstaller = false;
    }, 2000);

    try {
      var htmlString = getCleanAppHtmlString();
      var htmlB64 = wrapBase64Lines(encodeUtf8Base64(htmlString), 76);

      var psLines = [
        'param([string]$BatPath)',
        '$ErrorActionPreference = "Stop"',
        '$targetBat = $null',
        'if ($BatPath -and (Test-Path -LiteralPath $BatPath)) { $targetBat = $BatPath }',
        'elseif ($env:KM_BAT_PATH -and (Test-Path -LiteralPath $env:KM_BAT_PATH)) { $targetBat = $env:KM_BAT_PATH }',
        'else { throw "Installer .bat path not found." }',
        '$batText = [System.IO.File]::ReadAllText($targetBat, [System.Text.Encoding]::UTF8)',
        '$sTag = ":: ===KM_HTML_" + "START==="',
        '$eTag = ":: ===KM_HTML_" + "END==="',
        '$i = $batText.LastIndexOf($sTag)',
        '$j = $batText.LastIndexOf($eTag)',
        'if ($i -lt 0 -or $j -le $i) { throw "HTML payload markers not found in installer." }',
        '$b64Raw = ($batText.Substring($i + $sTag.Length, $j - ($i + $sTag.Length)) -replace "\\s+", "")',
        '$htmlBytes = [System.Convert]::FromBase64String($b64Raw)',
        '$appDir = Join-Path $env:LOCALAPPDATA "KM-Reader-Studio"',
        'New-Item -ItemType Directory -Force -Path $appDir | Out-Null',
        '$htmlPath = Join-Path $appDir "index.html"',
        '[System.IO.File]::WriteAllBytes($htmlPath, $htmlBytes)',
        '',
        'Add-Type -AssemblyName System.Drawing',
        '$bmp = New-Object System.Drawing.Bitmap 64, 64',
        '$g = [System.Drawing.Graphics]::FromImage($bmp)',
        '$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias',
        '$rect = New-Object System.Drawing.Rectangle 0, 0, 64, 64',
        '$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(220,38,38), [System.Drawing.Color]::FromArgb(67,56,202), 45.0)',
        '$g.FillRectangle($brush, $rect)',
        '$font = New-Object System.Drawing.Font("Arial", 21, [System.Drawing.FontStyle]::Bold)',
        '$sf = New-Object System.Drawing.StringFormat',
        '$sf.Alignment = [System.Drawing.StringAlignment]::Center',
        '$sf.LineAlignment = [System.Drawing.StringAlignment]::Center',
        '$g.DrawString("KM", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 2, 64, 62)), $sf)',
        '$g.FillEllipse([System.Drawing.Brushes]::Gold, 45, 9, 10, 10)',
        '$g.Dispose()',
        '$msPng = New-Object System.IO.MemoryStream',
        '$bmp.Save($msPng, [System.Drawing.Imaging.ImageFormat]::Png)',
        '$pngBytes = $msPng.ToArray()',
        '$msPng.Dispose()',
        '$bmp.Dispose()',
        '$icoPath = Join-Path $appDir "km-reader.ico"',
        '$fsIco = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)',
        '$bw = New-Object System.IO.BinaryWriter($fsIco)',
        '$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)',
        '$bw.Write([byte]64); $bw.Write([byte]64); $bw.Write([byte]0); $bw.Write([byte]0)',
        '$bw.Write([uint16]1); $bw.Write([uint16]32)',
        '$bw.Write([uint32]$pngBytes.Length); $bw.Write([uint32]22)',
        '$bw.Write($pngBytes)',
        '$bw.Close(); $fsIco.Close()',
        '',
        '$csCode = @"',
        'using System;',
        'using System.Diagnostics;',
        'using System.IO;',
        'using System.Net;',
        'using System.Threading;',
        'class KMReaderLauncher {',
        '  [STAThread]',
        '  static void Main() {',
        '    string dir = AppDomain.CurrentDomain.BaseDirectory;',
        '    string indexFile = Path.Combine(dir, "index.html");',
        '    string targetUrl = new Uri(indexFile).AbsoluteUri;',
        '    HttpListener listener = null;',
        '    int[] ports = new int[] { 48921, 48922, 48923, 48924 };',
        '    foreach (int p in ports) {',
        '      try {',
        '        HttpListener l = new HttpListener();',
        '        l.Prefixes.Add("http://127.0.0.1:" + p + "/");',
        '        l.Start();',
        '        listener = l;',
        '        targetUrl = "http://127.0.0.1:" + p + "/";',
        '        break;',
        '      } catch { }',
        '    }',
        '    LaunchAppWindow(targetUrl);',
        '    if (listener != null) {',
        '      DateTime lastHit = DateTime.UtcNow;',
        '      ThreadPool.QueueUserWorkItem(_ => {',
        '        while (listener.IsListening) {',
        '          if ((DateTime.UtcNow - lastHit).TotalMinutes > 240) { try { listener.Stop(); } catch {} break; }',
        '          Thread.Sleep(15000);',
        '        }',
        '      });',
        '      while (listener.IsListening) {',
        '        try {',
        '          var ctx = listener.GetContext();',
        '          lastHit = DateTime.UtcNow;',
        '          byte[] data = File.ReadAllBytes(indexFile);',
        '          ctx.Response.ContentType = "text/html; charset=utf-8";',
        '          ctx.Response.ContentLength64 = data.Length;',
        '          ctx.Response.OutputStream.Write(data, 0, data.Length);',
        '          ctx.Response.OutputStream.Close();',
        '        } catch { break; }',
        '      }',
        '    }',
        '  }',
        '  static void LaunchAppWindow(string url) {',
        '    string[] candidates = new string[] {',
        '      Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\\Edge\\Application\\msedge.exe"),',
        '      Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\\Edge\\Application\\msedge.exe"),',
        '      Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\\Chrome\\Application\\chrome.exe"),',
        '      Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\\Chrome\\Application\\chrome.exe")',
        '    };',
        '    foreach (string exe in candidates) {',
        '      if (File.Exists(exe)) {',
        '        Process.Start(exe, "--app=\\"" + url + "\\" --window-size=1360,860");',
        '        return;',
        '      }',
        '    }',
        '    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });',
        '  }',
        '}',
        '"@',
        '$csPath = Join-Path $appDir "KMReaderLauncher.cs"',
        '$exePath = Join-Path $appDir "KM-Reader-Studio.exe"',
        '[System.IO.File]::WriteAllText($csPath, $csCode, [System.Text.Encoding]::UTF8)',
        '$csc = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe"',
        'if (-not (Test-Path -LiteralPath $csc)) { $csc = "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe" }',
        'if (Test-Path -LiteralPath $csc) {',
        '  & $csc /nologo /target:winexe /win32icon:"$icoPath" /out:"$exePath" "$csPath" | Out-Null',
        '}',
        '$shortcutTarget = if (Test-Path -LiteralPath $exePath) { $exePath } else { $htmlPath }',
        '$wsh = New-Object -ComObject WScript.Shell',
        '$desktopLnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "KM-Reader Studio.lnk"',
        '$s1 = $wsh.CreateShortcut($desktopLnk)',
        '$s1.TargetPath = $shortcutTarget',
        '$s1.WorkingDirectory = $appDir',
        '$s1.IconLocation = "$icoPath,0"',
        '$s1.Save()',
        '$startDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs"',
        '$startLnk = Join-Path $startDir "KM-Reader Studio.lnk"',
        '$s2 = $wsh.CreateShortcut($startLnk)',
        '$s2.TargetPath = $shortcutTarget',
        '$s2.WorkingDirectory = $appDir',
        '$s2.IconLocation = "$icoPath,0"',
        '$s2.Save()',
        'Start-Process -FilePath $shortcutTarget'
      ];

      var psB64 = wrapBase64Lines(encodeUtf8Base64(psLines.join('\r\n')), 76);

      var batLines = [
        '@echo off',
        'setlocal',
        'title KM-Reader Studio - Desktop Installer',
        'echo Installing KM-Reader Studio to your computer...',
        'set "KM_BAT_PATH=%~f0"',
        'set "PS_FILE=%TEMP%\\km_reader_setup_%RANDOM%.ps1"',
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[System.IO.File]::ReadAllText($env:KM_BAT_PATH,[System.Text.Encoding]::UTF8);$s=\':: ===KM_PS_\'+\'START===\';$e=\':: ===KM_PS_\'+\'END===\';$i=$t.LastIndexOf($s)+$s.Length;$j=$t.LastIndexOf($e);$b=($t.Substring($i,$j-$i) -replace \'\\s+\',\'\');[System.IO.File]::WriteAllBytes($env:PS_FILE,[System.Convert]::FromBase64String($b))"',
        'if %ERRORLEVEL% NEQ 0 goto :fail',
        'powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_FILE%" -BatPath "%~f0"',
        'if %ERRORLEVEL% NEQ 0 goto :fail',
        'del /f /q "%PS_FILE%" >nul 2>&1',
        'echo Installation complete! KM-Reader Studio is now on your Desktop.',
        'timeout /t 2 >nul',
        'exit /b 0',
        ':fail',
        'echo.',
        'echo Installation encountered an error. See details above.',
        'pause',
        'exit /b 1',
        ':: ===KM_PS_' + 'START===',
        psB64,
        ':: ===KM_PS_' + 'END===',
        ':: ===KM_HTML_' + 'START===',
        htmlB64,
        ':: ===KM_HTML_' + 'END==='
      ];

      KM.downloadBlobFile('Install-KM-Reader-Studio-Windows.bat', batLines.join('\r\n'), 'application/octet-stream');
      KM.showToast('Downloaded Install-KM-Reader-Studio-Windows.bat', 'success');
    } catch (err) {
      KM.showToast('Windows installer error: ' + err.message, 'error');
    }
  }

  function downloadMacNativeInstaller() {
    if (KM.state && KM.state.isDownloadingInstaller) return;
    if (KM.state) KM.state.isDownloadingInstaller = true;
    setTimeout(function () {
      if (KM.state) KM.state.isDownloadingInstaller = false;
    }, 2000);

    try {
      var htmlString = getCleanAppHtmlString();
      var eofMarker = 'KM_READER_HTML_PAYLOAD_EOF_' + Date.now();
      var shLines = [
        '#!/bin/bash',
        'set -e',
        'APP_DIR="$HOME/Applications/KM-Reader-Studio"',
        'mkdir -p "$APP_DIR"',
        'cat << \'' + eofMarker + '\' > "$APP_DIR/index.html"',
        htmlString,
        eofMarker,
        'LAUNCHER="$HOME/Desktop/KM-Reader Studio.command"',
        'cat << \'EOF_LAUNCH\' > "$LAUNCHER"',
        '#!/bin/bash',
        'APP_HTML="$HOME/Applications/KM-Reader-Studio/index.html"',
        'if [ -d "/Applications/Google Chrome.app" ]; then',
        '  open -na "Google Chrome" --args --app="file://$APP_HTML" --window-size=1360,860',
        'elif [ -d "/Applications/Microsoft Edge.app" ]; then',
        '  open -na "Microsoft Edge" --args --app="file://$APP_HTML" --window-size=1360,860',
        'else',
        '  open "$APP_HTML"',
        'fi',
        'EOF_LAUNCH',
        'chmod +x "$LAUNCHER"',
        'echo "KM-Reader Studio installed to ~/Applications/KM-Reader-Studio and Desktop!"',
        'open "$LAUNCHER"'
      ];
      KM.downloadBlobFile('Install-KM-Reader-Studio-macOS.command', shLines.join('\n'), 'application/octet-stream');
      KM.showToast('Downloaded Install-KM-Reader-Studio-macOS.command', 'success');
    } catch (err) {
      KM.showToast('macOS installer error: ' + err.message, 'error');
    }
  }

  function openDesktopInstallerModal() {
    var m = KM.$('desktopInstallerModal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  }

  function closeDesktopInstallerModal() {
    var m = KM.$('desktopInstallerModal');
    if (m) {
      m.classList.add('hidden');
      m.style.display = '';
    }
  }

  KM.downloadWindowsNativeInstaller = downloadWindowsNativeInstaller;
  KM.downloadMacNativeInstaller = downloadMacNativeInstaller;
  KM.openDesktopInstallerModal = openDesktopInstallerModal;
  KM.closeDesktopInstallerModal = closeDesktopInstallerModal;

  window.downloadWindowsNativeInstaller = downloadWindowsNativeInstaller;
  window.downloadMacNativeInstaller = downloadMacNativeInstaller;
  window.openDesktopInstallerModal = openDesktopInstallerModal;
  window.closeDesktopInstallerModal = closeDesktopInstallerModal;
})();
