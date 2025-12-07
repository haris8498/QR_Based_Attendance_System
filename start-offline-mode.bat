@echo off
echo ========================================
echo  QR Attendance System - Offline Mode
echo  Starting All Servers...
echo ========================================
echo.

REM Get the directory where the script is located
set SCRIPT_DIR=%~dp0

echo [1/3] Starting Main Backend Server...
start "Main Backend Server" cmd /k "cd /d %SCRIPT_DIR%Backend && node server.js"
timeout /t 3 /nobreak > nul

echo [2/3] Starting Offline P2P Server...
start "Offline Server" cmd /k "cd /d %SCRIPT_DIR%Backend && node offlineServer.js"
timeout /t 3 /nobreak > nul

echo [3/3] Starting Frontend...
start "Frontend Dev Server" cmd /k "cd /d %SCRIPT_DIR%Frontend && npm run dev"
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo  All Servers Started Successfully!
echo ========================================
echo.
echo  Main Server:    http://localhost:5000
echo  Offline Server: http://localhost:3030
echo  Frontend:       http://localhost:5173
echo.
echo  Teacher IP for Students: 
echo  Run 'ipconfig' to find your WiFi IPv4 address
echo.
echo  Press any key to open browser...
pause > nul

start http://localhost:5173

echo.
echo To stop all servers, close all the command windows.
echo.
pause
