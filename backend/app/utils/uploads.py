import os
import re
import secrets
import shutil
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, Request, UploadFile, status

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = Path(os.getenv('UPLOAD_ROOT', PROJECT_ROOT / 'uploads')).resolve()
PUBLIC_UPLOAD_PREFIX = '/media'
VIDEO_DIRECTORY = 'videos'
THUMBNAIL_DIRECTORY = 'thumbnails'
CATEGORY_DIRECTORY = 'categories'
STREAM_DIRECTORY = 'streams'
CHUNK_SIZE = 1024 * 1024

ALLOWED_VIDEO_TYPES = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
}
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
}

MAX_VIDEO_SIZE = 1024 * 1024 * 500
MAX_IMAGE_SIZE = 1024 * 1024 * 10


def ensure_upload_dirs():
    for directory in (VIDEO_DIRECTORY, THUMBNAIL_DIRECTORY, CATEGORY_DIRECTORY, STREAM_DIRECTORY):
        (UPLOAD_ROOT / directory).mkdir(parents=True, exist_ok=True)


def get_media_base_url(request: Request) -> str:
    env_base = os.getenv('EXTERNAL_BASE_URL')
    if env_base:
        return env_base.rstrip('/')

    # Try to detect from proxy headers first
    forwarded_host = request.headers.get('x-forwarded-host')
    forwarded_proto = request.headers.get('x-forwarded-proto', 'http')
    
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"
    
    return str(request.base_url).rstrip('/')


def resolve_upload_path(relative_path: str) -> Path:
    normalized = Path(relative_path)
    target_path = (UPLOAD_ROOT / normalized).resolve()
    try:
        target_path.relative_to(UPLOAD_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid media path') from exc
    return target_path


def build_asset_url(request: Request, relative_path: Path) -> str:
    base_url = get_media_base_url(request)
    return f'{base_url}{PUBLIC_UPLOAD_PREFIX}/{relative_path.as_posix()}'


def build_asset_url_from_base(base_url: str, relative_path: Path) -> str:
    return f"{base_url.rstrip('/')}{PUBLIC_UPLOAD_PREFIX}/{relative_path.as_posix()}"


def build_asset_url_from_existing(asset_url: str, relative_path: Path) -> str:
    parsed = urlparse(asset_url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid asset url')
    return build_asset_url_from_base(f'{parsed.scheme}://{parsed.netloc}', relative_path)


def rewrite_asset_url_base(asset_url: str | None, base_url: str) -> str | None:
    if not asset_url:
        return asset_url
    try:
        asset_path = resolve_asset_url_path(asset_url)
    except HTTPException:
        return asset_url
    relative_path = asset_path.relative_to(UPLOAD_ROOT)
    return build_asset_url_from_base(base_url, relative_path)


def _safe_stem(filename: str) -> str:
    stem = Path(filename or 'upload').stem
    cleaned = re.sub(r'[^a-zA-Z0-9_-]+', '-', stem).strip('-_').lower()
    return cleaned[:80] or 'upload'


def resolve_asset_url_path(asset_url: str) -> Path:
    parsed_path = urlparse(asset_url).path or asset_url
    expected_prefix = f'{PUBLIC_UPLOAD_PREFIX}/'
    if not parsed_path.startswith(expected_prefix):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid asset url')
    return resolve_upload_path(parsed_path.removeprefix(expected_prefix))


async def save_upload_file(
    upload: UploadFile,
    directory: str,
    request: Request,
) -> str:
    if directory == VIDEO_DIRECTORY:
        allowed_types = ALLOWED_VIDEO_TYPES
        max_size = MAX_VIDEO_SIZE
    else:
        allowed_types = ALLOWED_IMAGE_TYPES
        max_size = MAX_IMAGE_SIZE

    if not upload.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Uploaded file name is missing')
    if upload.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported file type')

    extension = allowed_types[upload.content_type]
    relative_path = Path(directory) / f'{_safe_stem(upload.filename)}-{secrets.token_hex(8)}{extension}'
    destination = UPLOAD_ROOT / relative_path
    total_bytes = 0

    try:
        with destination.open('wb') as file_handle:
            while True:
                chunk = await upload.read(CHUNK_SIZE)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='File exceeds size limit')
                file_handle.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    if total_bytes == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Uploaded file is empty')

    return build_asset_url(request, relative_path)


def remove_local_asset(asset_url: str | None):
    if not asset_url:
        return

    parsed_path = urlparse(asset_url).path or asset_url
    expected_prefix = f'{PUBLIC_UPLOAD_PREFIX}/'
    if not parsed_path.startswith(expected_prefix):
        return

    relative_path = Path(parsed_path.removeprefix(expected_prefix))
    target_path = (UPLOAD_ROOT / relative_path).resolve()

    try:
        target_path.relative_to(UPLOAD_ROOT)
    except ValueError:
        return

    if target_path.is_file():
        target_path.unlink()
        if relative_path.parts and relative_path.parts[0] == STREAM_DIRECTORY:
            stream_root = target_path.parent
            if stream_root.exists():
                shutil.rmtree(stream_root, ignore_errors=True)
