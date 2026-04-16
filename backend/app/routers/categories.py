from fastapi import APIRouter, HTTPException, Request
from typing import List
from ..database import db
from ..schemas import CategoryOut, VideoOut
from .videos import serialize_video
from ..utils.uploads import rewrite_asset_url_base

router = APIRouter(tags=['categories'])

def serialize_category(entry: dict, video_count: int, media_base_url: str | None = None) -> dict:
    thumbnail_url = entry.get('thumbnail_url')
    if media_base_url:
        thumbnail_url = rewrite_asset_url_base(thumbnail_url, media_base_url)
    return {
        'slug': entry['slug'],
        'name': entry['name'],
        'thumbnail_url': thumbnail_url,
        'video_count': video_count,
    }



@router.get('/categories', response_model=List[CategoryOut])
async def list_categories(request: Request):
    categories = []
    media_base_url = str(request.base_url).rstrip('/')
    cursor = db.categories.find().sort('name', 1)
    async for entry in cursor:
        count = await db.videos.count_documents({'category': entry['slug']})
        categories.append(serialize_category(entry, count, media_base_url))
    return categories

@router.get('/category/{slug}', response_model=List[VideoOut])
async def get_category(slug: str, request: Request):
    category_exists = await db.categories.find_one({'slug': slug})
    if not category_exists:
        raise HTTPException(status_code=404, detail='Category not found')

    cursor = db.videos.find({'category': slug}).sort('created_at', -1).limit(50)
    videos = []
    media_base_url = str(request.base_url).rstrip('/')
    async for video in cursor:
        videos.append(serialize_video(video, media_base_url=media_base_url))
    return videos
