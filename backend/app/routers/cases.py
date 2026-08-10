"""历史案例库接口（模块二 CRUD）。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentCase
from app.schemas import CaseCreate, CaseOut, CaseUpdate

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=list[CaseOut])
def list_cases(platform: str | None = None, db: Session = Depends(get_db)):
    q = db.query(ContentCase)
    if platform:
        q = q.filter(ContentCase.platform == platform)
    return q.order_by(ContentCase.id.desc()).all()


@router.post("", response_model=CaseOut, status_code=201)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    case = ContentCase(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(ContentCase).filter(ContentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="案例不存在")
    return case


@router.put("/{case_id}", response_model=CaseOut)
def update_case(case_id: int, payload: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(ContentCase).filter(ContentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="案例不存在")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(ContentCase).filter(ContentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="案例不存在")
    db.delete(case)
    db.commit()
    return {"ok": True}
