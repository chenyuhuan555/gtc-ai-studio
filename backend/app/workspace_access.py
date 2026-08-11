"""Workspace membership and product-level data boundary."""
from dataclasses import dataclass
from uuid import uuid4

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_gtc_user
from app.database import get_db
from app.models import DEFAULT_WORKSPACE_ID, Workspace, WorkspaceMember


@dataclass(frozen=True)
class WorkspaceContext:
    id: str
    user_id: str


def ensure_default_workspace(db: Session, user_id: str) -> Workspace:
    workspace = db.get(Workspace, DEFAULT_WORKSPACE_ID)
    if workspace is None:
        workspace = Workspace(
            id=DEFAULT_WORKSPACE_ID,
            name="GTC 官方公众号",
            description="深圳市光明科学城全球青年人才中心",
            created_by=user_id,
        )
        db.add(workspace)
        db.flush()
    member = db.query(WorkspaceMember).filter_by(workspace_id=workspace.id, user_id=user_id).first()
    if member is None:
        db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role="owner"))
        db.commit()
    return workspace


def require_workspace(
    workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
    user_id: str = Depends(require_gtc_user),
    db: Session = Depends(get_db),
) -> WorkspaceContext:
    ensure_default_workspace(db, user_id)
    selected = workspace_id or DEFAULT_WORKSPACE_ID
    member = db.query(WorkspaceMember).filter_by(workspace_id=selected, user_id=user_id).first()
    if member is None:
        raise HTTPException(status_code=403, detail="无权访问该公众号工作空间")
    if db.get(Workspace, selected) is None:
        raise HTTPException(status_code=404, detail="工作空间不存在")
    return WorkspaceContext(id=selected, user_id=user_id)


def new_workspace_id() -> str:
    return f"ws-{uuid4().hex[:16]}"
