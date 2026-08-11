"""工作区快照同步接口。"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_gtc_user
from app.database import get_db
from app.models import WorkspaceState
from app.schemas import WorkspaceSyncIn, WorkspaceSyncOut
from app.workspace_access import WorkspaceContext, require_workspace

router = APIRouter(prefix="/api/sync", tags=["sync"])


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    workspace: WorkspaceContext = Depends(require_workspace),
):
    row = db.get(WorkspaceState, workspace.id)
    return as_output(row) if row else None


@router.put("/workspace", response_model=WorkspaceSyncOut)
def save_workspace(
    payload: WorkspaceSyncIn,
    db: Session = Depends(get_db),
    workspace: WorkspaceContext = Depends(require_workspace),
):
    row = db.get(WorkspaceState, workspace.id)
    if row is None:
        if payload.expected_version not in (None, 0):
            raise HTTPException(status_code=409, detail="工作区版本已变化")
        row = WorkspaceState(
            workspace_id=workspace.id,
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
