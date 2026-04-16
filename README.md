# Full-Stack Video Streaming Platform

This repository contains a professional full-stack video streaming platform:

- `frontend/` — Next.js + Tailwind CSS app for the public website and user experience
- `backend/` — FastAPI service with JWT auth, MongoDB integration, and AWS S3 upload support

## Features

- Dark modern UI with responsive layout
- Homepage, video detail, category, search, and user profile pages
- JWT authentication and protected profile routes
- Video CRUD, comments, likes/dislikes, and view tracking
- S3 pre-signed upload URL flow for video + thumbnail uploads
- AWS deployment guidance for EC2, S3, CloudFront, and Nginx

## Setup

1. Frontend
   ```bash
   cd video-platform/frontend
   npm install
   npm run dev
   ```

2. Backend
   ```bash
   cd video-platform/backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Notes

Replace environment variables in `.env` files with your own MongoDB Atlas and AWS credentials.

## Sample Data

To add seed data for development, run:

```bash
cd backend
python sample_data.py
```

The backend includes a categories list and video metadata for testing the platform.
