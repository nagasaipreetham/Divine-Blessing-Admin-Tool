Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🕉️  Divine Blessing Admin Tool" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "Opening browser at http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host "🚀 Starting Node.js server..." -ForegroundColor Green
node server.js