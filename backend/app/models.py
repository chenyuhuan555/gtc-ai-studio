"""数据模型（对应 PRD 第六节数据库设计，并在保持原字段基础上做了少量增强）。"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BrandInfo(Base):
    """GTC 品牌基础信息（模块一 1.1）。"""
    __tablename__ = "gtc_brand_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name_cn: Mapped[str] = mapped_column(String(255), default="深圳市光明科学城全球青年人才中心")
    name_en: Mapped[str] = mapped_column(
        String(255), default="Global Youth Talent Center of Guang Ming Science City"
    )
    description: Mapped[str] = mapped_column(
        Text, default="全球青年人才服务平台，连接国际人才、科技创新企业和科学城生态。"
    )


class BrandRule(Base):
    """品牌规则：视觉 DNA、禁止元素、Prompt 模板等（模块一 1.2）。"""
    __tablename__ = "gtc_brand_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(64), index=True)  # visual_dna / forbidden / template
    rule: Mapped[str] = mapped_column(Text)
    example: Mapped[str] = mapped_column(Text, default="")


class ContentCase(Base):
    """历史优秀案例（模块二）。"""
    __tablename__ = "gtc_content_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)  # wechat / xiaohongshu / video / linkedin
    title: Mapped[str] = mapped_column(String(255))
    published_at: Mapped[str] = mapped_column(String(32), default="")
    image: Mapped[str] = mapped_column(Text, default="")  # 图片地址 / base64
    content: Mapped[str] = mapped_column(Text, default="")
    visual_analysis: Mapped[str] = mapped_column(Text, default="")  # 视觉分析
    scenario: Mapped[str] = mapped_column(Text, default="")  # 适用场景
    analysis: Mapped[str] = mapped_column(Text, default="")  # 综合点评
    is_reference: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # 是否作为 AI 生成参考


class PlatformRule(Base):
    """平台规则（模块四）。"""
    __tablename__ = "gtc_platform_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    audience: Mapped[str] = mapped_column(Text, default="")
    tone: Mapped[str] = mapped_column(Text, default="")
    visual_style: Mapped[str] = mapped_column(Text, default="")


class Prompt(Base):
    """历史生成的 Prompt（模块五产物沉淀）。"""
    __tablename__ = "gtc_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    scene: Mapped[str] = mapped_column(String(64), default="")
    prompt: Mapped[str] = mapped_column(Text)
    created_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Intelligence(Base):
    """情报中心采集条目（模块七，P1 预留）。"""
    __tablename__ = "gtc_intelligence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(128), default="")
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    impact: Mapped[str] = mapped_column(Text, default="")
    created_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkspaceState(Base):
    """第一阶段工作区快照，用于跨设备同步非敏感的 UI/工作数据。"""
    __tablename__ = "gtc_workspace_state"

    workspace_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    state: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
