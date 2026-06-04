"""改写路由"""
import uuid
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.models import User
from app.middleware.auth import get_current_user
from app.middleware.quota import check_quota
from app.schemas.rewrite import RewriteRequest, RewriteTaskResponse, RewriteResultResponse, RewriteDetailResponse
from app.schemas.common import ResponseBase, PageResult
from app.services.rewrite_service import RewriteService
from app.utils.pagination import make_page_result

router = APIRouter()


@router.post("/tasks", response_model=ResponseBase[RewriteTaskResponse])
async def create_rewrite_task(
    req: RewriteRequest,
    user: User = Depends(check_quota("daily_rewrites")),
):
    """创建改写任务"""
    task = await RewriteService.create_task(
        user_id=user.id,
        article_id=req.article_id,
        target_platforms=req.target_platforms,
        style_overrides=req.style_overrides,
    )
    return ResponseBase(data=RewriteTaskResponse.model_validate(task))


@router.get("/tasks", response_model=ResponseBase[PageResult[RewriteTaskResponse]])
async def list_rewrite_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """查询改写任务列表"""
    items, total = await RewriteService.list_tasks(user.id, page, page_size)
    return ResponseBase(data=make_page_result(
        [RewriteTaskResponse.model_validate(i) for i in items],
        total, page, page_size,
    ))


@router.get("/tasks/{task_id}", response_model=ResponseBase[RewriteDetailResponse])
async def get_rewrite_task(
    task_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询改写任务详情（含各平台结果）"""
    task, results = await RewriteService.get_task(task_id)
    if not task:
        return ResponseBase(code=40400, message="任务不存在")
    return ResponseBase(data=RewriteDetailResponse(
        task=RewriteTaskResponse.model_validate(task),
        results=[RewriteResultResponse.model_validate(r) for r in results],
    ))


@router.get("/tasks/{task_id}/stream")
async def stream_rewrite_results(
    task_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """SSE 流式推送改写结果"""
    import asyncio
    import json

    async def event_generator():
        """SSE 事件生成器"""
        for _ in range(120):  # 最多等待2分钟
            task, results = await RewriteService.get_task(task_id)
            if not task:
                yield f"event: error\ndata: {json.dumps({'message': '任务不存在'})}\n\n"
                return

            if task.status in ("completed", "failed", "partial"):
                for r in results:
                    data = RewriteResultResponse.model_validate(r).model_dump(mode="json")
                    yield f"event: result\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                yield f"event: done\ndata: {json.dumps({'status': task.status})}\n\n"
                return

            # 心跳
            yield f"event: heartbeat\ndata: {json.dumps({'status': task.status})}\n\n"
            await asyncio.sleep(1)

        yield f"event: timeout\ndata: {json.dumps({'message': '等待超时'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
