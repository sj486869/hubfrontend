import asyncio
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from pydantic import ValidationError
from pymongo import ReturnDocument

from ..auth import require_admin
from ..database import db
from ..schemas import ActionResponse, CategoryCreate, CategoryOut, CategoryUpdate, VideoCreate, VideoOut, VideoUpdate
from ..utils.uploads import (
    CATEGORY_DIRECTORY,
    THUMBNAIL_DIRECTORY,
    VIDEO_DIRECTORY,
    build_asset_url,
    remove_local_asset,
    resolve_asset_url_path,
    save_upload_file,
)
from ..utils.video_processing import create_hls_stream, format_duration
from .categories import serialize_category
from .videos import serialize_video

router = APIRouter(prefix='/admin', tags=['admin'])


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid object id')


def parse_tags(raw_value) -> list[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, list):
        values = raw_value
    else:
        values = [raw_value]

    tags = []
    for value in values:
        if isinstance(value, str):
            parts = value.split(',')
        else:
            continue
        for part in parts:
            tag = part.strip()
            if tag:
                tags.append(tag)
    return tags


def is_upload_file(file_value) -> bool:
    return bool(getattr(file_value, 'filename', None)) and callable(getattr(file_value, 'read', None))


def ensure_upload_instance(file_value, label: str) -> UploadFile:
    if not is_upload_file(file_value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'{label} is required')
    return file_value


def validation_exception(exc: ValidationError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())


async def create_stream_assets(video_url: str, request: Request) -> tuple[str, str]:
    source_path = resolve_asset_url_path(video_url)
    playlist_path, duration_seconds = await asyncio.to_thread(create_hls_stream, source_path)
    relative_playlist = playlist_path.relative_to(source_path.parents[1])
    stream_url = build_asset_url(request, relative_playlist)
    return stream_url, format_duration(duration_seconds)


@router.post('/upload-video', response_model=VideoOut)
async def upload_video(request: Request, user: dict = Depends(require_admin)):
    content_type = request.headers.get('content-type', '')

    if content_type.startswith('multipart/form-data'):
        form = await request.form()

        try:
            metadata = VideoCreate(
                title=str(form.get('title') or '').strip(),
                description=str(form.get('description') or '').strip(),
                category=str(form.get('category') or '').strip(),
                duration=None,
                thumbnail_url='pending',
                video_url='pending',
                tags=parse_tags(form.getlist('tags') or form.get('tags')),
            )
        except ValidationError as exc:
            raise validation_exception(exc)

        category = await db.categories.find_one({'slug': metadata.category})
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category does not exist')

        video_file = ensure_upload_instance(form.get('video_file'), 'Video file')
        thumbnail_file = ensure_upload_instance(form.get('thumbnail_file'), 'Thumbnail file')

        video_url = await save_upload_file(video_file, VIDEO_DIRECTORY, request)
        try:
            thumbnail_url = await save_upload_file(thumbnail_file, THUMBNAIL_DIRECTORY, request)
        except Exception:
            remove_local_asset(video_url)
            raise

        try:
            stream_url, detected_duration = await create_stream_assets(video_url, request)
        except Exception:
            remove_local_asset(video_url)
            remove_local_asset(thumbnail_url)
            raise

        doc = metadata.model_dump()
        doc.update(
            {
                'duration': detected_duration,
                'video_url': video_url,
                'stream_url': stream_url,
                'thumbnail_url': thumbnail_url,
                'views': 0,
                'likes': 0,
                'dislikes': 0,
                'created_at': datetime.utcnow().isoformat(),
            }
        )
        result = await db.videos.insert_one(doc)
        return serialize_video({**doc, '_id': result.inserted_id})

    try:
        payload = VideoCreate(**await request.json())
    except ValidationError as exc:
        raise validation_exception(exc)

    category = await db.categories.find_one({'slug': payload.category})
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category does not exist')

    doc = payload.model_dump()
    doc.update({'views': 0, 'likes': 0, 'dislikes': 0, 'created_at': datetime.utcnow().isoformat()})
    result = await db.videos.insert_one(doc)
    return serialize_video({**doc, '_id': result.inserted_id})


@router.post('/category', response_model=CategoryOut)
async def create_category(request: Request, user: dict = Depends(require_admin)):
    content_type = request.headers.get('content-type', '')

    if content_type.startswith('multipart/form-data'):
        form = await request.form()
        try:
            payload = CategoryCreate(
                name=str(form.get('name') or '').strip(),
                slug=str(form.get('slug') or '').strip(),
            )
        except ValidationError as exc:
            raise validation_exception(exc)

        existing = await db.categories.find_one({'slug': payload.slug})
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category slug already exists')

        thumbnail_url = None
        thumbnail_file = form.get('thumbnail_file')
        if is_upload_file(thumbnail_file):
            thumbnail_url = await save_upload_file(thumbnail_file, CATEGORY_DIRECTORY, request)

        doc = {
            'name': payload.name,
            'slug': payload.slug,
            'thumbnail_url': thumbnail_url,
            'created_at': datetime.utcnow().isoformat(),
        }
        await db.categories.insert_one(doc)
        return serialize_category(doc, 0)

    try:
        payload = CategoryCreate(**await request.json())
    except ValidationError as exc:
        raise validation_exception(exc)

    existing = await db.categories.find_one({'slug': payload.slug})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category slug already exists')

    doc = {
        'name': payload.name,
        'slug': payload.slug,
        'thumbnail_url': payload.thumbnail_url,
        'created_at': datetime.utcnow().isoformat(),
    }
    await db.categories.insert_one(doc)
    return serialize_category(doc, 0)


@router.delete('/category/{slug}', response_model=ActionResponse)
async def delete_category(slug: str, user: dict = Depends(require_admin)):
    category = await db.categories.find_one_and_delete({'slug': slug})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Category not found')

    if category.get('thumbnail_url'):
        remove_local_asset(category.get('thumbnail_url'))

    return {'message': 'Category deleted successfully'}


@router.put('/category/{slug}', response_model=CategoryOut)
async def update_category(slug: str, request: Request, user: dict = Depends(require_admin)):
    existing_category = await db.categories.find_one({'slug': slug})
    if not existing_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Category not found')

    content_type = request.headers.get('content-type', '')
    data = {}
    new_thumbnail_url = None

    if content_type.startswith('multipart/form-data'):
        form = await request.form()
        for field in ('name', 'slug'):
            if field in form:
                value = str(form.get(field) or '').strip()
                if value:
                    data[field] = value

        try:
            payload = CategoryUpdate(**data)
        except ValidationError as exc:
            raise validation_exception(exc)

        data = {key: value for key, value in payload.model_dump().items() if value is not None}

        thumbnail_file = form.get('thumbnail_file')
        if is_upload_file(thumbnail_file):
            new_thumbnail_url = await save_upload_file(thumbnail_file, CATEGORY_DIRECTORY, request)
            data['thumbnail_url'] = new_thumbnail_url
    else:
        try:
            payload = CategoryUpdate(**await request.json())
        except ValidationError as exc:
            raise validation_exception(exc)
        data = {key: value for key, value in payload.model_dump().items() if value is not None}

    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No update data provided')

    # Slug existence check
    if 'slug' in data and data['slug'] != slug:
        conflict = await db.categories.find_one({'slug': data['slug']})
        if conflict:
            if new_thumbnail_url:
                remove_local_asset(new_thumbnail_url)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category slug already exists')

    updated = await db.categories.find_one_and_update(
        {'slug': slug},
        {'$set': data},
        return_document=ReturnDocument.AFTER,
    )

    if not updated:
        if new_thumbnail_url:
            remove_local_asset(new_thumbnail_url)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Category not found')

    if new_thumbnail_url and existing_category.get('thumbnail_url') != new_thumbnail_url:
        remove_local_asset(existing_category.get('thumbnail_url'))

    if 'slug' in data and data['slug'] != slug:
        # Migrate associated videos
        await db.videos.update_many({'category': slug}, {'$set': {'category': data['slug']}})

    # Calculate count for serialization
    video_count = await db.videos.count_documents({'category': updated['slug']})
    return serialize_category(updated, video_count)


@router.delete('/video/{id}', response_model=ActionResponse)
async def delete_video(id: str, user: dict = Depends(require_admin)):
    video = await db.videos.find_one_and_delete({'_id': parse_object_id(id)})
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    remove_local_asset(video.get('video_url'))
    remove_local_asset(video.get('stream_url'))
    remove_local_asset(video.get('thumbnail_url'))
    return {'message': 'Video deleted successfully'}


@router.put('/video/{id}', response_model=VideoOut)
async def update_video(id: str, request: Request, user: dict = Depends(require_admin)):
    object_id = parse_object_id(id)
    existing_video = await db.videos.find_one({'_id': object_id})
    if not existing_video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    content_type = request.headers.get('content-type', '')
    data = {}
    new_video_url = None
    new_stream_url = None
    new_detected_duration = None
    new_thumbnail_url = None

    if content_type.startswith('multipart/form-data'):
        form = await request.form()
        for field in ('title', 'description', 'category'):
            if field in form:
                value = str(form.get(field) or '').strip()
                if value:
                    data[field] = value
        if 'tags' in form:
            data['tags'] = parse_tags(form.getlist('tags') or form.get('tags'))

        try:
            payload = VideoUpdate(**data)
        except ValidationError as exc:
            raise validation_exception(exc)
        data = {key: value for key, value in payload.model_dump().items() if value is not None}

        if 'category' in data:
            category = await db.categories.find_one({'slug': data['category']})
            if not category:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category does not exist')

        video_file = form.get('video_file')
        if is_upload_file(video_file):
            new_video_url = await save_upload_file(video_file, VIDEO_DIRECTORY, request)
            try:
                new_stream_url, new_detected_duration = await create_stream_assets(new_video_url, request)
            except Exception:
                remove_local_asset(new_video_url)
                raise
            data['video_url'] = new_video_url
            data['stream_url'] = new_stream_url
            data['duration'] = new_detected_duration

        thumbnail_file = form.get('thumbnail_file')
        if is_upload_file(thumbnail_file):
            try:
                new_thumbnail_url = await save_upload_file(thumbnail_file, THUMBNAIL_DIRECTORY, request)
            except Exception:
                if new_video_url:
                    remove_local_asset(new_video_url)
                if new_stream_url:
                    remove_local_asset(new_stream_url)
                raise
            data['thumbnail_url'] = new_thumbnail_url
    else:
        try:
            payload = VideoUpdate(**await request.json())
        except ValidationError as exc:
            raise validation_exception(exc)
        data = {key: value for key, value in payload.model_dump().items() if value is not None}

        if 'category' in data:
            category = await db.categories.find_one({'slug': data['category']})
            if not category:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Category does not exist')

    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No update data provided')

    updated = await db.videos.find_one_and_update(
        {'_id': object_id},
        {'$set': data},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        if new_video_url:
            remove_local_asset(new_video_url)
        if new_stream_url:
            remove_local_asset(new_stream_url)
        if new_thumbnail_url:
            remove_local_asset(new_thumbnail_url)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    if new_video_url and existing_video.get('video_url') != new_video_url:
        remove_local_asset(existing_video.get('video_url'))
    if new_stream_url and existing_video.get('stream_url') != new_stream_url:
        remove_local_asset(existing_video.get('stream_url'))
    if new_thumbnail_url and existing_video.get('thumbnail_url') != new_thumbnail_url:
        remove_local_asset(existing_video.get('thumbnail_url'))

    return serialize_video(updated)
