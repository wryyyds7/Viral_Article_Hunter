"""上传相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class UploadBatchResponse(BaseModel):
    id: uuid.UUID
    total_count: int
    success_count: int
    fail_count: int
    threshold_met: bool
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadFileResponse(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    original_name: str
    file_format: str
    file_size: int
    status: str
    parsed_title: str | None = None
    article_id: uuid.UUID | None = None
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadProgressResponse(BaseModel):
    batch_id: uuid.UUID
    total: int
    completed: int
    failed: int
    processing: int
    threshold_met: bool


class RetryFailedRequest(BaseModel):
    file_ids: list[uuid.UUID] = Field(..., min_length=1)


class TriggerAnalysisRequest(BaseModel):
    batch_id: uuid.UUID
