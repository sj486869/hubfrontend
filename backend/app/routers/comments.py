from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from typing import List, Optional
from ..auth import get_current_user
from ..database import db
from ..schemas import CommentCreate, CommentOut, ActionResponse

router = APIRouter(tags=['comments'])

def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid identifier')

@router.get('/videos/{video_id}/comments', response_model=List[CommentOut])
async def list_comments(video_id: str, limit: int = 50, skip: int = 0):
    """
    Retrieve paginated comments for a specific video.
    """
    cursor = db.comments.find({'video_id': video_id}).sort('created_at', -1).skip(skip).limit(limit)
    comments = []
    async for comment in cursor:
        created_at = comment.get('created_at', '')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        comments.append({
            'id': str(comment['_id']),
            'author': comment['author'],
            'content': comment['content'],
            'created_at': created_at,
        })
    return comments

@router.post('/comments', response_model=CommentOut)
async def create_comment(data: CommentCreate, user: dict = Depends(get_current_user)):
    """
    Post a new comment. Automatically associates the current user as the author.
    """
    # Verify video existence before commenting
    try:
        video_oid = ObjectId(data.video_id)
    except InvalidId:
       raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid video_id')
       
    video = await db.videos.find_one({'_id': video_oid})
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

    comment_doc = {
        'video_id': data.video_id,
        'author': user['name'],
        'author_email': user['email'], # Stored to verify deletion permissions
        'content': data.content,
        'created_at': datetime.utcnow().isoformat(),
    }
    
    result = await db.comments.insert_one(comment_doc)
    
    return {
        'id': str(result.inserted_id),
        'author': comment_doc['author'],
        'content': comment_doc['content'],
        'created_at': comment_doc['created_at'],
    }

@router.delete('/comments/{id}', response_model=ActionResponse)
async def delete_comment(id: str, user: dict = Depends(get_current_user)):
    """
    Delete a comment. Restricted to the original author or an administrator.
    """
    comment_oid = parse_object_id(id)
    comment = await db.comments.find_one({'_id': comment_oid})
    
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Comment not found')
    
    # Authorization: Must be the author or an admin
    is_author = comment.get('author_email') == user['email']
    is_admin = user.get('role') == 'admin'
    
    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail='You do not have permission to delete this comment'
        )
    
    await db.comments.delete_one({'_id': comment_oid})
    
    return {'message': 'Comment successfully deleted'}
