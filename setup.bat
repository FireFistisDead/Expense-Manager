@echo off
echo ========================================
echo  Expense Management System Setup
echo ========================================
echo.

echo [1/4] Setting up Python Virtual Environment...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat

echo [2/4] Installing Python Dependencies...
pip install fastapi uvicorn motor python-dotenv passlib bcrypt pyjwt python-multipart aiofiles requests email-validator

echo [3/4] Setting up Environment Variables...
if not exist .env (
    echo Creating .env file...
    copy ..\env.txt .env
)

echo [4/4] Installing Frontend Dependencies...
cd ..\frontend
npm cache clean --force
npm install --legacy-peer-deps

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo To start the application, run: start.bat
echo.
echo Make sure MongoDB is running before starting the backend.
echo.
echo Press any key to continue...
pause > nul

cd ..