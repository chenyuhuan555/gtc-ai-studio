"""FastAPI 应用入口：建表 → 播种 → 挂载路由与 CORS。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import brand, cases, content, platforms, chat, sync
from app.seed import seed_if_empty

app = FastAPI(title="GTC AI Content Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 建表（生产建议用迁移工具；MVP 阶段自动建表更快捷）
Base.metadata.create_all(bind=engine)

# SQLite 幂等迁移：为已有的 content_cases 表补充 is_reference 列（新库由 create_all 直接建出）
if settings.database_url.startswith("sqlite"):
    from sqlalchemy import text
    with engine.connect() as _conn:
        _cols = [r[1] for r in _conn.exec_driver_sql("PRAGMA table_info(content_cases)").fetchall()]
        if "is_reference" not in _cols:
            _conn.exec_driver_sql(
                "ALTER TABLE content_cases ADD COLUMN is_reference BOOLEAN NOT NULL DEFAULT 1"
            )
            _conn.commit()

seed_if_empty()

app.include_router(brand.router)
app.include_router(platforms.router)
app.include_router(cases.router)
app.include_router(content.router)
app.include_router(chat.router)
app.include_router(sync.router)


@app.get("/")
def root():
    return {"service": "GTC AI Content Studio", "status": "ok", "docs": "/docs"}
