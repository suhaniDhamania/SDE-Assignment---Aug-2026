#!/bin/bash

set -e

echo "===================================================="
echo "      Persistent Priority Queue Startup Script      "
echo "===================================================="

echo "[1/4] Installing backend dependencies..."
npm install

echo "[2/4] Ensuring PostgreSQL is running..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v brew &> /dev/null; then
    brew services start postgresql@18 2>/dev/null || brew services start postgresql 2>/dev/null || echo "Could not start PostgreSQL via Homebrew. Please ensure it is running."
  else
    echo "Homebrew not found. Please ensure PostgreSQL is running locally on port 5432."
  fi
else
  echo "Non-macOS system detected. Please ensure PostgreSQL is running on port 5432."
fi

echo "Creating database 'priority_queue_db' if it doesn't exist..."
CREATEDB_CMD="createdb"
if ! command -v createdb &> /dev/null; then
  if [ -f "/opt/homebrew/bin/createdb" ]; then
    CREATEDB_CMD="/opt/homebrew/bin/createdb"
  fi
fi

$CREATEDB_CMD priority_queue_db 2>/dev/null || echo "Database 'priority_queue_db' already exists."

echo "Applying database schema..."
PSQL_CMD="psql"
if ! command -v psql &> /dev/null; then
  if [ -f "/opt/homebrew/bin/psql" ]; then
    PSQL_CMD="/opt/homebrew/bin/psql"
  fi
fi

$PSQL_CMD -d priority_queue_db -f schema.sql || echo "Warning: Could not execute schema.sql automatically. The module will attempt to create tables on connect."

echo "[3/4] Installing React frontend dependencies..."
cd client
npm install
cd ..

echo "[4/4] Starting Backend (Port 5001) and Frontend (Port 5173)..."

npm start &
BACKEND_PID=$!

cd client
npm run dev &
FRONTEND_PID=$!

cleanup() {
  echo -e "\nStopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM EXIT

echo "----------------------------------------------------"
echo "API Server is running on: http://localhost:5001"
echo "Frontend Client is running on: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo "----------------------------------------------------"

wait
