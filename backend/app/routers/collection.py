"""采集路由"""
import uuid
from fastapi import APIRouter, Depends, Query

from app.models import User
from app.middleware.auth import get_current_user
from app.middleware.quota import check_quota
from app.schemas.collection import CollectRequest, CollectionTaskResponse, ArticleBriefResponse
from app.schemas.common import ResponseBase, PageResult
from app.services.collection_service import CollectionService
from app.utils.pagination import make_page_result

router = APIRouter()


@router.post("/tasks", response_model=ResponseBase[CollectionTaskResponse])
async def create_collect_task(
    req: CollectRequest,
    user: User = Depends(check_quota("daily_collections")),
):
    """创建采集任务"""
    task = await CollectionService.create_task(
        user_id=user.id,
        keyword=req.keyword,
        platforms=req.platforms,
        max_results=req.max_results,
    )
    return ResponseBase(data=CollectionTaskResponse.model_validate(task))


@router.get("/tasks", response_model=ResponseBase[PageResult[CollectionTaskResponse]])
async def list_collect_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """查询采集任务列表"""
    items, total = await CollectionService.list_tasks(user.id, page, page_size)
    return ResponseBase(data=make_page_result(
        [CollectionTaskResponse.model_validate(i) for i in items],
        total, page, page_size,
    ))


@router.get("/tasks/{task_id}", response_model=ResponseBase[CollectionTaskResponse])
async def get_collect_task(
    task_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询采集任务详情"""
    task = await CollectionService.get_task(task_id)
    if not task:
        return ResponseBase(code=40400, message="任务不存在")
    return ResponseBase(data=CollectionTaskResponse.model_validate(task))
