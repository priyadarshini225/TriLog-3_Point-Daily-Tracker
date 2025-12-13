@echo off
echo ================================
echo TriLog - Starting Development Servers
echo ================================
echo.
echo Starting Backend on port 5000...
echo Starting Frontend on port 3000...
echo.
echo Press Ctrl+C to stop both servers
echo ================================
echo.

start "TriLog Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "TriLog Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Servers starting in separate windows...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
