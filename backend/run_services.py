#!/usr/bin/env python3
import uvicorn
import os
import sys
import multiprocessing
import signal
import time
import dotenv

# Load environment variables from .env file if it exists
dotenv.load_dotenv()

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

# Check for LinkedIn credentials
linkedin_client_id = os.environ.get("REACT_APP_LINKEDIN_CLIENT_ID")
linkedin_client_secret = os.environ.get("REACT_APP_LINKEDIN_CLIENT_SECRET")
linkedin_redirect_uri = os.environ.get("REACT_APP_LINKEDIN_REDIRECT_URI")

if not linkedin_client_id or not linkedin_client_secret or not linkedin_redirect_uri:
    print("Warning: LinkedIn API credentials are not set in environment variables.")
    print("LinkedIn OAuth functionality may not work correctly.")
    print("Please set REACT_APP_LINKEDIN_CLIENT_ID, REACT_APP_LINKEDIN_CLIENT_SECRET, and REACT_APP_LINKEDIN_REDIRECT_URI")

def run_coding_stats():
    """Run the coding stats API on port 5001"""
    port = int(os.environ.get("CODING_STATS_PORT", 5001))
    print(f"Starting Coding Stats API server on port {port}")
    uvicorn.run("app.coding_stats:app", host="0.0.0.0", port=port, reload=True)

def run_ml_service():
    """Run the ML service on port 5002"""
    port = int(os.environ.get("ML_SERVICE_PORT", 5002))
    print(f"Starting ML Service API server on port {port}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

def handle_interrupt(signum, frame):
    """Handle keyboard interrupt"""
    print("\nShutting down services...")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, handle_interrupt)
    
    print("Starting SkillSync backend services...")
    
    # Create processes
    coding_stats_process = multiprocessing.Process(target=run_coding_stats)
    ml_service_process = multiprocessing.Process(target=run_ml_service)
    
    # Start processes
    coding_stats_process.start()
    ml_service_process.start()
    
    print("\n✅ All services started!")
    print("Coding Stats API available at: http://localhost:5001")
    print("ML Service API available at:   http://localhost:5002")
    print("\nPress Ctrl+C to stop all services\n")
    
    try:
        # Keep the main process running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down services...")
    finally:
        # Ensure processes are terminated when script ends
        coding_stats_process.terminate()
        ml_service_process.terminate()
        coding_stats_process.join()
        ml_service_process.join()
        print("All services stopped") 