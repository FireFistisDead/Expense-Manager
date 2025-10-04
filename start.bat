@echo off
echo Starting Expense Management System...
echo.

echo [1/3] Starting MongoDB (if not already running)...
:: Uncomment the line below if you have MongoDB installed locally
:: start "MongoDB" mongod

echo [2/3] Starting Backend Server...
start "Backend API" cmd /k "cd /d backend && .venv\Scripts\python.exe -m uvicorn server:app --reload --host 127.0.0.1 --port 8000"

echo [3/3] Starting Frontend Application...
start "Frontend React" cmd /k "cd /d frontend && npm start"

echo.
echo ========================================
echo  Expense Management System Started!
echo ========================================
echo  Frontend: http://localhost:3000
echo  Backend API: http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to continue...
pause > nul