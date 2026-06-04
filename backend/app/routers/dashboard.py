"""数据看板路由"""
from fastapi import APIRouter, Depends, Query

from app.models import User
from app.middleware.auth import get_current_user
from app.schemas.dashboard import DashboardResponse
from app.schemas.common import ResponseBase
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/overview", response_model=ResponseBase[DashboardResponse])
async def get_dashboard(
    range: str = Query("7d", pattern=r"^(7d|30d|90d|custom)$"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    user: User = Depends(get_current_user),
):
    """获取数据看板"""
    dashboard = await DashboardService.get_dashboard(user.id, range, start_date, end_date)
    return ResponseBase(data=dashboard)
