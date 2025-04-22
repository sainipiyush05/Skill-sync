#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting SkillSync Python Backend${NC}"

# Check for existing processes on port 5001
echo -e "${YELLOW}Checking for existing processes on port 5001...${NC}"
if lsof -i:5001 > /dev/null; then
    echo -e "${YELLOW}Killing process on port 5001...${NC}"
    kill $(lsof -t -i:5001) 2>/dev/null
    sleep 1
fi

# Find and navigate to backend directory
if [[ -d "backend" ]]; then
    cd backend
elif [[ $(basename "$PWD") != "backend" && $(basename "$(dirname "$PWD")") == "backend" ]]; then
    cd ..  # We're in backend/something, go up to backend
elif [[ $(basename "$PWD") != "backend" ]]; then
    echo -e "${RED}Cannot find backend directory.${NC}"
    echo -e "${YELLOW}Current directory: $PWD${NC}"
    exit 1
fi

# Ensure start.sh is executable
if [[ -f "start.sh" ]]; then
    chmod +x start.sh
else
    echo -e "${RED}start.sh not found in backend directory.${NC}"
    exit 1
fi

# Make sure run_coding_stats.py is executable
if [[ -f "run_coding_stats.py" ]]; then
    chmod +x run_coding_stats.py
fi

# Set the PORT environment variable
export PORT=5001

echo -e "${GREEN}Running Python backend on port $PORT${NC}"
echo -e "${GREEN}API will be available at http://localhost:5001${NC}"
./start.sh 