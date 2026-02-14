#!/bin/bash

# Pre-flight cleanup to remove zombie processes and locks
pre_cleanup() {
    echo "🧹 Cleaning up ports and zombie processes..."
    # Kill processes on ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    lsof -ti:4200 | xargs kill -9 2>/dev/null
    
    # Kill backend python processes specifically (prevents DuckDB locks)
    pgrep -f "uvicorn main:app" | xargs kill -9 2>/dev/null
    pgrep -f "prefect_flows" | xargs kill -9 2>/dev/null
    
    # AGGRESSIVE: Kill anything holding the DuckDB file lock
    echo "🔒 Releasing DB locks..."
    # Find the process ID holding the lock and kill it
    LOCK_PID=$(lsof -t data/quant.duckdb)
    if [ ! -z "$LOCK_PID" ]; then
        echo "Found process $LOCK_PID holding DuckDB lock. Terminating..."
        kill -9 $LOCK_PID 2>/dev/null
    fi
    
    # NEW: Remove lingering WAL files that cause recovery failures
    if [ -f "data/quant.duckdb.wal" ]; then
        echo "🧹 Removing lingering WAL file..."
        rm data/quant.duckdb.wal
    fi
    
    # Wait a moment for OS to release file locks
    sleep 2
    echo "✅ Environment clean."
}

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $MLFLOW_PID 2>/dev/null
    kill $PREFECT_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Run pre-flight cleanup
pre_cleanup

echo "Starting QuantHedgeFond Platform..."

# Set Project Root for Python scripts
export PROJECT_ROOT=$(pwd)
echo "📂 Project Root set to: $PROJECT_ROOT"

# Start Backend
echo "Starting Backend (FastAPI)..."
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
export HDF5_DIR=/opt/homebrew/opt/hdf5
export MLFLOW_TRACKING_URI=sqlite:///mlflow.db
# Using python -m uvicorn to ensure we use the python from the environment
# workers=1 is crucial for DuckDB concurrency safety in dev mode
python -m uvicorn main:app --reload --port 8000 --workers 1 &
BACKEND_PID=$!

# Start MLflow UI (Strategy Lab)
echo "Starting Strategy Lab (MLflow)..."
mlflow ui --port 5000 --backend-store-uri sqlite:///mlflow.db &
MLFLOW_PID=$!

# Start Prefect Server (The Janitor)
echo "Starting Automation Server (Prefect)..."
prefect server start --host 127.0.0.1 --port 4200 &
PREFECT_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend (Next.js)..."
# Using npm run dev
npm run dev &
FRONTEND_PID=$!

echo "Services are running:"
echo "Backend API:  http://localhost:8000"
echo "Strategy Lab: http://localhost:5000 (MLflow)"
echo "Automation:   http://localhost:4200 (Prefect)"
echo "Dashboard:    http://localhost:3000 (Next.js)"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID $MLFLOW_PID $PREFECT_PID
