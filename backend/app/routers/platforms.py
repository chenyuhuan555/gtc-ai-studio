"""平台规则接口（模块四）。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PlatformRule
from app.schemas import PlatformRuleOut

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("", response_model=list[PlatformRuleOut])
def list_platforms(db: Session = Depends(get_db)):
    return db.query(PlatformRule).all()
