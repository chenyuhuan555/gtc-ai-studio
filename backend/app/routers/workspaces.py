"""公众号工作空间管理。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BrandInfo, Workspace, WorkspaceMember
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
