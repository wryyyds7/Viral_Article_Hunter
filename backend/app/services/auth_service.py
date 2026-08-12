"""认证服务"""
import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select, func

from app.config import settings
from app.database import async_session
from app.models import User, UserQuota
from app.exceptions import AuthenticationError, InvalidTokenError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def create_token(user_id: uuid.UUID, role: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "role": role,
            "iat": now,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    async def register(username: str, email: str, password: str) -> User:
        async with async_session() as db:
            # 检查唯一性
            existing = await db.execute(
                select(User).where((User.username == username) | (User.email == email))
            )
            if existing.scalar_one_or_none():
                raise AuthenticationError("用户名或邮箱已存在")

            # 判断是否为首个用户 → 自动成为 admin
            count_result = await db.execute(select(func.count()).select_from(User))
            user_count = count_result.scalar() or 0
            role = "admin" if user_count == 0 else "user"

            user = User(
                username=username,
                email=email,
                hashed_password=AuthService.hash_password(password),
                role=role,
            )
            db.add(user)
            await db.flush()

            # 创建配额记录
            quota = UserQuota(user_id=user.id)
            db.add(quota)

            await db.commit()
            await db.refresh(user)
            return user

    @staticmethod
    async def login(username_or_email: str, password: str) -> tuple[User, str]:
        async with async_session() as db:
            # 支持用户名或邮箱登录
            result = await db.execute(
                select(User).where(
                    (User.username == username_or_email) | (User.email == username_or_email)
                )
            )
            user = result.scalar_one_or_none()

            if not user or not AuthService.verify_password(password, user.hashed_password):
                raise AuthenticationError("用户名或密码错误")

            if user.status == "banned":
                raise AuthenticationError("账号已被封禁")

            token = AuthService.create_token(user.id, user.role)
            return user, token

    @staticmethod
    async def change_password(user_id: uuid.UUID, old_password: str, new_password: str) -> bool:
        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise InvalidTokenError()

            if not AuthService.verify_password(old_password, user.hashed_password):
                raise AuthenticationError("旧密码错误")

            user.hashed_password = AuthService.hash_password(new_password)
            await db.commit()
            return True
