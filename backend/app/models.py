from pydantic import BaseModel, EmailStr, Field
from typing import List, Literal, Optional

class UserModel(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Literal['admin', 'user'] = 'user'
    liked_videos: List[str] = Field(default_factory=list)
    watch_history: List[str] = Field(default_factory=list)

class CategoryModel(BaseModel):
    slug: str
    name: str
    thumbnail_url: Optional[str] = None
    video_count: int

class VideoModel(BaseModel):
    id: str
    title: str
    description: str
    duration: str
    views: int
    likes: int
    dislikes: int
    category: str
    tags: List[str]
    thumbnail_url: str
    video_url: str
    created_at: str

class CommentModel(BaseModel):
    id: str
    video_id: str
    author: str
    content: str
    created_at: str
