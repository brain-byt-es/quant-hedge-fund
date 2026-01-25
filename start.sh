#!/bin/bash

# Pre-flight cleanup to remove zombie processes and locks
pre_cleanup() {
    echo "🧹 Cleaning up ports and zombie processes..."
    # Kill processes on ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:8501 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    
    # Kill backend python processes specifically (prevents DuckDB locks)
    pgrep -f "backend/main.py" | xargs kill -9 2>/dev/null
    
    # AGGRESSIVE: Kill anything holding the DuckDB file lock
    echo "🔒 Releasing DB locks..."
    lsof -t backend/data/quant.duckdb | xargs kill -9 2>/dev/null
    
    # Wait a moment for OS to release file locks
    sleep 1
    echo "✅ Environment clean."
}

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    kill $MLFLOW_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Run pre-flight cleanup
pre_cleanup

echo "Starting QuantHedgeFond Platform..."

# Start Backend
echo "Starting Backend (FastAPI)..."
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
export HDF5_DIR=/opt/homebrew/opt/hdf5
# Using python -m uvicorn to ensure we use the python from the environment
# workers=1 is crucial for DuckDB concurrency safety in dev mode
python -m uvicorn main:app --reload --port 8000 --workers 1 &
BACKEND_PID=$!

# Start MLflow UI (Strategy Lab)
echo "Starting Strategy Lab (MLflow)..."
mlflow ui --port 5000 --backend-store-uri ./mlruns &
MLFLOW_PID=$!

# Start Streamlit Dashboard
echo "Starting Dashboard (Streamlit)..."
python -m streamlit run dashboard/app.py --server.port 8501 --server.headless true &
DASHBOARD_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend (Next.js)..."
# Using npm run dev
npm run dev &
FRONTEND_PID=$!

echo "Services are running:"
echo "Backend API:  http://localhost:8000"
echo "Strategy Lab: http://localhost:5000 (MLflow)"
echo "Admin Panel:  http://localhost:8501 (Streamlit)"
echo "Dashboard:    http://localhost:3000 (Next.js)"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID $DASHBOARD_PID $MLFLOW_PID
