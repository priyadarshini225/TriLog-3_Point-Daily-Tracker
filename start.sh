#!/bin/bash

echo "================================"
echo "TriLog - Starting Development Servers"
echo "================================"
echo ""
echo "Starting Backend on port 5000..."
echo "Starting Frontend on port 3000..."
echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Servers started!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for both processes
wait
