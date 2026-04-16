# AWS Deployment and CDN Setup

## 1. AWS S3 Setup

1. Create an S3 bucket for video assets and thumbnails.
2. Enable `Block Public Access` only if you plan to use CloudFront with an origin access identity; otherwise, use pre-signed URLs for upload and public-read publishing.
3. Create an IAM policy granting `s3:PutObject`, `s3:GetObject`, and `s3:ListBucket` for the bucket.
4. Attach the policy to a dedicated IAM user or role.
5. Add the IAM credentials to your backend `.env` file.

## 2. AWS CloudFront Setup

1. Create a CloudFront distribution with the S3 bucket as the origin.
2. Configure `Allowed HTTP Methods` to include `GET, HEAD`.
3. Set `Viewer Protocol Policy` to `Redirect HTTP to HTTPS`.
4. Optionally add a custom domain and SSL certificate.
5. Use CloudFront distribution URLs in the frontend for video playback if you want CDN delivery.

## 3. AWS EC2 Deployment

1. Launch an Ubuntu EC2 instance.
2. Install Python, pip, and virtualenv.
3. Install Nginx and configure it using `backend/nginx.conf`.
4. Copy the backend project to the server.
5. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
6. Create the `.env` file with MongoDB and AWS credentials.
7. Start FastAPI with Uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
8. Use a process manager such as `systemd` or `supervisor` for production.

## 4. Vercel Frontend Deployment

1. Connect the `frontend` folder to Vercel.
2. Add environment variable `NEXT_PUBLIC_API_URL` pointing to the backend URL.
3. Enable automatic deployment from GitHub.
4. In Vercel, set the build command to `npm run build` and the output directory to `.next`.
