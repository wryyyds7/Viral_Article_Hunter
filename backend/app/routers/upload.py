"""上传路由"""
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form

from app.models import User
from app.middleware.auth import get_current_user
from app.middleware.quota import check_quota
from app.schemas.upload import UploadBatchResponse, UploadFileResponse, UploadProgressResponse
from app.schemas.common import ResponseBase
from app.services.upload_service import UploadService, SUPPORTED_FORMATS, MAX_FILE_SIZE

router = APIRouter()


@router.post("/files", response_model=ResponseBase[UploadBatchResponse])
async def upload_files(
    files: list[UploadFile] = File(..., description="支持 TXT/MD/DOCX/PDF/HTML"),
    user: User = Depends(check_quota("daily_uploads")),
):
    """批量上传文档"""
    file_list = []
    for f in files:
        # 校验格式
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext not in SUPPORTED_FORMATS:
            continue

        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            continue

        file_list.append({
            "filename": f.filename,
            "format": ext,
            "size": len(content),
            "content": content,
        })

    if not file_list:
        return ResponseBase(code=40701, message="无有效文件")

    batch = await UploadService.create_batch(user.id, file_list)
    return ResponseBase(data=UploadBatchResponse.model_validate(batch))


@router.get("/batches/{batch_id}", response_model=ResponseBase[UploadBatchResponse])
async def get_batch(
    batch_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询上传批次详情"""
    batch = await UploadService.get_batch(batch_id)
    if not batch:
        return ResponseBase(code=40400, message="批次不存在")
    return ResponseBase(data=UploadBatchResponse.model_validate(batch))


@router.get("/batches/{batch_id}/progress", response_model=ResponseBase[UploadProgressResponse])
async def get_progress(
    batch_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    """查询上传处理进度"""
    progress = await UploadService.get_progress(batch_id)
    if not progress:
        return ResponseBase(code=40400, message="批次不存在")
    return ResponseBase(data=UploadProgressResponse(**progress))
