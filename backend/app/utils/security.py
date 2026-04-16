import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'supersecretkey')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '7'))
ACCESS_TOKEN_TYPE = 'access'
REFRESH_TOKEN_TYPE = 'refresh'


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    expires = datetime.utcnow() + expires_delta
    payload = {'sub': subject, 'type': token_type, 'exp': expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    return create_token(subject, ACCESS_TOKEN_TYPE, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(subject: str) -> str:
    return create_token(subject, REFRESH_TOKEN_TYPE, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def verify_token(token: str, expected_type: str = ACCESS_TOKEN_TYPE) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get('sub')
        token_type = payload.get('type')
        if not subject:
            raise ValueError('Token subject missing')
        if expected_type and token_type != expected_type:
            raise ValueError('Unexpected token type')
        return payload
    except JWTError:
        raise ValueError('Token validation failed')
