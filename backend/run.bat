@echo off
echo ========================================
echo PriceWise Backend - FastAPI + SQLAlchemy
echo ========================================
echo.

cd /d "%~dp0"

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -q -r requirements.txt

echo.
echo ========================================
echo Starting FastAPI server...
echo ========================================
echo.
echo API Running: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ReDoc: http://localhost:8000/redoc
echo.

python -m uvicorn main:app --reload --port 8000

pause
