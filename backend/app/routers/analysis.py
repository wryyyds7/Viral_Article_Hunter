"""分析路由"""
import uuid
from fastapi import APIRouter, Depends

from app.models import User
from app.middleware.auth import get_current_user
from app.schemas.analysis import AnalysisResponse, BatchAnalysisRequest, BatchAnalysisResponse
from app.schemas.common import ResponseBase
from app.services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/articles/{article_id}", response_model=ResponseBase[AnalysisResponse])
async def get_analysis(
    article_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询文章的分析结果"""
    result = await AnalysisService.get_analysis(article_id)
    if not result:
        return ResponseBase(code=40400, message="分析结果不存在")
    return ResponseBase(data=AnalysisResponse.model_validate(result))


@router.post("/batch", response_model=ResponseBase[BatchAnalysisResponse])
async def batch_analyze(
    req: BatchAnalysisRequest,
    user: User = Depends(get_current_user),
):
    """批量触发分析"""
    result = await AnalysisService.batch_analyze(user.id, req.article_ids)
    return ResponseBase(data=BatchAnalysisResponse(**result))
