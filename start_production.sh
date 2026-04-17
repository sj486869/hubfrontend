#!/bin/bash

# VibeStream Unified Production Launcher
# This script starts both the Frontend and Backend using PM2

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# 1. Setup Backend
echo "🚀 Starting Backend (FastAPI)..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
pm2 delete vibestream-api 2>/dev/null
pm2 start "venv/bin/gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 app.main:app" --name "vibestream-api"

# 2. Setup Frontend
echo "🚀 Starting Frontend (Next.js)..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
pm2 delete vibestream-frontend 2>/dev/null
pm2 start "npm start" --name "vibestream-frontend"

# 3. Save PM2 state
pm2 save

echo "✅ VibeStream is now live!"
echo "Check status with: pm2 status"
echo "Check logs with: pm2 logs"
