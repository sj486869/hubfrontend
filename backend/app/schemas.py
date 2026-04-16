from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from typing import Literal

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    role: Literal['admin', 'user']

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Literal['admin', 'user']
    liked_videos: List[str] = Field(default_factory=list)
    watch_history: List[str] = Field(default_factory=list)

class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    thumbnail_url: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    slug: Optional[str] = Field(default=None, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    thumbnail_url: Optional[str] = None

class CategoryOut(BaseModel):
    slug: str
    name: str
    thumbnail_url: Optional[str] = None
    video_count: int

class VideoCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=4000)
    category: str
    duration: Optional[str] = Field(default=None, min_length=3, max_length=20)
    thumbnail_url: str
    video_url: str
    tags: List[str] = Field(default_factory=list)

class VideoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, min_length=2, max_length=4000)
    category: Optional[str] = None
    duration: Optional[str] = Field(default=None, min_length=3, max_length=20)
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = None

class CommentCreate(BaseModel):
    video_id: str
    content: str

class CommentOut(BaseModel):
    id: str
    author: str
    content: str
    created_at: str

class VideoOut(BaseModel):
    id: str
    title: str
    description: str
    duration: str
    views: int
    likes: int
    dislikes: int
    category: str
    tags: List[str]
    thumbnail: str
    video_url: str
    stream_url: Optional[str] = None
    created_at: str
    comments: List[CommentOut] = Field(default_factory=list)

class LikeRequest(BaseModel):
    video_id: str
    action: Literal['like', 'dislike']

class PresignRequest(BaseModel):
    key: str
    content_type: str
    file_size: int = Field(gt=0)

class PresignResponse(BaseModel):
    upload_url: str
    asset_url: str

class ActionResponse(BaseModel):
    message: str
