"""请求限流中间件（进程内滑动窗口）"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException

from app.middleware.auth import get_current_user


class RateLimiter:
    """进程内滑动窗口限流器"""

    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        window_start = now - window_seconds

        # 清理过期记录
        self._windows[key] = [t for t in self._windows[key] if t > window_start]

        if len(self._windows[key]) >= max_requests:
            return False

        self._windows[key].append(now)
        return True


_limiter = RateLimiter()


async def rate_limit(max_requests: int = 30, window_seconds: int = 60):
    """限流依赖工厂"""
    async def _check(request: Request, user=Depends(get_current_user)):
        key = f"rate:{user.id}:{request.url.path}"
        if not _limiter.is_allowed(key, max_requests, window_seconds):
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
        return user
    return _check
