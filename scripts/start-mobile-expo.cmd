@echo off
setlocal

set EXPO_NO_METRO_WORKSPACE_ROOT=1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8081 .*LISTENING"') do (
  echo Releasing stale Metro process on port 8081 (PID %%a)...
  taskkill /PID %%a /F >nul 2>nul
)
cd /d "%~dp0..\apps\mobile"
node --require "..\..\scripts\fix-expo-ws-runtime.js" ..\..\node_modules\expo\bin\cli start --clear --localhost
