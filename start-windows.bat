@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Little Frames needs Node.js to start locally.
  echo Install the LTS version from https://nodejs.org then try again.
  pause
  exit /b 1
)
start "Little Frames server" /min node server.mjs
start "" "http://127.0.0.1:4173"
