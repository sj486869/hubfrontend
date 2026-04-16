import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
import re
from typing import List, Optional
from datetime import datetime
from ..database import db
from ..auth import get_current_user, require_admin
from ..schemas import ActionResponse, VideoCreate, VideoOut, LikeRequest
from ..utils.uploads import build_asset_url_from_base, get_media_base_url, resolve_asset_url_path, rewrite_asset_url_base
from ..utils.video_processing import create_hls_stream, detect_duration_seconds, format_duration

router = APIRouter(tags=['videos'])


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid video id')


def serialize_video(video: dict, comments: Optional[List[dict]] = None, media_base_url: Optional[str] = None) -> dict:
    created_at = video.get('created_at', '')
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    thumbnail = video.get('thumbnail_url') or video.get('thumbnail', '')
    video_url = video['video_url']
    stream_url = video.get('stream_url')
    if media_base_url:
        thumbnail = rewrite_asset_url_base(thumbnail, media_base_url) or ''
        video_url = rewrite_asset_url_base(video_url, media_base_url) or video_url
        stream_url = rewrite_asset_url_base(stream_url, media_base_url)

    return {
        'id': str(video['_id']),
        'title': video['title'],
        'description': video['description'],
        'duration': video['duration'],
        'views': video.get('views', 0),
        'likes': video.get('likes', 0),
        'dislikes': video.get('dislikes', 0),
        'category': video['category'],
        'tags': video.get('tags', []),
        'thumbnail': thumbnail,
        'video_url': video_url,
        'stream_url': stream_url,
        'created_at': created_at,
        'comments': comments or [],
    }


async def ensure_video_stream(video: dict, media_base_url: str) -> dict:
    if video.get('stream_url'):
        if not video['stream_url'].startswith(media_base_url):
            stream_path = resolve_asset_url_path(video['stream_url'])
            relative_stream = stream_path.relative_to(stream_path.parents[2])
            next_stream_url = build_asset_url_from_base(media_base_url, relative_stream)
            updated = await db.videos.find_one_and_update(
                {'_id': video['_id']},
                {'$set': {'stream_url': next_stream_url}},
                return_document=ReturnDocument.AFTER,
            )
            video = updated or video
        if not video.get('duration'):
            source_path = resolve_asset_url_path(video['video_url'])
            duration_seconds = await asyncio.to_thread(detect_duration_seconds, source_path)
            duration = format_duration(duration_seconds)
            updated = await db.videos.find_one_and_update(
                {'_id': video['_id']},
                {'$set': {'duration': duration}},
                return_document=ReturnDocument.AFTER,
            )
            return updated or video
        return video

    try:
        source_path = resolve_asset_url_path(video['video_url'])
    except HTTPException:
        return video

    if not source_path.exists():
        return video

    playlist_path, duration_seconds = await asyncio.to_thread(create_hls_stream, source_path)
    relative_playlist = playlist_path.relative_to(source_path.parents[1])
    stream_url = build_asset_url_from_base(media_base_url, relative_playlist)
    duration = format_duration(duration_seconds)
    updated = await db.videos.find_one_and_update(
        {'_id': video['_id']},
        {'$set': {'stream_url': stream_url, 'duration': duration}},
        return_document=ReturnDocument.AFTER,
    )
    return updated or video


@router.get('/videos', response_model=List[VideoOut])
async def list_videos(request: Request, search: Optional[str] = None):
    query = {}
    if search:
        terms = [re.escape(term) for term in search.split() if term.strip()]
        if terms:
            query = {
                '$and': [
                    {
                        '$or': [
                            {'title': {'$regex': term, '$options': 'i'}},
                            {'description': {'$regex': term, '$options': 'i'}},
                            {'category': {'$regex': term, '$options': 'i'}},
                            {'tags': {'$regex': term, '$options': 'i'}},
                        ]
                    }
                    for term in terms
                ]
            }
    cursor = db.videos.find(query).sort('created_at', -1).limit(30)
    videos = []
    media_base_url = get_media_base_url(request)
    async for video in cursor:
        videos.append(serialize_video(video, media_base_url=media_base_url))
    return videos

@router.get('/videos/{id}', response_model=VideoOut)
async def get_video(id: str, request: Request):
    video = await db.videos.find_one_and_update(
        {'_id': parse_object_id(id)},
        {'$inc': {'views': 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    comments_cursor = db.comments.find({'video_id': id}).sort('created_at', -1).limit(20)
    comments = []
    async for comment in comments_cursor:
        created_at = comment.get('created_at', '')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        comments.append({
            'id': str(comment['_id']),
            'author': comment['author'],
            'content': comment['content'],
            'created_at': created_at,
        })

    video = await ensure_video_stream(video, get_media_base_url(request))
    return serialize_video(video, comments, media_base_url=get_media_base_url(request))

@router.post('/videos', response_model=VideoOut)
async def create_video(video: VideoCreate, user: dict = Depends(require_admin)):
    category = await db.categories.find_one({'slug': video.category})
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category does not exist')
    if not video.duration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Duration is required')

    doc = video.model_dump()
    doc.update({'views': 0, 'likes': 0, 'dislikes': 0, 'created_at': datetime.utcnow().isoformat()})
    result = await db.videos.insert_one(doc)
    return serialize_video({**doc, '_id': result.inserted_id})

@router.post('/like')
async def like_video(payload: LikeRequest, user: dict = Depends(get_current_user)):
    video_id = parse_object_id(payload.video_id)
    video = await db.videos.find_one({'_id': video_id})
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    if payload.action == 'like':
        update = {'$inc': {'likes': 1}}
        await db.users.update_one({'_id': user['_id']}, {'$addToSet': {'liked_videos': payload.video_id}})
    else:
        update = {'$inc': {'dislikes': 1}}
    updated = await db.videos.find_one_and_update({'_id': video_id}, update, return_document=ReturnDocument.AFTER)
    return {
        'likes': updated.get('likes', 0),
        'dislikes': updated.get('dislikes', 0),
    }


@router.post('/videos/{id}/watch', response_model=ActionResponse)
async def track_watch(id: str, user: dict = Depends(get_current_user)):
    video_id = parse_object_id(id)
    video = await db.videos.find_one({'_id': video_id})
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    await db.users.update_one(
        {'_id': user['_id']},
        {
            '$pull': {'watch_history': id},
        },
    )
    await db.users.update_one(
        {'_id': user['_id']},
        {
            '$push': {
                'watch_history': {
                    '$each': [id],
                    '$position': 0,
                    '$slice': 24,
                }
            }
        },
    )
    return {'message': 'Watch history updated'}
