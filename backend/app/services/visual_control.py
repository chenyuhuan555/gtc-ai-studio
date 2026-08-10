"""视觉控制字段（用户建议新增）。

让提示词生成从「只填活动名称/时间地点」升级为可控的视觉规格，
从而稳定输出、减少风格漂移。前后端共用同一套选项与英文映射。
"""

# 选项清单（前端 engine.js 同步维护）
VISUAL_CONTROL_OPTIONS = {
    "poster_type": ["信息型海报", "品牌宣传图", "活动纪实封面", "招聘封面", "文艺主题海报"],
    "main_visual": ["真人照片主导", "图形排版主导", "插画主导", "场景氛围主导"],
    "brand_strength": ["强", "中", "弱"],
    "theme_style": ["科技专业", "青年社群", "文艺文化", "国际活动", "官方发布"],
    "text_density": ["低", "中", "高"],
    "required_modules": ["时间", "地点", "二维码", "主办单位", "报名入口"],
}

# 各选项的英文语义（用于英文图像 Prompt）
POSTER_TYPE_EN = {
    "信息型海报": "Information poster: clearly structured info blocks, editorial layout, content-first",
    "品牌宣传图": "Brand awareness hero image: emotional and atmospheric, brand-forward composition",
    "活动纪实封面": "Event recap cover: authentic real documentary photo as the hero, genuine moments",
    "招聘封面": "Recruitment cover: role highlights and a clear call-to-action, professional",
    "文艺主题海报": "Artistic theme poster: refined, cultural, expressive composition",
}
MAIN_VISUAL_EN = {
    "真人照片主导": "Real photography of real people dominates the visual",
    "图形排版主导": "Typography and graphic layout dominate; minimal photography",
    "插画主导": "Illustration-led visual style",
    "场景氛围主导": "Atmospheric scene / environment dominates over people",
}
BRAND_STRENGTH_EN = {
    "强": "Prominent GTC branding: logo clearly placed, brand color blocks visible",
    "中": "Moderate branding: logo present but balanced with content",
    "弱": "Subtle branding: logo small in footer, content-first",
}
THEME_STYLE_EN = {
    "科技专业": "Scientific, professional, clean technology aesthetic",
    "青年社群": "Youthful, community-oriented, warm and relatable",
    "文艺文化": "Cultural, artistic, refined",
    "国际活动": "International, global, cosmopolitan",
    "官方发布": "Official release tone: authoritative and formal",
}
TEXT_DENSITY_EN = {
    "低": "Minimal text; large visuals; only a short headline",
    "中": "Moderate text; headline plus a few supporting lines",
    "高": "Rich text: headline, subheads, info modules and details",
}
REQUIRED_MODULE_EN = {
    "时间": "Time",
    "地点": "Location",
    "二维码": "QR code",
    "主办单位": "Organizer",
    "报名入口": "Registration entry",
}


def visual_control_block(vc: dict, info: dict | None = None) -> str:
    """根据视觉控制字段生成中英文对照的控制说明块。

    vc 来自请求体，可能缺字段或为空，全部做防御性处理。
    info 可选，用于把具体时间/地点/主办单位等钉死在 Prompt 里。
    """
    if not vc:
        return ""
    info = info or {}
    lines = []
    mapping = [
        ("poster_type", "海报视觉类型", POSTER_TYPE_EN),
        ("main_visual", "主视觉形式", MAIN_VISUAL_EN),
        ("brand_strength", "品牌露出强度", BRAND_STRENGTH_EN),
        ("theme_style", "主题风格", THEME_STYLE_EN),
        ("text_density", "文本密度", TEXT_DENSITY_EN),
    ]
    for key, label_cn, en_map in mapping:
        val = vc.get(key)
        if val and val in en_map:
            lines.append(f"- {label_cn}（{val}）：{en_map[val]}")
    mods = vc.get("required_modules") or []
    if mods:
        mod_en = [REQUIRED_MODULE_EN.get(m, m) for m in mods if m in REQUIRED_MODULE_EN]
        lines.append(
            "- 必须包含信息模块：" + "、".join(mods) + "（" + ", ".join(mod_en) + "），以干净的信息卡片排版呈现"
        )
        specifics = []
        if "时间" in mods and info.get("time"):
            specifics.append(f"时间必须为「{info['time']}」")
        if "地点" in mods and info.get("location"):
            specifics.append(f"地点必须为「{info['location']}」")
        if "主办单位" in mods and (info.get("organizer") or info.get("host")):
            specifics.append(f"主办单位必须为「{info.get('organizer') or info.get('host')}」")
        if "二维码" in mods and info.get("qr_text"):
            specifics.append(f"二维码旁备注「{info['qr_text']}」")
        if "报名入口" in mods and info.get("register_text"):
            specifics.append(f"报名入口文案为「{info['register_text']}」")
        if specifics:
            lines.append(
                "- 信息模块的具体内容必须严格按以下呈现：" + "；".join(specifics) + "。禁止显示「待定」「TBD」「待定中」等占位文字。"
            )
    return "\n".join(lines)
