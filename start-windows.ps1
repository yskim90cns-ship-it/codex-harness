$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

Set-Location -Path $PSScriptRoot
$port = if ($env:PORT) { $env:PORT } else { "3000" }
$url = "http://localhost:$port"
$nextCommand = Join-Path $PSScriptRoot "node_modules\.bin\next.cmd"

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Install Node.js 20 or newer, then run this file again."
  }
}

Test-Command "node"
Test-Command "npm"

$nodeMajorVersion = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajorVersion -lt 20) {
  throw "Node.js 20 or newer is required. Current version: $(node --version)"
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Cyan
}

if (-not (Test-Path $nextCommand)) {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  Write-Host "First run can take a few minutes." -ForegroundColor DarkGray
  npm.cmd install
}

if (-not (Test-Path $nextCommand)) {
  throw "Next.js was not installed correctly. Delete node_modules and run start-windows.bat again."
}

Write-Host "Starting app in normal Windows mode. Keep this window open while using the app." -ForegroundColor Green
Write-Host "If the browser does not open automatically, open $url" -ForegroundColor Green
Write-Host "Press Ctrl+C in this window to stop the server." -ForegroundColor Yellow
Start-Job -ScriptBlock {
  param([string]$TargetUrl)

  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Start-Process $TargetUrl
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
} -ArgumentList $url | Out-Null
npm.cmd run dev
