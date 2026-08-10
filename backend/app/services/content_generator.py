"""内容生成中心（模块三）：文案 / 图片 Prompt / 多平台版本。

无 DeepSeek Key 时使用规则化模板（保证品牌一致、可用）；
有 Key 时由 DeepSeek 优化图片 Prompt，文案仍由规则化模板产出，确保风格不漂移。
生成的图片 Prompt 由用户复制到网页 ChatGPT / Midjourney 使用。
"""
from sqlalchemy.orm import Session

from app.schemas import ContentGenerateIn, ContentGenerateOut, CopyResult, PlatformVersion
from app.services.ai_client import call_ai
from app.services.brand_context import PLATFORM_LABELS, load_brand_context, load_reference_cases
from app.services.visual_control import visual_control_block

CONTENT_TYPE_LABEL = {
    "招聘": "人才招聘",
    "活动预告": "活动预告",
    "活动回顾": "活动回顾",
    "人才政策": "人才政策",
    "企业介绍": "企业/生态介绍",
    "科研动态": "科研动态",
    "品牌宣传": "品牌宣传",
}


def _nonempty(info: ContentGenerateIn) -> dict:
    fields = ["topic", "event_name", "target_audience", "time", "location", "core_info"]
    return {f: getattr(info, f) for f in fields if getattr(info, f)}


def _wechat_copy(info: ContentGenerateIn, label: str) -> CopyResult:
    subject = info.event_name or info.topic or "光明科学城全球青年人才中心"
    title = f"【{label}】{subject}"
    lines = [
        "近日，深圳市光明科学城全球青年人才中心持续为全球青年人才提供高质量服务与支持。"
        + (f"本次{label}相关安排如下。" if info.core_info else ""),
        "",
        (info.core_info or "我们围绕青年人才成长全周期，提供政策对接、企业直通、社群活动等多维服务。"),
        "",
        "【活动信息】",
        f"时间：{info.time or '待定'}",
        f"地点：{info.location or '光明科学城全球青年人才中心'}",
        f"对象：{info.target_audience or '全球青年人才、科研人员、合作机构'}",
        "",
        "【报名方式】",
        "请关注「光明科学城全球青年人才中心」微信公众号，获取报名入口与最新动态。",
        "",
        "【关于我们】",
        "深圳市光明科学城全球青年人才中心（Global Youth Talent Center of Guang Ming Science City）"
        "是全球青年人才服务平台，连接国际人才、科技创新企业和科学城生态。",
    ]
    return CopyResult(
        title=title,
        body="\n".join(lines),
        tags=["光明科学城", "青年人才", label, "全球人才"],
    )


def _xhs_copy(info: ContentGenerateIn, label: str) -> CopyResult:
    subject = info.event_name or info.topic or "青年人才活动"
    if label in ("人才政策", "人才招聘"):
        title = "为什么越来越多青年人才选择光明？🤔"
    else:
        title = f"📍{subject}｜年轻人的真实体验分享"
    lines = [
        f"✨ {subject}",
        "",
        (info.core_info or "在光明科学城全球青年人才中心，遇见同频的伙伴、靠谱的资源、真实的成长。"),
        "",
        f"🕒 时间：{info.time or '关注我们获取'}",
        f"📍 地点：{info.location or '光明科学城'}",
        f"💡 适合谁：{info.target_audience or '青年科研人才 / 留学生 / 职场新人'}",
        "",
        "你来光明之后最大的变化是什么？评论区聊聊👇",
    ]
    return CopyResult(
        title=title,
        body="\n".join(lines),
        tags=["青年人才", "光明科学城", "深圳求职", "科研生活", label],
    )


def _video_copy(info: ContentGenerateIn, label: str) -> CopyResult:
    subject = info.event_name or info.topic or "青年人才故事"
    title = f"{subject}｜一个真实的青年人才故事"
    lines = [
        "【视频标题】" + title,
        "",
        "【分镜脚本】",
        "01 人物：一位刚落地光明的青年科研人才（真实、自然、非 AI 人脸）",
        f"02 场景：{info.location or '光明科学城实验室 / 人才社区公共空间'}",
        "03 情绪：温暖、坚定、充满可能性",
        "04 故事线：从远方来到光明 → 加入人才社群 → 获得政策与企业资源 → 找到归属感",
        "",
        "【口播要点】" + (info.core_info or "这里让青年人才被看见、被支持、被连接。"),
    ]
    return CopyResult(
        title=title,
        body="\n".join(lines),
        tags=["人才故事", "光明科学城", "青年", "真实记录"],
    )


def _linkedin_copy(info: ContentGenerateIn, label: str) -> CopyResult:
    subject = info.event_name or info.topic or "Global Youth Talent Center"
    title = f"{subject} | Connecting Global Youth Talent at Guangming Science City"
    body = (
        f"We're excited to share updates from the Global Youth Talent Center of Guang Ming Science City.\n\n"
        f"({label})\n"
        + (info.core_info + "\n\n" if info.core_info else "")
        + (f"📅 When: {info.time}\n" if info.time else "")
        + (f"📍 Where: {info.location}\n" if info.location else "")
        + (f"🎯 Who: {info.target_audience}\n" if info.target_audience else "")
        + "\nWe connect international researchers, science & technology enterprises, and the Guangming "
        "Science City ecosystem — building a truly global talent community.\n\n"
        "If you're a researcher or innovator exploring opportunities in the Greater Bay Area, let's connect."
    )
    return CopyResult(
        title=title,
        body=body,
        tags=["#GlobalTalent", "#GuangmingScienceCity", "#YouthTalent", "#Innovation"],
    )


_COPY_BUILDERS = {
    "wechat": _wechat_copy,
    "xiaohongshu": _xhs_copy,
    "video": _video_copy,
    "linkedin": _linkedin_copy,
}


def _image_prompt(info: ContentGenerateIn, platform: str, db: Session) -> tuple[str, bool]:
    ctx = load_brand_context(db)
    pr = ctx["platform_rules"].get(platform)
    visual_style = pr.visual_style if pr else ""
    dna_block = "\n- ".join(ctx["visual_dna"])
    forbidden_block = "\n".join(f"- 禁止：{f}" for f in ctx["forbidden"])
    logo_block = "\n".join(f"- {l}" for l in ctx["logo"]) or (
        "- 使用官方 GTC logo 作为品牌标记，不得重新设计"
    )
    subject = info.event_name or info.topic or "光明科学城全球青年人才中心活动"

    # 视觉控制字段 → 结构化约束
    vc = {
        "poster_type": info.poster_type,
        "main_visual": info.main_visual,
        "brand_strength": info.brand_strength,
        "theme_style": info.theme_style,
        "text_density": info.text_density,
        "required_modules": info.required_modules,
    }
    extra_info = {
        "time": info.time,
        "location": info.location,
        "target_audience": info.target_audience,
        "core_info": info.core_info,
    }
    vc_block = visual_control_block(vc, extra_info)

    details = []
    if info.time:
        details.append(f"时间：{info.time}")
    if info.location:
        details.append(f"地点：{info.location}")
    if info.target_audience:
        details.append(f"目标人群：{info.target_audience}")
    if info.core_info:
        details.append(f"核心信息：{info.core_info}")
    details_block = "\n具体信息：\n" + "\n".join(f"- {d}" for d in details) if details else ""

    rule_based = (
        f"[角色] 你是{ctx['name_cn']}（{ctx['name_en']}）的品牌视觉设计师。\n\n"
        f"[品牌] {ctx['description']}\n\n"
        f"[视觉风格] 品牌 DNA：\n- {dna_block}\n\n"
    )
    if vc_block:
        rule_based += f"[视觉控制]\n{vc_block}\n\n"
    rule_based += (
        f"[内容] 为「{subject}」创作一张宣传图片。"
        f"内容类型：{CONTENT_TYPE_LABEL.get(info.content_type, info.content_type)}。{details_block}\n\n"
        f"[平台] {PLATFORM_LABELS.get(platform, platform)} — 视觉规范：{visual_style}\n\n"
        f"[品牌标识]\n{logo_block}\n"
        f"将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。\n\n"
        f"[禁止元素]\n{forbidden_block}\n\n"
        f"[输出] 一段高质量、符合品牌调性的中文图像生成 Prompt。"
        f"要求：画面感强、科技蓝配色、白色背景、真实人文连接、干净专业、年轻国际化。"
    )

    # 同平台历史案例作为风格参考
    cases_block = load_reference_cases(db, platform)
    if cases_block:
        rule_based += f"\n\n{cases_block}\n"

    # 可选 DeepSeek 优化提示词
    user_msg = (
        f"请把下面这段品牌约束改写为一段更专业、画面感更强的中文图像生成 Prompt，"
        f"保留所有品牌 DNA、视觉控制、禁止元素以及具体时间/地点/主办单位等关键信息：\n\n{rule_based}"
    )
    enhanced = call_ai(
        "你是 GTC 品牌视觉设计师，擅长优化中文图像生成 Prompt，输出直接可用、不要解释。",
        user_msg,
        temperature=0.6,
    )
    brand_mark = (
        f"[Brand Mark]\n{logo_block}\n"
        "Place the official GTC logo as given (upload it as a reference image). "
        "Do NOT redesign, recolor, distort, or redraw the logo; keep it exactly as provided."
    )
    if enhanced:
        # DeepSeek 可能未保留视觉控制 / 品牌标记 / 具体时间地点约束，统一在末尾追加，确保必现
        out = enhanced.rstrip()
        if vc_block and "[Visual Control]" not in out:
            out += "\n\n[Visual Control]\n" + vc_block
        if "[Brand Mark]" not in out:
            out += "\n\n" + brand_mark
        out = _ensure_concrete_details(out, extra_info)
        out = _ensure_reference_cases(out, cases_block)
        return out, True
    return _ensure_reference_cases(_ensure_concrete_details(rule_based, extra_info), cases_block), False


def _ensure_concrete_details(prompt: str, info: dict) -> str:
    """如果 Prompt 里丢失了具体时间/地点等关键信息，强制补回。"""
    out = prompt.rstrip()
    specifics = []
    if info.get("time") and info["time"] not in out:
        specifics.append(f"- 时间必须为「{info['time']}」")
    if info.get("location") and info["location"] not in out:
        specifics.append(f"- 地点必须为「{info['location']}」")
    if specifics:
        out += (
            "\n\n【关键信息必须原样保留】\n"
            + "\n".join(specifics)
            + "\n禁止把这些具体信息替换为「待定」「TBD」「待定中」等占位文字。"
        )
    return out


def _ensure_reference_cases(prompt: str, cases_block: str) -> str:
    """DeepSeek 可能未保留参考案例段落，统一在末尾补回，确保必现。"""
    if not cases_block:
        return prompt
    if "参考案例" in prompt:
        return prompt
    return prompt.rstrip() + "\n\n" + cases_block


def generate(info: ContentGenerateIn, db: Session) -> ContentGenerateOut:
    label = CONTENT_TYPE_LABEL.get(info.content_type, info.content_type)

    # 主文案：取第一个平台作为"主版本"
    primary = info.platforms[0] if info.platforms else "wechat"
    primary_copy = _COPY_BUILDERS.get(primary, _wechat_copy)(info, label)
    image_prompt, used_ai = _image_prompt(info, primary, db)

    versions = []
    for p in info.platforms:
        builder = _COPY_BUILDERS.get(p, _wechat_copy)
        copy = builder(info, label)
        img, _ = _image_prompt(info, p, db)
        versions.append(
            PlatformVersion(platform=p, copy_text=copy, image_prompt=img)
        )

    return ContentGenerateOut(
        content_type=info.content_type,
        copy_text=primary_copy,
        image_prompt=image_prompt,
        platform_versions=versions,
        used_ai=used_ai,
    )
