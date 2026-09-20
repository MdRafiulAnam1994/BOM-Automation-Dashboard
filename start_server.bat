@echo off
title Walton BOM Unified Server (Dashboard & Cross-Verifier)
color 0a
cd /d "%~dp0"
echo ====================================================================
echo       WALTON BOM UNIFIED APPLICATION SERVER (PORT 8080)
echo ====================================================================
echo.
echo Starting local web server at http://localhost:8080/ ...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server encountered an error.
    pause
)