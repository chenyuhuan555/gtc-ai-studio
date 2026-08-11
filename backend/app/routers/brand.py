"""品牌知识库读取 / 编辑接口（模块一 / 模块三支撑）。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DEFAULT_WORKSPACE_ID, BrandInfo, BrandRule
from app.schemas import (
    BrandInfoOut,
    BrandInfoUpdate,
    BrandKnowledgeOut,
    BrandRuleCreate,
    BrandRuleOut,
    BrandRuleUpdate,
)
from app.workspace_access import WorkspaceContext, require_workspace

router = APIRouter(prefix="/api/brand", tags=["brand"])


@router.get("", response_model=BrandKnowledgeOut)
def get_brand_knowledge(db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    info = db.query(BrandInfo).filter(BrandInfo.workspace_id == workspace.id).first()
    visual_dna = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.category == "visual_dna").all()
    forbidden = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.category == "forbidden").all()
    templates = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.category == "template").all()
    logo = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.category == "logo").all()
    return BrandKnowledgeOut(
        info=info,
        visual_dna=[BrandRuleOut.model_validate(r) for r in visual_dna],
        forbidden=[BrandRuleOut.model_validate(r) for r in forbidden],
        templates=[BrandRuleOut.model_validate(r) for r in templates],
        logo=[BrandRuleOut.model_validate(r) for r in logo],
        logo_url="/gtc-logo.png" if workspace.id == DEFAULT_WORKSPACE_ID else "",
    )


@router.put("/info", response_model=BrandInfoOut)
def update_brand_info(payload: BrandInfoUpdate, db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    info = db.query(BrandInfo).filter(BrandInfo.workspace_id == workspace.id).first()
    if not info:
        raise HTTPException(status_code=404, detail="品牌信息不存在")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(info, key, value)
    db.commit()
    db.refresh(info)
    return info


@router.post("/rules", response_model=BrandRuleOut, status_code=201)
def create_brand_rule(payload: BrandRuleCreate, db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    rule = BrandRule(workspace_id=workspace.id, category=payload.category, rule=payload.rule, example=payload.example)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=BrandRuleOut)
def update_brand_rule(rule_id: int, payload: BrandRuleUpdate, db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    rule = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_brand_rule(rule_id: int, db: Session = Depends(get_db), workspace: WorkspaceContext = Depends(require_workspace)):
    rule = db.query(BrandRule).filter(BrandRule.workspace_id == workspace.id, BrandRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")
    db.delete(rule)
    db.commit()
    return {"ok": True}
