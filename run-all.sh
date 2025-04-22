#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting SkillSync Full Stack Application${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

# Find base directory (where package.json is)
BASE_DIR=""
if [[ -f "package.json" ]]; then
    BASE_DIR="."
elif [[ -f "../package.json" ]]; then
    BASE_DIR=".."
elif [[ -d "backend" && -f "backend/../package.json" ]]; then
    BASE_DIR="backend/.."
else
    echo -e "${RED}Cannot find project root directory.${NC}"
    echo -e "${YELLOW}Current directory: $PWD${NC}"
    exit 1
fi

# Make all scripts executable
cd "$BASE_DIR"
chmod +x run-backend.sh run-node.sh run-frontend.sh

# Check and kill processes on required ports
echo -e "${YELLOW}Checking for existing processes on ports 3000, 5001, and 5002...${NC}"
for PORT in 3000 5001 5002; do
    if lsof -i:$PORT > /dev/null; then
        echo -e "${YELLOW}Killing process on port $PORT...${NC}"
        kill $(lsof -t -i:$PORT) 2>/dev/null
        sleep 1
    fi
done

# Start Python backend (port 5001) in background
echo -e "${YELLOW}Starting Python backend on port 5001...${NC}"
./run-backend.sh > logs/python-backend.log 2>&1 &
PYTHON_PID=$!

# Wait for Python backend to start
echo -e "${YELLOW}Waiting for Python backend to start (10 seconds)...${NC}"
sleep 10

# Check if Python backend is running
if ! lsof -i:5001 > /dev/null; then
    echo -e "${RED}Python backend failed to start properly. Check logs/python-backend.log for details${NC}"
    tail logs/python-backend.log
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

# Start Node.js server (port 5002) in background
echo -e "${YELLOW}Starting Node.js server on port 5002...${NC}"
./run-node.sh > logs/node-server.log 2>&1 &
NODE_PID=$!

# Wait for Node.js server to start
echo -e "${YELLOW}Waiting for Node.js server to start (10 seconds)...${NC}"
sleep 10

# Check if Node.js server is running
if ! lsof -i:5002 > /dev/null; then
    echo -e "${RED}Node.js server failed to start properly. Check logs/node-server.log for details${NC}"
    tail logs/node-server.log
    kill $PYTHON_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    exit 1
fi

# Print service information
echo -e "\n${GREEN}Services:${NC}"
echo -e "- ${GREEN}Python Backend:${NC} http://localhost:5001"
echo -e "- ${GREEN}Node.js Server:${NC} http://localhost:5002"
echo -e "- ${GREEN}React Frontend:${NC} http://localhost:3000 (starting now)"
echo -e "${YELLOW}Logs are being saved to the logs directory.${NC}"

# Cleanup function to kill background processes when script exits
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $PYTHON_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    exit
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Start React frontend in foreground
echo -e "${YELLOW}Starting React frontend on port 3000...${NC}"
./run-frontend.sh

# This script will end when the frontend is closed 