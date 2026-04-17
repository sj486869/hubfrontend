#!/bin/bash

# VibeStream Full Stack EC2 Setup Script
# Run this on your fresh Ubuntu EC2 instance

set -e

echo "🚀 Starting EC2 Setup..."

# 1. Update and install basic dependencies
sudo apt-get update
sudo apt-get install -y git curl python3-pip python3-venv nginx ffmpeg

# 2. Install Node.js (via NVM)
if [ ! -d "$HOME/.nvm" ]; then
    echo "📦 Installing NVM and Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
else
    echo "✅ NVM already installed"
fi

# 3. Install PM2 globally
npm install -g pm2

# 4. Setup Backend Environment
echo "🐍 Setting up Python Virtual Environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 5. Setup Frontend Environment
echo "⚛️ Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

# 6. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp backend/nginx.conf /etc/nginx/sites-available/vibestream
if [ ! -f "/etc/nginx/sites-enabled/vibestream" ]; then
    sudo ln -s /etc/nginx/sites-available/vibestream /etc/nginx/sites-enabled/
fi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Setup Complete!"
echo "--------------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Update your backend/.env with MongoDB and AWS keys."
echo "2. Update your frontend/.env.local (use https://shopwithsuman.in/api)."
echo "3. Run 'bash deploy.sh' to start the application."
echo "--------------------------------------------------------"
