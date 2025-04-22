from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Import route modules
from app.routes import leetcode, codechef, hackerrank, linkedin

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("coding_stats_api")

# Create FastAPI app
app = FastAPI(
    title="Coding Stats API",
    description="API for fetching coding platform statistics",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5001",
        "http://localhost:5002",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173"   # Vite default
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix to match setupProxy.js configuration
app.include_router(leetcode.router, prefix="/api")
app.include_router(codechef.router, prefix="/api")
app.include_router(hackerrank.router, prefix="/api")
app.include_router(linkedin.router)  # LinkedIn router already includes /api prefix

@app.get("/", tags=["root"])
async def root():
    """Root endpoint that returns API information."""
    return {
        "name": "Coding Stats API",
        "version": "1.0.0",
        "endpoints": [
            {"path": "/api/leetcode/{username}", "description": "Get LeetCode user statistics"},
            {"path": "/api/codechef/{username}", "description": "Get CodeChef user statistics"},
            {"path": "/api/hackerrank/{username}", "description": "Get HackerRank user statistics"},
            {"path": "/api/linkedin/scrape", "description": "Analyze LinkedIn profile"}
        ]
    }

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5001))
    
    logger.info(f"Starting Coding Stats API server on port {port}")
    uvicorn.run("coding_stats:app", host="0.0.0.0", port=port, reload=True) 