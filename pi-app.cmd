@echo off
where node >nul 2>nul || (echo Node.js 22.19+ is required: https://nodejs.org & exit /b 1)
node "%~dp0scripts\pi-app.mjs" %*
