#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting SkillSync React Frontend${NC}"

# Check for existing processes on port 3000
echo -e "${YELLOW}Checking for existing processes on port 3000...${NC}"
if lsof -i:3000 > /dev/null; then
    echo -e "${YELLOW}Killing process on port 3000...${NC}"
    kill $(lsof -t -i:3000) 2>/dev/null
    sleep 1
fi

# Find and navigate to project root (where package.json is)
if [[ -f "package.json" ]]; then
    echo -e "${YELLOW}Found package.json in current directory.${NC}"
elif [[ -f "../package.json" ]]; then
    echo -e "${YELLOW}Found package.json in parent directory. Navigating up...${NC}"
    cd ..
else
    # Try to find package.json in other common locations
    if [[ -d "backend" && -f "backend/../package.json" ]]; then
        echo -e "${YELLOW}Found package.json in backend parent directory. Navigating...${NC}"
        cd backend/..
    else
        echo -e "${RED}Cannot find package.json. Please run this script from project root or backend directory.${NC}"
        echo -e "${YELLOW}Current directory: $PWD${NC}"
        exit 1
    fi
fi

# Double-check that we're in the right place
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}package.json not found after navigation.${NC}"
    echo -e "${YELLOW}Current directory: $PWD${NC}"
    exit 1
fi

echo -e "${GREEN}Running React frontend on port 3000${NC}"
echo -e "${GREEN}Frontend will be available at http://localhost:3000${NC}"
npm start 