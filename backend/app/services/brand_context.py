"""从数据库加载品牌上下文，供 Prompt 引擎与内容生成共用。"""
from sqlalchemy.orm import Session

from app.models import DEFAULT_WORKSPACE_ID, BrandInfo, BrandRule, ContentCase, PlatformRule

PLATFORM_LABELS = {
    "wechat": "微信公众号",
    "xiaohongshu": "小红书",
    "video": "视频号",
    "linkedin": "LinkedIn",
}


def load_brand_context(db: Session, workspace_id: str = "gtc-default") -> dict:
    info = db.query(BrandInfo).filter(BrandInfo.workspace_id == workspace_id).first()
    visual_dna = db.query(BrandRule).filter(BrandRule.workspace_id == workspace_id, BrandRule.category == "visual_dna").all()
    forbidden = db.query(BrandRule).filter(BrandRule.workspace_id == workspace_id, BrandRule.category == "forbidden").all()
    platform_rules = {r.platform: r for r in db.query(PlatformRule).filter(PlatformRule.workspace_id == workspace_id).all()}

    logo = db.query(BrandRule).filter(BrandRule.workspace_id == workspace_id, BrandRule.category == "logo").all()

    return {
        "name_cn": info.name_cn if info else "GTC",
        "name_en": info.name_en if info else "GTC",
        "description": info.description if info else "",
        "visual_dna": [r.rule for r in visual_dna],
        "forbidden": [r.rule for r in forbidden],
        "platform_rules": platform_rules,
        "logo": [r.rule for r in logo],
        "logo_url": "/gtc-logo.png" if workspace_id == DEFAULT_WORKSPACE_ID else "",
    }


# 平台中文名，用于案例参考块展示
_PLATFORM_LABELS = {
    "wechat": "微信公众号",
    "xiaohongshu": "小红书",
    "video": "视频号",
    "linkedin": "LinkedIn",
}


def load_reference_cases(db: Session, platform: str, workspace_id: str = "gtc-default", limit: int = 3) -> str:
    """取同平台且「用作参考」开启的历史案例，拼成一段参考文本。

    返回空串表示没有可用参考案例（调用方据此跳过注入）。
    """
    rows = (
        db.query(ContentCase)
        .filter(ContentCase.workspace_id == workspace_id, ContentCase.platform == platform, ContentCase.is_reference == True)  # noqa: E712
        .order_by(ContentCase.id.desc())
        .limit(limit)
        .all()
    )
    if not rows:
        return ""
    lines = ["【参考案例】（同平台优秀历史案例，仅作风格与结构参考，不要照搬文案）"]
    for i, c in enumerate(rows, 1):
        lines.append(f"案例{i}（{_PLATFORM_LABELS.get(c.platform, c.platform)}）：")
        lines.append(f"- 标题：{c.title}")
        if c.visual_analysis:
            lines.append(f"- 视觉分析：{c.visual_analysis}")
        if c.scenario:
            lines.append(f"- 适用场景：{c.scenario}")
        if c.content:
            lines.append(f"- 正文要点：{c.content}")
        if c.analysis:
            lines.append(f"- 综合点评：{c.analysis}")
    return "\n".join(lines)
