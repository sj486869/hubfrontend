#!/bin/bash

# VibeStream EC2 Deployment Script
# Run this on your Ubuntu EC2 instance

# 1. Update system
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv nginx git

# 2. Setup Directory
PROJECT_DIR="/home/ubuntu/hubbackend"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Please clone the repository into /home/ubuntu/hubbackend first!"
    exit 1
fi

cd $PROJECT_DIR

# 3. Virtual Environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Environment File
if [ ! -f ".env" ]; then
    echo "Creating empty .env file. Please update it with your MONGO_URL and AWS keys!"
    touch .env
fi

# 5. Nginx Configuration
sudo cp nginx.conf /etc/nginx/sites-available/vibestream
sudo ln -s /etc/nginx/sites-available/vibestream /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 6. Gunicorn Systemd Service
cat <<EOF | sudo tee /etc/systemd/system/vibestream.service
[Unit]
Description=Gunicorn instance to serve VibeStream API
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=$PROJECT_DIR
Environment="PATH=$PROJECT_DIR/venv/bin"
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 app.main:app

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl start vibestream
sudo systemctl enable vibestream

echo "Deployment complete! Your API should be running on Port 80."
