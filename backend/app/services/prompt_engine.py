"""Prompt 优化引擎（模块五）。

将「用户需求 + GTC 品牌 DNA + 平台规则 + 历史案例 + 视觉约束」拼装为
ChatGPT / Midjourney 可直接使用的结构化 Prompt，并保证风格稳定、品牌一致。
"""
from sqlalchemy.orm import Session

from app.services.ai_client import call_ai
from app.services.brand_context import PLATFORM_LABELS, load_brand_context, load_reference_cases
from app.services.visual_control import visual_control_block

SYSTEM_PROMPT = (
    "你是 GTC（光明科学城全球青年人才中心）品牌视觉设计师，擅长把需求改写为高质量中文图像生成 Prompt。"
    "请基于给定的品牌 DNA、平台规则与禁止元素，把用户需求改写为一段专业、可直接粘贴到"
    "ChatGPT / Midjourney 使用的图像生成 Prompt（中文输出，结构清晰、画面感强）。"
)


def build_prompt(
    user_input: str,
    platform: str,
    content_type: str,
    db: Session,
    vc: dict | None = None,
    info: dict | None = None,
    workspace_id: str = "gtc-default",
) -> tuple[str, bool]:
    ctx = load_brand_context(db, workspace_id)
    label = PLATFORM_LABELS.get(platform, platform)
    pr = ctx["platform_rules"].get(platform)
    visual_style = pr.visual_style if pr else ""
    tone = pr.tone if pr else ""

    forbidden_block = "\n".join(f"- 禁止：{f}" for f in ctx["forbidden"])
    dna_block = "\n".join(f"- {d}" for d in ctx["visual_dna"])
    logo_block = "\n".join(f"- {l}" for l in ctx["logo"]) or "- 使用官方 GTC logo 作为品牌标记，不得重新设计"
    vc_block = visual_control_block(vc or {}, info)

    details = []
    if info:
        if info.get("time"):
            details.append(f"时间：{info['time']}")
        if info.get("location"):
            details.append(f"地点：{info['location']}")
        if info.get("target_audience"):
            details.append(f"目标人群：{info['target_audience']}")
        if info.get("core_info"):
            details.append(f"核心信息：{info['core_info']}")
    details_block = "\n具体信息：\n" + "\n".join(f"- {d}" for d in details) if details else ""

    # ---- 规则化（确定性）Prompt：保证无 Key 也能产出 ----
    rule_based = f"""[角色]
你是{ctx['name_cn']}（{ctx['name_en']}）的品牌视觉设计师。

[品牌]
{ctx['description']}

[视觉风格]
品牌 DNA：
{dna_block}
"""
    if vc_block:
        rule_based += f"\n[视觉控制]\n{vc_block}\n"
    rule_based += f"""
[内容]
用户需求：{user_input}
内容类型：{content_type or '未指定'}
平台：{label}
调性：{tone}{details_block}

[平台]
视觉规范：{visual_style}

[品牌标识]
{logo_block}
将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。

[禁止元素]
{forbidden_block}

[输出]
生成一段高质量、符合品牌调性的中文图像生成 Prompt。要求：画面感强、结构清晰、科技蓝配色、白色背景、真实人文连接、干净专业、年轻国际化。
"""

    # 同平台历史案例作为风格参考
    cases_block = load_reference_cases(db, platform, workspace_id)
    if cases_block:
        rule_based += f"\n\n{cases_block}\n"

    # ---- 可选 DeepSeek 增强（优化提示词）----
    user_msg = (
        f"用户需求：{user_input}\n"
        f"内容类型：{content_type or '未指定'}\n"
        f"目标平台：{label}\n\n"
        f"品牌 DNA：\n{dna_block}\n\n"
    )
    if vc_block:
        user_msg += f"视觉控制要求：\n{vc_block}\n\n"
    user_msg += (
        f"平台视觉规范：{visual_style}\n\n"
        f"官方 Logo 使用规则：\n{logo_block}\n\n"
        f"禁止元素：\n{forbidden_block}"
    )
    if cases_block:
        user_msg += f"\n\n{cases_block}"
    enhanced = call_ai(SYSTEM_PROMPT, user_msg, temperature=0.7)
    brand_mark = (
        f"\n\n[Brand Mark]\n{logo_block}\n"
        "将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。"
    )
    if enhanced:
        # DeepSeek 可能未保留视觉控制 / 品牌标记 / 关键信息约束，统一在末尾追加，确保必现
        out = enhanced.rstrip()
        if vc_block and "[Visual Control]" not in out:
            out += f"\n\n[Visual Control]\n{vc_block}"
        if "[Brand Mark]" not in out:
            out += brand_mark
        out = _ensure_concrete_details(out, info or {})
        out = _ensure_reference_cases(out, cases_block)
        return out, True
    return _ensure_reference_cases(_ensure_concrete_details(rule_based, info or {}), cases_block), False


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
