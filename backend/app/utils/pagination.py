"""分页查询工具"""
from typing import TypeVar, Generic
from sqlalchemy import Select, func, select

from app.schemas.common import PageParams, PageResult

T = TypeVar("T")


async def paginate(
    query: Select,
    params: PageParams,
    db,
) -> tuple[list, int]:
    """通用分页查询
    
    Returns: (items, total_count)
    """
    # 计算总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    offset = (params.page - 1) * params.page_size
    items_query = query.offset(offset).limit(params.page_size)
    items_result = await db.execute(items_query)
    items = list(items_result.scalars().all())

    return items, total


def make_page_result(items: list, total: int, params: PageParams) -> dict:
    """构造分页响应"""
    total_pages = (total + params.page_size - 1) // params.page_size if total > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "total_pages": total_pages,
    }
