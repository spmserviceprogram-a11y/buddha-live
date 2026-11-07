@echo off
title Buddha TikTok Live Stream
color 0E

echo ========================================================
echo        Buddha TikTok Live Server - Streaming System
echo ========================================================
echo.

cd /d "E:\Buddha"

if not exist "server.js" (
    color 0C
    echo [ERROR] server.js not found in E:\Buddha!
    pause
    exit /b 1
)

:: Ensure node is in PATH
where.exe node >nul 2>nul
if errorlevel 1 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )
)

:: Clear port 3000 safely
if exist "scripts\clear_port.js" (
    node scripts\clear_port.js
)

:: Start Auto-Push Watcher in background
if exist "auto-push.js" (
    start "Buddha Auto-Push Watcher" /min cmd /c node auto-push.js
)

:: Open browser after 2 seconds
start /min cmd /c "ping 127.0.0.1 -n 3 >nul & start http://localhost:3000"

echo.
echo ========================================================
echo [*] Server starting at http://localhost:3000
echo [*] Web browser will open automatically
echo [*] Press Ctrl+C in this window to stop
echo ========================================================
echo.

node server.js

echo.
color 0C
echo [NOTICE] Server has stopped.
pause
