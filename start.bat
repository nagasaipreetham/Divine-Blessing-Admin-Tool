@echo off
title Divine Blessing Admin Tool
echo.
echo ========================================
echo 🕉️ Divine Blessing Admin Tool
echo ========================================
echo.
echo Starting server...
echo Opening browser at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000
node server.js
pause