"""AI 助手：多轮对话式提示词优化（模块五增强）。

用户把"生成结果哪里不满意"告诉助手，助手结合 GTC 品牌上下文做多轮分析，
返回一版优化后的英文图像生成 Prompt（用户复制到网页 ChatGPT / Midjourney 使用）。
无 DeepSeek Key 时降级为规则化提示，保证接口可用。
"""
import json
import re

from app.services.ai_client import call_ai_multi
from app.services.brand_context import PLATFORM_LABELS, load_brand_context, load_reference_cases

SYSTEM_PROMPT = """你是 GTC（深圳市光明科学城全球青年人才中心）的 AI 提示词优化助手，服务对象是新媒体运营人员。
你非常熟悉 GTC 的品牌 DNA、禁止元素、官方 Logo 使用规则与四大平台规范。
你的任务：结合对话历史分析用户觉得图片生成结果哪里不满意，并产出一版更稳定、更符合品牌的中文图像生成 Prompt。

【输出要求】每次回复必须且只输出一个 JSON 对象（不要使用代码块标记、不要额外解释），结构如下：
{
  "reply": "给用户的简短中文分析与建议（2-4 句，说清你改了什么、为什么）",
  "optimized_prompt": "优化后的中文图像生成 Prompt，必须包含 [角色][品牌][视觉风格][视觉控制][内容][平台][品牌标识][禁止元素][输出] 各段，且 [品牌标识] 段必须出现官方 Logo 使用约束。如果原提示词中包含具体时间、地点、主办单位、二维码备注、报名入口等必须呈现的信息，必须原样保留，禁止替换为待定、TBD、待定中等占位文字。"
}

【约束】品牌标记（官方 GTC logo）约束在任何情况下都必须保留，不得重新设计、改色或变形。
具体时间、地点、主办单位等关键信息必须原样保留，不得省略或改写为占位符。"""


def _brand_block(db, workspace_id: str = "gtc-default") -> str:
    ctx = load_brand_context(db, workspace_id)
    dna = "\n".join(f"- {d}" for d in ctx["visual_dna"])
    forbidden = "\n".join(f"- 禁止：{f}" for f in ctx["forbidden"])
    logo = "\n".join(f"- {l}" for l in ctx["logo"]) or "- 使用官方 GTC logo 作为品牌标记，不得重新设计"
    return (
        f"品牌英文名：{ctx['name_en']}（{ctx['name_cn']}）\n"
        f"品牌定位：{ctx['description']}\n\n"
        f"[Visual Style] Brand DNA:\n{dna}\n\n"
        f"[Brand Mark] 官方 Logo 使用规则：\n{logo}\n"
        "将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。\n\n"
        f"[Avoid] 禁止元素：\n{forbidden}"
    )


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    t = text.strip()
    # 去掉可能的 ```json ... ``` 代码块
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", t, re.DOTALL)
    if m:
        t = m.group(1)
    else:
        # 退而求其次：截取第一个 { 到最后一个 }
        s, e = t.find("{"), t.rfind("}")
        if s != -1 and e != -1 and e > s:
            t = t[s : e + 1]
    try:
        return json.loads(t)
    except Exception:
        return None


def _ensure_brand_mark(prompt: str, db, workspace_id: str = "gtc-default") -> str:
    ctx = load_brand_context(db, workspace_id)
    if not ctx["logo"]:
        return prompt
    logo = "; ".join(ctx["logo"])
    if "[Brand Mark]" in prompt:
        return prompt
    block = (
        f"\n\n[Brand Mark] {logo} "
        "Place the official GTC logo as given (upload it as a reference image). "
        "Do NOT redesign, recolor, distort, or redraw the logo; keep it exactly as provided."
    )
    return prompt.rstrip() + block


def optimize(messages: list[dict], current_prompt: str, platform: str, content_type: str, db, workspace_id: str = "gtc-default") -> tuple[str, str, bool]:
    """多轮优化。返回 (reply, optimized_prompt, used_ai)。"""
    label = PLATFORM_LABELS.get(platform, platform)
    brand = _brand_block(db, workspace_id)
    cases_block = load_reference_cases(db, platform, workspace_id)

    # 把品牌上下文与当前提示词作为隐藏 system 备注注入到对话开头
    context_note = (
        f"[GTC 品牌上下文]\n{brand}\n\n"
        f"[当前平台] {label}｜[内容类型] {content_type or '未指定'}\n"
    )
    if cases_block:
        context_note += f"\n{cases_block}\n"
    if current_prompt:
        context_note += f"\n[用户当前提示词（优化基线）]\n{current_prompt}\n"

    full_messages = [{"role": "system", "content": context_note}]
    # 仅保留 user/assistant 角色，避免把 system 误塞进历史
    full_messages += [{"role": m["role"], "content": m["content"]} for m in messages if m.get("role") in ("user", "assistant")]

    raw = call_ai_multi(SYSTEM_PROMPT, full_messages, temperature=0.7)

    if not raw:
        # 无 Key / 调用失败：降级为规则化提示
        fallback_reply = (
            "（当前未配置 DeepSeek API Key，已切换为规则化回复）"
            "请在 backend/.env 填入 DEEPSEEK_API_KEY 后重试，即可获得真正的多轮 AI 优化。"
            "你可以基于下方当前提示词，按品牌上下文自行调整视觉控制字段。"
        )
        return fallback_reply, _ensure_concrete_details(current_prompt or ""), False

    parsed = _parse_json(raw)
    if parsed and isinstance(parsed, dict):
        reply = str(parsed.get("reply", "")).strip()
        optimized = str(parsed.get("optimized_prompt", "")).strip()
        if not optimized:
            optimized = current_prompt
        return reply, _ensure_brand_mark(_ensure_concrete_details(optimized, current_prompt or ""), db, workspace_id), True

    # 解析失败：把原始回复作为分析，保留当前提示词
    return raw.strip(), _ensure_brand_mark(_ensure_concrete_details(current_prompt or ""), db, workspace_id), True


def _ensure_concrete_details(prompt: str, base: str = "") -> str:
    """如果基线 Prompt 里包含具体时间/地点等关键信息，而优化后 Prompt 丢失了，强制补回。"""
    out = prompt.rstrip()
    base = base.strip()
    if not base:
        return out
    specifics = []
    for match in re.finditer(
        r"(?:时间|地点|主办单位|目标人群|核心信息|二维码旁备注|报名入口文案)[：:\s]+「?([^\n\r「」]+?)」?(?=\n|;|，|$)",
        base,
    ):
        raw = match.group(0).strip().rstrip("：: ")
        value = match.group(1).strip()
        if not value or re.search(r"待定|TBD|待定中", value):
            continue
        if value not in out:
            specifics.append(f"- {raw}「{value}」")
    if specifics:
        out += (
            "\n\n【关键信息必须原样保留】\n"
            + "\n".join(specifics)
            + "\n禁止把这些具体信息替换为「待定」「TBD」「待定中」等占位文字。"
        )
    return out
