#!/bin/bash

# VibeStream Unified Deployment Script
# Merges Backend and Frontend deployment into one command

set -e

PROJECT_ROOT=$(pwd)

echo "📦 Pulling latest code..."
# git pull # Uncomment this if you are using git

# --- 1. BACKEND DEPLOY ---
echo "🐍 Deploying Backend..."
cd $PROJECT_ROOT/backend
source venv/bin/activate
pip install -r requirements.txt

# Start/Restart Backend with PM2
pm2 stop vibestream-api || true
pm2 start "venv/bin/gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 app.main:app" --name "vibestream-api"

# --- 2. FRONTEND DEPLOY ---
echo "⚛️ Deploying Frontend..."
cd $PROJECT_ROOT/frontend
npm install
npm run build

# Start/Restart Frontend with PM2
pm2 stop vibestream-frontend || true
pm2 start "npm run start" --name "vibestream-frontend" -- --port 3000

# --- 3. FINALIZE ---
pm2 save
echo "✅ Deployment Successful!"
echo "--------------------------------------------------------"
echo "Status:"
pm2 status
echo "--------------------------------------------------------"
echo "Visit: https://test.shopwithsuman.in"
