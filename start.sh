#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    kill $DASHBOARD_PID
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "Starting QuantHedgeFond Platform..."

# Start Backend
echo "Starting Backend (FastAPI)..."
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
export HDF5_DIR=/opt/homebrew/opt/hdf5
# Using python -m uvicorn to ensure we use the python from the environment
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

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
echo "Backend API: http://localhost:8000"
echo "Dashboard:   http://localhost:8501"
echo "Frontend:    http://localhost:3000"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID $DASHBOARD_PID
