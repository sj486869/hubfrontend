from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from ..schemas import RefreshTokenRequest, Token, UserCreate, UserLogin, UserOut
from ..database import db
from ..utils.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from ..auth import get_current_user

router = APIRouter(prefix='/auth', tags=['auth'])

@router.post('/signup', response_model=Token)
async def signup(data: UserCreate):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')

    user_doc = {
        'name': data.name,
        'email': data.email,
        'hashed_password': hash_password(data.password),
        'role': 'user',
        'liked_videos': [],
        'watch_history': [],
        'created_at': None,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    return Token(access_token=access_token, refresh_token=refresh_token, role='user')

@router.post('/login', response_model=Token)
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email})
    if not user or not verify_password(data.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    user_id = str(user['_id'])
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.get('role', 'user'),
    )

@router.post('/refresh', response_model=Token)
async def refresh(data: RefreshTokenRequest):
    try:
        payload = verify_token(data.refresh_token, expected_type=REFRESH_TOKEN_TYPE)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid refresh token')

    try:
        user_object_id = ObjectId(payload['sub'])
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid user identifier')

    user = await db.users.find_one({'_id': user_object_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')

    user_id = str(user['_id'])
    return Token(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        role=user.get('role', 'user'),
    )

@router.get('/me', response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'role': user.get('role', 'user'),
        'liked_videos': user.get('liked_videos', []),
        'watch_history': user.get('watch_history', []),
    }
