@echo off
cd /d "%~dp0"
python -c "import webview" 2>nul
if errorlevel 1 (
  echo Installing pywebview...
  pip install -e ".[app]"
)
python -m chirply app
if errorlevel 1 pause
