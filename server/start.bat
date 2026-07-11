@echo off
cd /d "%~dp0"
if not exist .venv (
  python -m venv .venv
  call .venv\Scripts\activate
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate
)
REM Fast startup with demo ID. Remove the next line for live BirdNET (first load is slow).
set CHIRPLY_DEMO=1
echo Starting Chirply API on http://0.0.0.0:8787
echo Demo mode ON (CHIRPLY_DEMO=1). Unset for BirdNET.
uvicorn main:app --host 0.0.0.0 --port 8787 --reload
