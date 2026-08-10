"""GTC 品牌资产常量：被 seed 与生成服务共用，保证「单一事实来源」。

所有文案 / Prompt 生成都从这里读取品牌 DNA、禁止元素、平台规则，
从而保证 AI 输出风格稳定、品牌一致。
"""
from app.models import BrandInfo, BrandRule, ContentCase, PlatformRule

BRAND_INFO = BrandInfo(
    name_cn="深圳市光明科学城全球青年人才中心",
    name_en="Global Youth Talent Center of Guang Ming Science City",
    description="全球青年人才服务平台，连接国际人才、科技创新企业和科学城生态。",
)

# 视觉 DNA（模块一 1.2）
VISUAL_DNA = [
    BrandRule(category="visual_dna", rule="主色：科技蓝 #1E6FFF / 浅蓝 #5BA3FF / 白色 #FFFFFF",
              example="页面与海报主背景以白+科技蓝为主，浅蓝做渐变过渡"),
    BrandRule(category="visual_dna", rule="辅助色：黄色 #FFC94D / 米白 #F7F8FA / 紫色渐变 #8A5BFF→#5B8CFF",
              example="黄色用于重点数据或按钮点缀，紫色渐变用于科技氛围"),
    BrandRule(category="visual_dna",
              rule="风格关键词：Scientific / Professional / Youthful / International / Talent Ecosystem / Human-centered",
              example="构图中体现真实人物交流、城市天际线、实验室与绿地"),
]

# 禁止元素（模块一 1.2）
FORBIDDEN = [
    BrandRule(category="forbidden", rule="赛博朋克 Cyberpunk", example="霓虹废墟、暗黑未来城市"),
    BrandRule(category="forbidden", rule="机器人 / 机械人物", example="拟人机器人、机甲战士"),
    BrandRule(category="forbidden", rule="过度未来科技", example="悬浮城市、失控的飞行器群"),
    BrandRule(category="forbidden", rule="游戏 UI 风格", example="血条、技能图标、像素风"),
    BrandRule(category="forbidden", rule="廉价 3D 渲染", example="塑料感材质、低模穿帮"),
    BrandRule(category="forbidden", rule="AI 假人脸", example="不对称五官、诡异笑容、过多手指"),
]

# 四大平台规则（模块四）
PLATFORM_RULES = [
    PlatformRule(
        platform="wechat",
        audience="人才、企业、高校、合作机构",
        tone="正式、专业、信息完整",
        visual_style="Professional science platform; Clean editorial design; Technology blue; White background; Information cards",
    ),
    PlatformRule(
        platform="xiaohongshu",
        audience="青年人才、学生、科研人员",
        tone="年轻、有互动感、降低官方感",
        visual_style="Young; Lifestyle; Community; Warm technology; Real photography",
    ),
    PlatformRule(
        platform="video",
        audience="大众用户、活动参与者",
        tone="真实故事、人物、情绪、故事线",
        visual_style="Documentary; Real people; Warm light; Behind-the-scenes; Human story",
    ),
    PlatformRule(
        platform="linkedin",
        audience="海外人才、国际科研人员",
        tone="Global、Professional、Research ecosystem、International talent",
        visual_style="International; Professional; Research campus; Diverse talent; Clean minimal",
    ),
]

# 示例历史案例（模块二）
SAMPLE_CASES = [
    ContentCase(
        platform="wechat",
        title="光明科学城全球青年人才中心招聘启事",
        published_at="2025-03-12",
        content="【岗位】科研项目管理岗 / 人才服务专员\n【要求】硕士及以上，具备科技人才服务经验\n【报名】登录官网投递，截止 2025-04-10",
        visual_analysis="蓝白科技风；信息卡片化；企业介绍+岗位信息+报名方式三段式结构",
        scenario="人才招聘类官方发布",
        analysis="结构清晰、信息完整，适合作为公众号招聘模板",
    ),
    ContentCase(
        platform="xiaohongshu",
        title="为什么越来越多青年科研人才选择光明？",
        published_at="2025-04-02",
        content="✨真实故事 | 从实验室到人才社区\n📍光明科学城全球青年人才中心\n💡这里有青年社群、政策礼包、企业直通车",
        visual_analysis="蓝黄配色；大标题；青年化表达；活动照片",
        scenario="青年人才引流与社群运营",
        analysis="用提问式标题降低官方感，互动数据较好",
    ),
]

PLATFORM_LABELS = {
    "wechat": "微信公众号",
    "xiaohongshu": "小红书",
    "video": "视频号",
    "linkedin": "LinkedIn",
}

# 官方 Logo 使用规则（用户要求：生成图片涉及 GTC 时统一使用此 logo）
LOGO_RULE = [
    BrandRule(
        category="logo",
        rule="GTC 品牌标识：生成图片涉及 GTC 时，必须使用官方 logo（蓝黄渐变 GTC 图形 + 中文/英文名称组合）作为品牌标记",
        example="将原版官方 logo 置于海报右上角或底部居中；不得重新设计、变形、改色或重绘字体；生成时请上传官方 logo 作为参考图",
    ),
]
