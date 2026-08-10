"""内容生成与 Prompt 引擎接口（模块三 / 模块五）。"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prompt
from app.schemas import ContentGenerateIn, ContentGenerateOut, PromptBuildIn, PromptBuildOut
from app.services.content_generator import generate as generate_content
from app.services.prompt_engine import build_prompt

router = APIRouter(prefix="/api", tags=["content"])


@router.post("/content/generate", response_model=ContentGenerateOut)
def content_generate(payload: ContentGenerateIn, db: Session = Depends(get_db)):
    return generate_content(payload, db)


@router.post("/prompt/build", response_model=PromptBuildOut)
def prompt_build(payload: PromptBuildIn, db: Session = Depends(get_db)):
    vc = {
        "poster_type": payload.poster_type,
        "main_visual": payload.main_visual,
        "brand_strength": payload.brand_strength,
        "theme_style": payload.theme_style,
        "text_density": payload.text_density,
        "required_modules": payload.required_modules,
    }
    info = {
        "time": payload.time,
        "location": payload.location,
        "target_audience": payload.target_audience,
        "core_info": payload.core_info,
    }
    prompt, used_ai = build_prompt(payload.user_input, payload.platform, payload.content_type, db, vc, info)
    # 沉淀到 prompts 表（数据资产中心）
    db.add(
        Prompt(
            platform=payload.platform,
            scene=payload.content_type or "general",
            prompt=prompt,
            created_time=datetime.utcnow(),
        )
    )
    db.commit()
    return PromptBuildOut(platform=payload.platform, prompt=prompt, used_ai=used_ai)
