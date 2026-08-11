"""公众号工作空间管理。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    DEFAULT_WORKSPACE_ID,
    BrandInfo,
    BrandRule,
    ContentCase,
    Intelligence,
    PlatformRule,
    Prompt,
    Workspace,
    WorkspaceMember,
    WorkspaceState,
)
from app.schemas import WorkspaceCreate, WorkspaceOut
from app.workspace_access import ensure_default_workspace, new_workspace_id
from app.auth import require_gtc_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(user_id: str = Depends(require_gtc_user), db: Session = Depends(get_db)):
    ensure_default_workspace(db, user_id)
    return (
        db.query(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(WorkspaceMember.user_id == user_id)
        .order_by(Workspace.created_at.asc())
        .all()
    )


@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(
    payload: WorkspaceCreate,
    user_id: str = Depends(require_gtc_user),
    db: Session = Depends(get_db),
):
    workspace = Workspace(
        id=new_workspace_id(),
        name=payload.name.strip(),
        description=payload.description.strip(),
        created_by=user_id,
    )
    db.add(workspace)
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role="owner"))
    db.add(BrandInfo(workspace_id=workspace.id, name_cn=payload.name.strip(), name_en=payload.name.strip(), description=payload.description.strip()))
    db.commit()
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    user_id: str = Depends(require_gtc_user),
    db: Session = Depends(get_db),
):
    if workspace_id == DEFAULT_WORKSPACE_ID:
        raise HTTPException(status_code=400, detail="GTC 官方公众号不能删除")

    workspace = (
        db.query(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(Workspace.id == workspace_id, WorkspaceMember.user_id == user_id)
        .first()
    )
    if workspace is None:
        raise HTTPException(status_code=404, detail="公众号工作空间不存在或无权删除")

    for model in (BrandInfo, BrandRule, ContentCase, PlatformRule, Prompt, Intelligence, WorkspaceState):
        db.query(model).filter(model.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).delete(synchronize_session=False)
    db.delete(workspace)
    db.commit()
    return {"ok": True}
