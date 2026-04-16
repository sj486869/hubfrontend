from fastapi import APIRouter, Depends
from datetime import datetime
from ..auth import get_current_user
from ..database import db
from ..schemas import CommentCreate, CommentOut

router = APIRouter(tags=['comments'])

@router.post('/comments', response_model=CommentOut)
async def create_comment(data: CommentCreate, user: dict = Depends(get_current_user)):
    comment = {
        'video_id': data.video_id,
        'author': user['name'],
        'content': data.content,
        'created_at': datetime.utcnow().isoformat(),
    }
    result = await db.comments.insert_one(comment)
    return {
        'id': str(result.inserted_id),
        'author': comment['author'],
        'content': comment['content'],
        'created_at': comment['created_at'],
    }
