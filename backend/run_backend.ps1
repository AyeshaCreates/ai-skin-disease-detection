# PowerShell Runner script for FastAPI backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
cd $scriptPath

Write-Host "Checking python packages..." -ForegroundColor Teal
python -c "import fastapi, uvicorn, torch, torchvision, transformers, sklearn, pandas, reportlab, PIL" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Missing packages detected! Re-installing requirements..." -ForegroundColor Yellow
    pip install -r requirements.txt --user
}

Write-Host "Starting FastAPI Backend Server on http://localhost:8000 ..." -ForegroundColor Green
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
