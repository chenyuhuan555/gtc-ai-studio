"""工作区快照同步接口。"""
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import WorkspaceState
from app.schemas import WorkspaceSyncIn, WorkspaceSyncOut

router = APIRouter(prefix="/api/sync", tags=["sync"])


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def require_sync_access(authorization: str | None = Header(default=None)) -> str:
    """Require a Supabase Auth JWT unless explicitly running local development mode."""
    if settings.sync_auth_disabled:
        return "local-development"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="需要登录后才能同步")
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=503, detail="同步服务未配置 Supabase JWT Secret")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="登录凭证无效") from exc
    if claims.get("role") != "authenticated":
        raise HTTPException(status_code=403, detail="无权访问同步数据")
    return str(claims.get("sub") or "authenticated")


def as_output(row: WorkspaceState) -> WorkspaceSyncOut:
    return WorkspaceSyncOut(
        workspace_id=row.workspace_id,
        state=row.state,
        version=row.version,
        updated_at=row.updated_at,
    )


@router.get("/workspace", response_model=WorkspaceSyncOut | None)
def get_workspace(
    workspace_id: str = "main",
    db: Session = Depends(get_db),
    _user_id: str = Depends(require_sync_access),
):
    row = db.get(WorkspaceState, workspace_id)
    return as_output(row) if row else None


@router.put("/workspace", response_model=WorkspaceSyncOut)
def save_workspace(
    payload: WorkspaceSyncIn,
    db: Session = Depends(get_db),
    _user_id: str = Depends(require_sync_access),
):
    row = db.get(WorkspaceState, payload.workspace_id)
    if row is None:
        if payload.expected_version not in (None, 0):
            raise HTTPException(status_code=409, detail="工作区版本已变化")
        row = WorkspaceState(
            workspace_id=payload.workspace_id,
            state=payload.state,
            version=1,
            updated_at=utc_now(),
        )
        db.add(row)
    else:
        if payload.expected_version != row.version:
            raise HTTPException(status_code=409, detail="工作区版本已变化")
        row.state = payload.state
        row.version += 1
        row.updated_at = utc_now()
    db.commit()
    db.refresh(row)
    return as_output(row)
