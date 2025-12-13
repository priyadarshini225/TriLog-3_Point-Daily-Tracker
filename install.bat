@echo off
echo ================================
echo TriLog - Installation Script
echo ================================
echo.

echo [1/3] Installing Backend Dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)
echo ✓ Backend dependencies installed
echo.

echo [2/3] Installing Frontend Dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)
echo ✓ Frontend dependencies installed
echo.

echo [3/3] Setting up environment files...
cd ..\backend
if not exist .env (
    copy .env.example .env
    echo ✓ Created backend\.env - PLEASE EDIT WITH YOUR MONGODB URI!
) else (
    echo - backend\.env already exists
)

cd ..\frontend
if not exist .env (
    copy .env.example .env
    echo ✓ Created frontend\.env
) else (
    echo - frontend\.env already exists
)

cd ..

echo.
echo ================================
echo Installation Complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your MongoDB connection string
echo 2. Run: cd backend ^&^& npm run seed (to populate questions)
echo 3. Run: cd backend ^&^& npm run dev (in one terminal)
echo 4. Run: cd frontend ^&^& npm run dev (in another terminal)
echo 5. Open http://localhost:3000 in your browser
echo.
echo See SETUP.md for detailed instructions.
echo.
pause
