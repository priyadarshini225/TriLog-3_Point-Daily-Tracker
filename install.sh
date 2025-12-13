#!/bin/bash

echo "================================"
echo "TriLog - Installation Script"
echo "================================"
echo ""

echo "[1/3] Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Backend installation failed!"
    exit 1
fi
echo "✓ Backend dependencies installed"
echo ""

echo "[2/3] Installing Frontend Dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend installation failed!"
    exit 1
fi
echo "✓ Frontend dependencies installed"
echo ""

echo "[3/3] Setting up environment files..."
cd ../backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created backend/.env - PLEASE EDIT WITH YOUR MONGODB URI!"
else
    echo "- backend/.env already exists"
fi

cd ../frontend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created frontend/.env"
else
    echo "- frontend/.env already exists"
fi

cd ..

echo ""
echo "================================"
echo "Installation Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your MongoDB connection string"
echo "2. Run: cd backend && npm run seed (to populate questions)"
echo "3. Run: cd backend && npm run dev (in one terminal)"
echo "4. Run: cd frontend && npm run dev (in another terminal)"
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "See SETUP.md for detailed instructions."
echo ""
