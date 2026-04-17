from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
async def signup(data: UserCreate, request: Request, response: Response):
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
    
    # Dynamic cookie settings based on connection security
    # SameSite=None requires Secure=True (which requires HTTPS)
    is_secure = request.url.scheme == "https"
    samesite = "none" if is_secure else "lax"

    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*7)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*30)
    
    return Token(access_token=access_token, refresh_token=refresh_token, role='user')

@router.post('/login', response_model=Token)
async def login(data: UserLogin, request: Request, response: Response):
    user = await db.users.find_one({'email': data.email})
    if not user or not verify_password(data.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    user_id = str(user['_id'])
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Dynamic cookie settings based on connection security
    is_secure = request.url.scheme == "https"
    samesite = "none" if is_secure else "lax"

    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*7)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*30)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.get('role', 'user'),
    )

@router.post('/refresh', response_model=Token)
async def refresh(request: Request, response: Response, data: RefreshTokenRequest = None):
    token = request.cookies.get('refresh_token')
    if not token and data:
        token = data.refresh_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing refresh token')

    try:
        payload = verify_token(token, expected_type=REFRESH_TOKEN_TYPE)
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
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Dynamic cookie settings based on connection security
    is_secure = request.url.scheme == "https"
    samesite = "none" if is_secure else "lax"

    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*7)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, samesite=samesite, secure=is_secure, path="/", max_age=3600*24*30)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.get('role', 'user'),
    )

@router.post('/logout')
async def logout(request: Request, response: Response):
    is_secure = request.url.scheme == "https"
    samesite = "none" if is_secure else "lax"

    response.delete_cookie(key="access_token", samesite=samesite, secure=is_secure, path='/')
    response.delete_cookie(key="refresh_token", samesite=samesite, secure=is_secure, path='/')
    return {"message": "Logged out successfully"}

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

@router.get('/debug')
async def debug_auth(request: Request):
    return {
        "cookies": request.cookies,
        "headers": {k: v for k, v in request.headers.items() if k.lower() in ["x-forwarded-proto", "x-forwarded-for", "host", "origin"]},
        "is_https_detected": request.url.scheme == "https",
        "client_ip": request.client.host if request.client else None
    }
