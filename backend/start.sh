#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting SkillSync Backend Services...${NC}"

# Check if we're in the correct directory
CURRENT_DIR=$(basename "$PWD")
if [[ "$CURRENT_DIR" != "backend" ]]; then
    echo -e "${RED}Please run this script from the backend directory.${NC}"
    echo -e "${YELLOW}Current directory: $PWD${NC}"
    echo -e "${YELLOW}Use: cd backend && ./start.sh${NC}"
    exit 1
fi

# Create required directories if they don't exist
mkdir -p app/routes
mkdir -p app/services

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Check Python version (need 3.8 or higher)
PYTHON_VERSION=$(python3 --version | cut -d " " -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}Python version needs to be 3.8 or higher. Current version: $PYTHON_VERSION${NC}"
    exit 1
fi

# Check if virtualenv is installed
if ! command -v virtualenv &> /dev/null; then
    echo -e "${YELLOW}virtualenv not found. Installing virtualenv...${NC}"
    pip3 install virtualenv
fi

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m virtualenv venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Make the run_services.py executable
chmod +x run_services.py

# Check for existing processes and kill them
echo -e "${YELLOW}Checking for existing processes...${NC}"
if pgrep -f "app.coding_stats:app" > /dev/null; then
    echo -e "${RED}Coding Stats API already running. Killing it...${NC}"
    pkill -f "app.coding_stats:app"
fi

if pgrep -f "app.main:app" > /dev/null; then
    echo -e "${RED}ML Service already running. Killing it...${NC}"
    pkill -f "app.main:app"
fi

# Run the combined services script
echo -e "${GREEN}Starting all backend services...${NC}"
python run_services.py 