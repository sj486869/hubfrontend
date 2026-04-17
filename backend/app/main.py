import os
import mimetypes
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()
mimetypes.add_type('application/vnd.apple.mpegurl', '.m3u8')
mimetypes.add_type('video/mp2t', '.ts')

from .utils.security import hash_password, verify_password
from .routers.auth import router as auth_router
from .routers.videos import router as videos_router
from .routers.categories import router as categories_router
from .routers.comments import router as comments_router
from .routers.s3 import router as s3_router
from .routers.admin import router as admin_router
from .utils.uploads import PUBLIC_UPLOAD_PREFIX, UPLOAD_ROOT, ensure_upload_dirs, resolve_upload_path

app = FastAPI(title='VibeStream API', version='1.0.0')
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = sorted({
    os.getenv('FRONTEND_URL', 'http://localhost:3000'),
    os.getenv('FRONTEND_URL_PROD', 'https://shopwithsuman.in'),
    'https://shopwithsuman.in',
    'https://www.shopwithsuman.in',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://10.237.104.60:3000',  # local WiFi — phone access
    'http://10.237.104.60:3001',
    'http://10.237.104.60:3002',
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allow localhost, 127.0.0.1, shopwithsuman.in (and www subdomain), and any LAN IP
    allow_origin_regex=r'https?://(localhost|127\.0\.0\.1|((www|api)\.)?shopwithsuman\.in|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

ensure_upload_dirs()

app.include_router(auth_router, prefix="/api")
app.include_router(videos_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(comments_router, prefix="/api")
app.include_router(s3_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

@app.get('/api')
async def root():
    return {'message': 'VibeStream API is running'}


def _iter_file_range(file_path, start: int, end: int, chunk_size: int = 1024 * 1024):
    with file_path.open('rb') as file_handle:
        file_handle.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = file_handle.read(min(chunk_size, remaining))
            if not chunk:
                break
            yield chunk
            remaining -= len(chunk)


@app.api_route(f'{PUBLIC_UPLOAD_PREFIX}/{{file_path:path}}', methods=['GET', 'HEAD'])
async def serve_media(file_path: str, request: Request):
    target_path = resolve_upload_path(file_path)
    if not target_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Media file not found')

    file_size = target_path.stat().st_size
    media_type = mimetypes.guess_type(str(target_path))[0] or 'application/octet-stream'
    headers = {
        'Accept-Ranges': 'bytes',
        'Content-Length': str(file_size),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }

    range_header = request.headers.get('range')
    if not range_header:
        if request.method == 'HEAD':
            return Response(status_code=status.HTTP_200_OK, headers=headers, media_type=media_type)
        return StreamingResponse(
            _iter_file_range(target_path, 0, file_size - 1),
            status_code=status.HTTP_200_OK,
            headers=headers,
            media_type=media_type,
        )

    units, _, range_value = range_header.partition('=')
    if units != 'bytes' or '-' not in range_value:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail='Invalid range header')

    start_raw, end_raw = range_value.split('-', 1)
    if not start_raw and not end_raw:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail='Invalid range header')

    if start_raw:
        start = int(start_raw)
        end = int(end_raw) if end_raw else file_size - 1
    else:
        suffix_length = int(end_raw)
        start = max(file_size - suffix_length, 0)
        end = file_size - 1

    if start < 0 or end >= file_size or start > end:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail='Requested range not satisfiable')

    content_length = end - start + 1
    partial_headers = {
        **headers,
        'Content-Length': str(content_length),
        'Content-Range': f'bytes {start}-{end}/{file_size}',
    }
    if request.method == 'HEAD':
        return Response(status_code=status.HTTP_206_PARTIAL_CONTENT, headers=partial_headers, media_type=media_type)

    return StreamingResponse(
        _iter_file_range(target_path, start, end),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=partial_headers,
        media_type=media_type,
    )

@app.on_event('startup')
async def startup_event():
    from .database import db
    await db.users.create_index('email', unique=True)
    await db.categories.create_index('slug', unique=True)
    await db.videos.create_index('category')
    await db.videos.create_index('title')
    await db.comments.create_index('video_id')

    admin_email = os.getenv('ADMIN_EMAIL')
    admin_password = os.getenv('ADMIN_PASSWORD')
    admin_name = os.getenv('ADMIN_NAME', 'Platform Admin')
    if admin_email and admin_password:
        existing_admin = await db.users.find_one({'email': admin_email})
        if not existing_admin:
            await db.users.insert_one({
                'name': admin_name,
                'email': admin_email,
                'hashed_password': hash_password(admin_password),
                'role': 'admin',
                'liked_videos': [],
                'watch_history': [],
                'created_at': None,
            })
        else:
            updates = {}
            if existing_admin.get('role') != 'admin':
                updates['role'] = 'admin'
            if existing_admin.get('name') != admin_name:
                updates['name'] = admin_name
            if not verify_password(admin_password, existing_admin['hashed_password']):
                updates['hashed_password'] = hash_password(admin_password)
            if updates:
                await db.users.update_one({'_id': existing_admin['_id']}, {'$set': updates})
