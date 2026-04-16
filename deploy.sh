#!/bin/bash

# VibeStream Robust Unified Deployment Script 🚀
# Handles Backend (FastAPI) and Frontend (Next.js) with PM2

set -e

# 1. Environment Detection & Activation
PROJECT_ROOT=$(pwd)

# Load NVM (essential for Ubuntu EC2)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo "✅ NVM loaded successfully"
else
    echo "⚠️ NVM not found at $NVM_DIR/nvm.sh. Using system Node/NPM."
fi

# 2. BACKEND DEPLOYMENT (FastAPI)
echo "--------------------------------------------------------"
echo "🐍 Deploying Backend..."
echo "--------------------------------------------------------"
cd "$PROJECT_ROOT/backend"

# Ensure Virtual Environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Virtual Environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "💾 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Start/Restart via PM2
echo "🔄 Starting Backend with PM2..."
pm2 delete vibestream-api 2>/dev/null || true
pm2 start "venv/bin/gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 app.main:app" --name "vibestream-api"

# 3. FRONTEND DEPLOYMENT (Next.js)
echo "--------------------------------------------------------"
echo "⚛️ Deploying Frontend..."
echo "--------------------------------------------------------"
cd "$PROJECT_ROOT/frontend"

echo "💾 Installing Node dependencies..."
npm install

echo "🏗️ Building Frontend for Production..."
# This bakes NEXT_PUBLIC_API_URL into the client bundle
npm run build

# Start/Restart via PM2
echo "🔄 Starting Frontend with PM2..."
pm2 delete vibestream-frontend 2>/dev/null || true
# Note: npm run start requires port 3000 to be open
pm2 start "npm run start" --name "vibestream-frontend" -- --port 3000

# 4. FINALIZE
echo "--------------------------------------------------------"
pm2 save
echo "✅ DEPLOYMENT COMPLETE!"
echo "--------------------------------------------------------"
echo "Status Check:"
pm2 status
echo "--------------------------------------------------------"
echo "Visit your site: https://test.shopwithsuman.in"
echo "Check logs if any app is offline: pm2 logs"
