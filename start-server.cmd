@echo off
cd /d "%~dp0"
set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if exist "%NODE_EXE%" (
  "%NODE_EXE%" --env-file-if-exists="%~dp0.env" "%~dp0server.js"
) else (
  node --env-file-if-exists="%~dp0.env" "%~dp0server.js"
)
