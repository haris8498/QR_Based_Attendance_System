#!/bin/bash

echo "========================================"
echo " QR Attendance System - Offline Mode"
echo " Starting All Servers..."
echo "========================================"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "[1/3] Starting Main Backend Server..."
cd "$SCRIPT_DIR/Backend"
node server.js &
BACKEND_PID=$!
sleep 2

echo "[2/3] Starting Offline P2P Server..."
node offlineServer.js &
OFFLINE_PID=$!
sleep 2

echo "[3/3] Starting Frontend..."
cd "$SCRIPT_DIR/Frontend"
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo "========================================"
echo " All Servers Started Successfully!"
echo "========================================"
echo ""
echo " Main Server:    http://localhost:5000"
echo " Offline Server: http://localhost:3030"
echo " Frontend:       http://localhost:5173"
echo ""
echo " Teacher IP for Students:"
if command -v ifconfig &> /dev/null; then
    echo " $(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -1)"
elif command -v ip &> /dev/null; then
    echo " $(ip addr show | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)"
fi
echo ""
echo " Opening browser..."

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo ""
echo " Press Ctrl+C to stop all servers"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $OFFLINE_PID $FRONTEND_PID 2>/dev/null; echo 'All servers stopped.'; exit 0" INT TERM

# Keep script running
wait
