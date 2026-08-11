"""FastAPI 应用入口：建表 → 播种 → 挂载路由与 CORS。"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine
from app.routers import brand, cases, content, platforms, chat, sync, workspaces
from app.seed import seed_if_empty
from app.auth import require_gtc_user

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


def migrate_workspace_columns() -> None:
    """Add workspace isolation columns to databases created before multi-workspace support."""
    tables = [
        "gtc_brand_info",
        "gtc_brand_rules",
        "gtc_content_cases",
        "gtc_platform_rules",
        "gtc_prompts",
        "gtc_intelligence",
    ]
    with engine.begin() as connection:
        existing_tables = set(inspect(connection).get_table_names())
        for table in tables:
            if table not in existing_tables:
                continue
            columns = {column["name"] for column in inspect(connection).get_columns(table)}
            if "workspace_id" not in columns:
                connection.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN workspace_id VARCHAR(64) "
                    "NOT NULL DEFAULT 'gtc-default'"
                ))
        if "gtc_workspace_state" in existing_tables:
            connection.execute(text(
                "UPDATE gtc_workspace_state SET workspace_id = 'gtc-default' WHERE workspace_id = 'main'"
            ))
        if connection.dialect.name == "postgresql" and "gtc_platform_rules" in existing_tables:
            connection.execute(text(
                "ALTER TABLE gtc_platform_rules DROP CONSTRAINT IF EXISTS gtc_platform_rules_platform_key"
            ))


migrate_workspace_columns()

# SQLite 幂等迁移：为已有的 content_cases 表补充 is_reference 列（新库由 create_all 直接建出）
if settings.database_url.startswith("sqlite"):
    from sqlalchemy import text
    with engine.connect() as _conn:
        _cols = [r[1] for r in _conn.exec_driver_sql("PRAGMA table_info(gtc_content_cases)").fetchall()]
        if "is_reference" not in _cols:
            _conn.exec_driver_sql(
                "ALTER TABLE gtc_content_cases ADD COLUMN is_reference BOOLEAN NOT NULL DEFAULT 1"
            )
            _conn.commit()

seed_if_empty()

api_auth = [Depends(require_gtc_user)]
app.include_router(brand.router, dependencies=api_auth)
app.include_router(platforms.router, dependencies=api_auth)
app.include_router(cases.router, dependencies=api_auth)
app.include_router(content.router, dependencies=api_auth)
app.include_router(chat.router, dependencies=api_auth)
app.include_router(sync.router)
app.include_router(workspaces.router)


@app.get("/")
def root():
    return {"service": "GTC AI Content Studio", "status": "ok", "docs": "/docs"}
