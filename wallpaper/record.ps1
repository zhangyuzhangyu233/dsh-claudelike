<#
  Records the Code Ripple wallpaper to a seamless looping video, for wallpaper
  engines that only accept images and videos (Razer Axon, Wallpaper Engine's
  video type, Windows slideshow, ...).

  It opens the page in a browser app window at the requested size, grabs that
  window's client area with ffmpeg's gdigrab, then crossfades the tail into the
  head so the result loops without a visible cut.

  Usage:
    pwsh -File .\record.ps1                          # ~1080p, 80s source -> 77s loop
    pwsh -File .\record.ps1 -Seconds 120 -Fade 4
    pwsh -File .\record.ps1 -Theme light -Seed 42 -Output .\loop-light.mp4

  Requirements: Microsoft Edge or Google Chrome, ffmpeg on PATH (or -Ffmpeg).
  The screen must be larger than the requested window; the capture is cropped
  to 16:9 1920x1080 afterwards.
#>
param(
  [int]$Width = 1760,
  [int]$Height = 990,
  [int]$Seconds = 80,
  [int]$Fade = 3,
  [ValidateSet('dark', 'light')][string]$Theme = 'dark',
  [string]$Seed = '4242',
  [string]$Output = '',
  [string]$Ffmpeg = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$page = Join-Path $root 'index.html'
if (-not (Test-Path $page)) { throw "missing $page" }
if (-not $Output) { $Output = Join-Path $root 'code-ripple-loop.mp4' }
if ($Seconds -le ($Fade * 2)) { throw '-Seconds must be greater than 2 x -Fade' }

function Find-Ffmpeg {
  if ($Ffmpeg) { if (Test-Path $Ffmpeg) { return $Ffmpeg } else { throw "ffmpeg not found: $Ffmpeg" } }
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($candidate in @(
      'C:\Program Files\Softdeluxe\Free Download Manager\ffmpeg.exe',
      "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe",
      'C:\ffmpeg\bin\ffmpeg.exe')) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw 'ffmpeg not found. Install it or pass -Ffmpeg <path>.'
}

function Find-Browser {
  foreach ($candidate in @(
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe")) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw 'Edge or Chrome not found.'
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RippleWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
"@

$ffmpegPath = Find-Ffmpeg
$browser = Find-Browser

# Prefer a full ffmpeg build; this machine's copy only ships the Media
# Foundation H.264 encoder, which needs a bitrate instead of -crf.
$encoderList = (& $ffmpegPath -hide_banner -encoders 2>&1 | Out-String)
if ($encoderList -match 'libx264') {
  $videoArgs = @('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p')
} elseif ($encoderList -match 'h264_mf') {
  $videoArgs = @('-c:v', 'h264_mf', '-b:v', '20M', '-pix_fmt', 'yuv420p')
} else {
  throw 'no H.264 encoder in this ffmpeg build; install a full ffmpeg and pass -Ffmpeg'
}

$url = 'file:///' + ($page -replace '\\', '/') + "?capture=1&theme=$Theme&seed=$Seed&auto=1"
$profileDir = Join-Path $env:TEMP ('code-ripple-record-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$raw = Join-Path $env:TEMP ('code-ripple-raw-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.mp4')

Write-Host "opening $url"
# Kiosk mode: fullscreen, no browser chrome in the capture.
Start-Process -FilePath $browser -ArgumentList @(
  '--kiosk',
  $url,
  "--user-data-dir=$profileDir",
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble'
) | Out-Null

$window = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  $window = Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*Code Ripple*' } |
    Select-Object -First 1
  if ($window) { break }
}
if (-not $window) { throw 'the browser window did not appear' }
$handle = $window.MainWindowHandle

# Keep it above everything while recording: an occluded window would put other
# content into the capture.
[void][RippleWin]::SetWindowPos($handle, [IntPtr](-1), 0, 0, 0, 0, 0x1 -bor 0x2 -bor 0x40)
[void][RippleWin]::SetForegroundWindow($handle)
Start-Sleep -Seconds 6  # reveal + a few gusts

Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
# H.264 needs even dimensions
$captureWidth = $screen.Width - ($screen.Width % 2)
$captureHeight = $screen.Height - ($screen.Height % 2)
$originX = $screen.X
$originY = $screen.Y
Write-Host "capturing the full screen ${captureWidth}x${captureHeight} for $Seconds s"

& $ffmpegPath -y -hide_banner -loglevel warning `
  -f gdigrab -framerate 30 -draw_mouse 0 `
  -offset_x $origin.X -offset_y $origin.Y -video_size "${captureWidth}x${captureHeight}" `
  -i desktop -t $Seconds @videoArgs $raw
if ($LASTEXITCODE -ne 0) { throw "ffmpeg capture failed ($LASTEXITCODE)" }
try { [void][RippleWin]::SetWindowPos($handle, [IntPtr](-2), 0, 0, 0, 0, 0x1 -bor 0x2) } catch { }

Get-CimInstance Win32_Process -Filter "Name='msedge.exe' OR Name='chrome.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profileDir) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
try { Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue } catch { }

$length = $Seconds - $Fade
Write-Host "building seamless loop: $($length)s (tail crossfaded into head)"
$filter = "[0:v]split=3[b][t][h0];" +
  "[b]trim=start=${Fade}:end=${length},setpts=PTS-STARTPTS[main];" +
  "[h0]trim=0:${Fade},setpts=PTS-STARTPTS[h];" +
  "[t]trim=start=${length}:end=${Seconds},setpts=PTS-STARTPTS[tail];" +
  "[tail][h]xfade=transition=fade:duration=${Fade}:offset=0[head];" +
  "[head][main]concat=n=2:v=1:a=0,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[out]"

& $ffmpegPath -y -hide_banner -loglevel warning -i $raw -filter_complex $filter `
  -map '[out]' @videoArgs -an -movflags +faststart $Output
if ($LASTEXITCODE -ne 0) { throw "ffmpeg loop failed ($LASTEXITCODE)" }

Remove-Item $raw -Force -ErrorAction SilentlyContinue
$size = [math]::Round((Get-Item $Output).Length / 1MB, 1)
Write-Host "done: $Output (${size} MB, 1920x1080, $length s, seamless)" -ForegroundColor Green
Write-Host 'Razer Axon: My Wallpapers -> Create -> from a local file -> pick this mp4.'
