# start.ps1 - Launch both backend and frontend with a single command
# Run from the project root: .\start.ps1

Write-Host "Starting AI Agent..." -ForegroundColor Cyan

# Start backend
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot\backend'; if (-not (Test-Path venv)) { python -m venv venv }; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt -q; uvicorn main:app --reload --port 8000"
) -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PSScriptRoot\frontend'; npm install; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Add your ANTHROPIC_API_KEY to backend\.env before chatting!" -ForegroundColor Yellow
