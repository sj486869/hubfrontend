from fastapi import APIRouter, Depends, HTTPException, status
from ..auth import require_admin
from ..schemas import PresignRequest, PresignResponse
from ..utils.aws import create_presigned_upload_url

router = APIRouter(prefix='/s3', tags=['storage'])

ALLOWED_MIME_TYPES = {
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
}
ALLOWED_KEY_PREFIXES = ('videos/', 'thumbnails/', 'categories/')
MAX_FILE_SIZES = {
    'video/mp4': 1024 * 1024 * 500,
    'video/webm': 1024 * 1024 * 500,
    'image/jpeg': 1024 * 1024 * 10,
    'image/png': 1024 * 1024 * 10,
}

@router.post('/presign', response_model=PresignResponse)
async def generate_presign(data: PresignRequest, user: dict = Depends(require_admin)):
    if '..' in data.key or data.key.startswith('/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid key path')
    if not data.key.startswith(ALLOWED_KEY_PREFIXES):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid upload location')
    if data.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported file type')
    if data.file_size > MAX_FILE_SIZES[data.content_type]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='File exceeds size limit')

    try:
        return create_presigned_upload_url(data.key, data.content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
