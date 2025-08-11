"""
Main FastAPI application module for Portfolio Risk Explorer API.

This module sets up the FastAPI application with CORS middleware and includes all API routes.
"""

# Standard library imports
import os

# Third-party imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Local imports
from db import db_ping
from routes import router as api_router

# Load environment variables
load_dotenv()

# Configuration
STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Initialize FastAPI application
app = FastAPI(
    title="Portfolio Risk Explorer API",
    version="0.1.0",
    description="API for analyzing and exploring portfolio risks"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Health check endpoint
@app.get("/health")
def health() -> dict:
    """Health check endpoint to verify the API and database are running.
    
    Returns:
        dict: Status of the API and database connection
    """
    ok = db_ping()
    return {"status": "ok" if ok else "db_error"}

# This allows running the app directly with: python -m main
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
