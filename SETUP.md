# SkillSync Backend Setup

This document explains how to set up and run the SkillSync backend services.

## Architecture Overview

SkillSync uses a dual-backend architecture:

1. **Python Backend (port 5001)**
   - Handles coding platform API requests (LeetCode, CodeChef, HackerRank)
   - Built with FastAPI

2. **Node.js Backend (port 5002)**
   - Handles career recommendations and other services
   - Built with Express.js

3. **React Frontend (port 3000)**
   - Main web application
   - Connects to both backends through proxy configuration

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- pip (Python package manager)

## Running the Application

### Option 1: All-in-One Solution (Recommended)

Run the entire application (both backends and frontend) with a single command:

```bash
./run-all.sh
```

This script:
- Handles directory detection (works from any subdirectory)
- Checks and kills any existing processes on required ports
- Starts the Python backend on port 5001 in the background
- Starts the Node.js server on port 5002 in the background
- Starts the React frontend on port 3000 in the foreground
- Saves backend logs to the logs directory
- Automatically cleans up server processes when you exit the frontend

### Option 2: Individual Components

Run each component separately:

```bash
# Python Backend (port 5001)
./run-backend.sh

# Node.js Server (port 5002)
./run-node.sh

# React Frontend (port 3000)
./run-frontend.sh
```

These scripts can be run from any directory in the project.

### Option 3: Running Components Manually

#### Python Backend

```bash
cd backend
chmod +x start.sh
PORT=5001 ./start.sh
```

#### Node.js Backend

```bash
PORT=5002 npm run server:dev
```

#### React Frontend

```bash
npm start
```

## API Endpoints

### Python Backend (port 5001)

- `/api/leetcode/{username}` - Get LeetCode user statistics
- `/api/codechef/{username}` - Get CodeChef user statistics
- `/api/hackerrank/{username}` - Get HackerRank user statistics

### Node.js Backend (port 5002)

- `/career-recommendations` - Get career recommendations based on skills
- `/available-skills` - Get available skills for career matching
- `/job-categories` - Get job categories and roles

## Proxy Configuration

The React application uses proxy configuration to route API requests correctly:

- Requests to `/api` are routed to the Python backend (port 5001)
- Requests to `/api/ml` are routed to the Node.js backend (port 5002)

## Troubleshooting

### Port Conflicts

If you see "Address already in use" errors:

1. Check which process is using the port:
   ```bash
   lsof -i:5001
   lsof -i:5002
   lsof -i:3000
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>
   ```

3. Or use our scripts that automatically handle port conflicts:
   ```bash
   ./run-all.sh
   ```

### Backend Logs

When using the `run-all.sh` script, backend logs are saved to:
- `logs/python-backend.log` - Python backend logs 
- `logs/node-server.log` - Node.js server logs

### Python Virtual Environment Issues

If you have issues with the Python backend:

1. Check the virtual environment setup:
   ```bash
   cd backend
   python3 -m virtualenv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Run the backend manually with explicit port:
   ```bash
   PORT=5001 python run_coding_stats.py
   ``` 