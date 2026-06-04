"""路由统一导出"""
from app.routers.auth import router as auth_router
from app.routers.collection import router as collection_router
from app.routers.analysis import router as analysis_router
from app.routers.rewrite import router as rewrite_router
from app.routers.upload import router as upload_router
from app.routers.library import router as library_router
from app.routers.dashboard import router as dashboard_router
from app.routers.settings import router as settings_router
from app.routers.admin import router as admin_router
