"""素材库路由"""
import json
import uuid
from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse, JSONResponse

from app.models import User
from app.middleware.auth import get_current_user
from app.schemas.library import ArticleListParams, ArticleDetailResponse, FavoriteRequest, ExportRequest
from app.schemas.common import ResponseBase, PageResult
from app.services.library_service import LibraryService
from app.utils.pagination import make_page_result

router = APIRouter()


@router.get("/articles", response_model=ResponseBase[PageResult[ArticleDetailResponse]])
async def list_articles(
    keyword: str | None = Query(None),
    source_platform: str | None = Query(None),
    is_favorited: bool | None = Query(None),
    collection_method: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """查询文章列表"""
    items, total = await LibraryService.list_articles(
        user_id=user.id,
        keyword=keyword,
        source_platform=source_platform,
        is_favorited=is_favorited,
        collection_method=collection_method,
        page=page,
        page_size=page_size,
    )
    return ResponseBase(data=make_page_result(
        [ArticleDetailResponse.model_validate(i) for i in items],
        total, page, page_size,
    ))


@router.get("/articles/{article_id}", response_model=ResponseBase[ArticleDetailResponse])
async def get_article(
    article_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询文章详情"""
    article = await LibraryService.get_article(article_id, user.id)
    if not article:
        return ResponseBase(code=40400, message="文章不存在")
    return ResponseBase(data=ArticleDetailResponse.model_validate(article))


@router.delete("/articles/{article_id}", response_model=ResponseBase[bool])
async def delete_article(
    article_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """删除文章"""
    success = await LibraryService.delete_article(article_id, user.id)
    return ResponseBase(data=success)


@router.post("/favorite", response_model=ResponseBase[bool])
async def toggle_favorite(
    req: FavoriteRequest,
    user: User = Depends(get_current_user),
):
    """切换收藏状态"""
    success = await LibraryService.toggle_favorite(user.id, req.article_id, req.group_id)
    return ResponseBase(data=success)


@router.post("/export")
async def export_articles(
    req: ExportRequest,
    user: User = Depends(get_current_user),
):
    """导出文章"""
    content = await LibraryService.export_articles(req.article_ids, req.format)
    if req.format == "csv":
        return PlainTextResponse(content, media_type="text/csv")
    elif req.format == "txt":
        return PlainTextResponse(content, media_type="text/plain")
    else:
        return JSONResponse(content=json.loads(content) if isinstance(content, str) else content)


@router.get("/tags", response_model=ResponseBase[list[str]])
async def get_tags(user: User = Depends(get_current_user)):
    """获取用户所有标签"""
    tags = await LibraryService.get_tags(user.id)
    return ResponseBase(data=tags)
