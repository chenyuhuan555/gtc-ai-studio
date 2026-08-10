"""AI 助手接口：多轮对话式提示词优化（接 DeepSeek）。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ChatOptimizeIn, ChatOptimizeOut
from app.services.chat_service import optimize

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat/optimize", response_model=ChatOptimizeOut)
def chat_optimize(payload: ChatOptimizeIn, db: Session = Depends(get_db)):
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    reply, optimized_prompt, used_ai = optimize(
        messages, payload.current_prompt, payload.platform, payload.content_type, db
    )
    return ChatOptimizeOut(reply=reply, optimized_prompt=optimized_prompt, used_ai=used_ai)
