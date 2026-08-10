"""首次启动时播种品牌知识库、平台规则与示例案例。"""
from app.database import SessionLocal
from app.data import (
    BRAND_INFO,
    FORBIDDEN,
    LOGO_RULE,
    PLATFORM_RULES,
    SAMPLE_CASES,
    VISUAL_DNA,
)
from app.models import BrandInfo, BrandRule, ContentCase, PlatformRule


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if not db.query(BrandInfo).first():
            db.add(BRAND_INFO)
            db.add_all(list(VISUAL_DNA))
            db.add_all(list(FORBIDDEN))
            db.add_all(list(PLATFORM_RULES))
            db.add_all(list(SAMPLE_CASES))
            db.commit()

        # 官方 logo 规则幂等补充（兼容已初始化的旧数据库）
        if not db.query(BrandRule).filter(BrandRule.category == "logo").first():
            db.add_all(list(LOGO_RULE))
            db.commit()
    finally:
        db.close()
