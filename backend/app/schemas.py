"""Pydantic schemas：请求 / 响应模型。"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)


# ---------- 品牌 ----------
class BrandInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name_cn: str
    name_en: str
    description: str


class BrandRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    rule: str
    example: str


class BrandKnowledgeOut(BaseModel):
    info: BrandInfoOut
    visual_dna: list[BrandRuleOut]
    forbidden: list[BrandRuleOut]
    templates: list[BrandRuleOut]
    logo: list[BrandRuleOut]
    logo_url: str = "/gtc-logo.png"


# ---------- 平台 ----------
class PlatformRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    platform: str
    audience: str
    tone: str
    visual_style: str


# ---------- 案例 ----------
class CaseCreate(BaseModel):
    platform: str
    title: str
    published_at: str = ""
    image: str = ""
    content: str = ""
    visual_analysis: str = ""
    scenario: str = ""
    analysis: str = ""
    is_reference: bool = True  # 是否作为 AI 生成参考


class CaseUpdate(BaseModel):
    """案例更新（全字段可选，按需传参）。"""
    platform: str | None = None
    title: str | None = None
    published_at: str | None = None
    image: str | None = None
    content: str | None = None
    visual_analysis: str | None = None
    scenario: str | None = None
    analysis: str | None = None
    is_reference: bool | None = None


class CaseOut(CaseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class BrandRuleCreate(BaseModel):
    category: str
    rule: str
    example: str = ""


class BrandRuleUpdate(BaseModel):
    rule: str | None = None
    example: str | None = None


class BrandInfoUpdate(BaseModel):
    name_cn: str | None = None
    name_en: str | None = None
    description: str | None = None


# ---------- 内容生成 ----------
class ContentGenerateIn(BaseModel):
    content_type: str = Field(..., description="招聘/活动预告/活动回顾/人才政策/企业介绍/科研动态/品牌宣传")
    topic: str = ""
    event_name: str = ""
    target_audience: str = ""
    time: str = ""
    location: str = ""
    core_info: str = ""
    platforms: list[str] = Field(default_factory=lambda: ["wechat", "xiaohongshu"])
    # 视觉控制字段：让提示词稳定、减少风格漂移
    poster_type: str = ""          # 海报视觉类型
    main_visual: str = ""          # 主视觉形式
    brand_strength: str = ""       # 品牌露出强度：强/中/弱
    theme_style: str = ""          # 主题风格
    text_density: str = ""         # 文本密度：低/中/高
    required_modules: list[str] = Field(default_factory=list)  # 必须包含的信息模块


class CopyResult(BaseModel):
    title: str
    body: str
    tags: list[str]


class PlatformVersion(BaseModel):
    platform: str
    copy_text: CopyResult
    image_prompt: str


class ContentGenerateOut(BaseModel):
    content_type: str
    copy_text: CopyResult
    image_prompt: str
    platform_versions: list[PlatformVersion]
    used_ai: bool = False


# ---------- Prompt 引擎 ----------
class PromptBuildIn(BaseModel):
    user_input: str
    platform: str = "wechat"
    content_type: str = ""
    # 时间/地点等关键信息：需要被钉死在 Prompt 里，防止生成「待定」
    time: str = ""
    location: str = ""
    target_audience: str = ""
    core_info: str = ""
    # 视觉控制字段（与 ContentGenerateIn 一致）
    poster_type: str = ""
    main_visual: str = ""
    brand_strength: str = ""
    theme_style: str = ""
    text_density: str = ""
    required_modules: list[str] = Field(default_factory=list)


class PromptBuildOut(BaseModel):
    platform: str
    prompt: str
    used_ai: bool = False


# ---------- AI 助手（多轮对话优化提示词）----------
class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatOptimizeIn(BaseModel):
    messages: list[ChatMessage]
    current_prompt: str = ""   # 当前提示词（可选，作为优化基线）
    platform: str = "wechat"
    content_type: str = ""


class ChatOptimizeOut(BaseModel):
    reply: str                # 给用户的分析/建议（中文）
    optimized_prompt: str     # 优化后的中文图像生成 Prompt
    used_ai: bool = False


# ---------- 工作区同步 ----------
class WorkspaceSyncIn(BaseModel):
    workspace_id: str = Field(default="main", min_length=1, max_length=64)
    state: dict = Field(default_factory=dict)
    expected_version: int | None = Field(default=None, ge=0)


class WorkspaceSyncOut(BaseModel):
    workspace_id: str
    state: dict
    version: int
    updated_at: datetime
