@echo off
chcp 65001 >nul
title JOE's i-MED — Thai Smart Card Reader Bridge
echo Starting JOE's i-MED Smart Card Reader Bridge...
node "%~dp0smartcard-bridge.js"
pause
