"""JWT 认证依赖"""
import uuid
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError

from app.config import settings
from app.database import get_db
from app.exceptions import AuthenticationError, TokenExpiredError, InvalidTokenError, AdminPermissionError
from app.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
) -> User:
    """从 Bearer Token 解析当前用户"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise InvalidTokenError()
    except ExpiredSignatureError:
        raise TokenExpiredError()
    except JWTError:
        raise InvalidTokenError()

    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise InvalidTokenError()
    if user.status == "banned":
        raise AuthenticationError("账号已被封禁")
    return user


async def admin_only(user: User = Depends(get_current_user)) -> User:
    """仅管理员可访问"""
    if not user.is_admin:
        raise AdminPermissionError()
    return user
