$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "habitforge\backend"
$frontend = Join-Path $root "habitforge\frontend"

Write-Host "Starting HabitForge backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; python -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting HabitForge frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev"

Write-Host "Both servers launched. Backend: http://localhost:8000 | Frontend: http://localhost:5173" -ForegroundColor Green
