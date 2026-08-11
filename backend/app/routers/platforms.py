"""平台规则接口（模块四）。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PlatformRule
from app.schemas import PlatformRuleOut
from app.workspace_access import WorkspaceContext, require_workspace

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("", response_model=list[PlatformRuleOut])
def list_platforms(db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    return db.query(PlatformRule).filter(PlatformRule.workspace_id == workspace.id).all()
