# PowerShell Runner script for React frontend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
cd $scriptPath

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing node dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Vite Development Server..." -ForegroundColor Green
npm run dev
