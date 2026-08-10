// 纯前端品牌引擎：作为「后端不可达」时的降级实现。
// 与 backend/app/data.py + services 中的品牌资产 / 生成逻辑保持一致，
// 保证静态部署（如 CloudStudio）也能完整演示，不依赖后端。

export const BRAND = {
  info: {
    name_cn: '深圳市光明科学城全球青年人才中心',
    name_en: 'Global Youth Talent Center of Guang Ming Science City',
    description: '全球青年人才服务平台，连接国际人才、科技创新企业和科学城生态。',
  },
  visual_dna: [
    '主色：科技蓝 #1E6FFF / 浅蓝 #5BA3FF / 白色 #FFFFFF',
    '辅助色：黄色 #FFC94D / 米白 #F7F8FA / 紫色渐变 #8A5BFF→#5B8CFF',
    '风格关键词：Scientific / Professional / Youthful / International / Talent Ecosystem / Human-centered',
  ],
  forbidden: [
    '赛博朋克 Cyberpunk',
    '机器人 / 机械人物',
    '过度未来科技',
    '游戏 UI 风格',
    '廉价 3D 渲染',
    'AI 假人脸',
  ],
  platforms: {
    wechat: {
      audience: '人才、企业、高校、合作机构',
      tone: '正式、专业、信息完整',
      visual_style: 'Professional science platform; Clean editorial design; Technology blue; White background; Information cards',
    },
    xiaohongshu: {
      audience: '青年人才、学生、科研人员',
      tone: '年轻、有互动感、降低官方感',
      visual_style: 'Young; Lifestyle; Community; Warm technology; Real photography',
    },
    video: {
      audience: '大众用户、活动参与者',
      tone: '真实故事、人物、情绪、故事线',
      visual_style: 'Documentary; Real people; Warm light; Behind-the-scenes; Human story',
    },
    linkedin: {
      audience: '海外人才、国际科研人员',
      tone: 'Global、Professional、Research ecosystem、International talent',
      visual_style: 'International; Professional; Research campus; Diverse talent; Clean minimal',
    },
  },
  logo: [
    'GTC 品牌标识：生成图片涉及 GTC 时，必须使用官方 logo（蓝黄渐变 GTC 图形 + 中文/英文名称组合）作为品牌标记',
  ],
  logo_url: '/gtc-logo.png',
}

// 视觉控制字段（与 backend/app/services/visual_control.py 同步）
export const VISUAL_CONTROL = {
  poster_type: {
    label: '海报视觉类型',
    options: ['信息型海报', '品牌宣传图', '活动纪实封面', '招聘封面', '文艺主题海报'],
    en: {
      信息型海报: 'Information poster: clearly structured info blocks, editorial layout, content-first',
      品牌宣传图: 'Brand awareness hero image: emotional and atmospheric, brand-forward composition',
      活动纪实封面: 'Event recap cover: authentic real documentary photo as the hero, genuine moments',
      招聘封面: 'Recruitment cover: role highlights and a clear call-to-action, professional',
      文艺主题海报: 'Artistic theme poster: refined, cultural, expressive composition',
    },
  },
  main_visual: {
    label: '主视觉形式',
    options: ['真人照片主导', '图形排版主导', '插画主导', '场景氛围主导'],
    en: {
      真人照片主导: 'Real photography of real people dominates the visual',
      图形排版主导: 'Typography and graphic layout dominate; minimal photography',
      插画主导: 'Illustration-led visual style',
      场景氛围主导: 'Atmospheric scene / environment dominates over people',
    },
  },
  brand_strength: {
    label: '品牌露出强度',
    options: ['强', '中', '弱'],
    en: {
      强: 'Prominent GTC branding: logo clearly placed, brand color blocks visible',
      中: 'Moderate branding: logo present but balanced with content',
      弱: 'Subtle branding: logo small in footer, content-first',
    },
  },
  theme_style: {
    label: '主题风格',
    options: ['科技专业', '青年社群', '文艺文化', '国际活动', '官方发布'],
    en: {
      科技专业: 'Scientific, professional, clean technology aesthetic',
      青年社群: 'Youthful, community-oriented, warm and relatable',
      文艺文化: 'Cultural, artistic, refined',
      国际活动: 'International, global, cosmopolitan',
      官方发布: 'Official release tone: authoritative and formal',
    },
  },
  text_density: {
    label: '文本密度',
    options: ['低', '中', '高'],
    en: {
      低: 'Minimal text; large visuals; only a short headline',
      中: 'Moderate text; headline plus a few supporting lines',
      高: 'Rich text: headline, subheads, info modules and details',
    },
  },
  required_modules: {
    label: '必须包含的信息模块',
    options: ['时间', '地点', '二维码', '主办单位', '报名入口'],
    en: { 时间: 'Time', 地点: 'Location', 二维码: 'QR code', 主办单位: 'Organizer', 报名入口: 'Registration entry' },
  },
}

const VC_SINGLE_KEYS = ['poster_type', 'main_visual', 'brand_strength', 'theme_style', 'text_density']

function visualControlBlock(vc, info = {}) {
  if (!vc) return ''
  const lines = []
  for (const key of VC_SINGLE_KEYS) {
    const val = vc[key]
    const def = VISUAL_CONTROL[key]
    if (val && def && def.en[val]) lines.push(`- ${def.label}（${val}）：${def.en[val]}`)
  }
  const mods = (vc.required_modules || []).filter((m) => VISUAL_CONTROL.required_modules.en[m])
  if (mods.length) {
    const modEn = mods.map((m) => VISUAL_CONTROL.required_modules.en[m])
    lines.push(`- 必须包含信息模块：${mods.join('、')}（${modEn.join(', ')}），以干净的信息卡片排版呈现`)
    // 如果用户填写了具体时间/地点/主办单位等，必须钉死在 Prompt 里，防止 AI 生成「待定」
    const specifics = []
    if (mods.includes('时间') && info.time) specifics.push(`时间必须为「${info.time}」`)
    if (mods.includes('地点') && info.location) specifics.push(`地点必须为「${info.location}」`)
    if (mods.includes('主办单位') && (info.organizer || info.host)) specifics.push(`主办单位必须为「${info.organizer || info.host}」`)
    if (mods.includes('二维码') && info.qr_text) specifics.push(`二维码旁备注「${info.qr_text}」`)
    if (mods.includes('报名入口') && info.register_text) specifics.push(`报名入口文案为「${info.register_text}」`)
    if (specifics.length) {
      lines.push(`- 信息模块的具体内容必须严格按以下呈现：${specifics.join('；')}。禁止显示「待定」「TBD」「待定中」等占位文字。`)
    }
  }
  return lines.join('\n')
}

export const PLATFORMS = [
  { key: 'wechat', label: '微信公众号' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'video', label: '视频号' },
  { key: 'linkedin', label: 'LinkedIn' },
]

const CONTENT_TYPE_LABEL = {
  招聘: '人才招聘', 活动预告: '活动预告', 活动回顾: '活动回顾',
  人才政策: '人才政策', 企业介绍: '企业/生态介绍', 科研动态: '科研动态', 品牌宣传: '品牌宣传',
}

function wechatCopy(i, label) {
  const subject = i.event_name || i.topic || '光明科学城全球青年人才中心'
  const title = `【${label}】${subject}`
  const body = [
    '近日，深圳市光明科学城全球青年人才中心持续为全球青年人才提供高质量服务与支持。' + (i.core_info ? `本次${label}相关安排如下。` : ''),
    '',
    i.core_info || '我们围绕青年人才成长全周期，提供政策对接、企业直通、社群活动等多维服务。',
    '',
    '【活动信息】',
    `时间：${i.time || '待定'}`,
    `地点：${i.location || '光明科学城全球青年人才中心'}`,
    `对象：${i.target_audience || '全球青年人才、科研人员、合作机构'}`,
    '',
    '【报名方式】',
    '请关注「光明科学城全球青年人才中心」微信公众号，获取报名入口与最新动态。',
    '',
    '【关于我们】',
    '深圳市光明科学城全球青年人才中心（Global Youth Talent Center of Guang Ming Science City）是全球青年人才服务平台，连接国际人才、科技创新企业和科学城生态。',
  ].join('\n')
  return { title, body, tags: ['光明科学城', '青年人才', label, '全球人才'] }
}

function xhsCopy(i, label) {
  const subject = i.event_name || i.topic || '青年人才活动'
  const title = label === '人才政策' || label === '人才招聘'
    ? '为什么越来越多青年人才选择光明？🤔'
    : `📍${subject}｜年轻人的真实体验分享`
  const body = [
    `✨ ${subject}`,
    '',
    i.core_info || '在光明科学城全球青年人才中心，遇见同频的伙伴、靠谱的资源、真实的成长。',
    '',
    `🕒 时间：${i.time || '关注我们获取'}`,
    `📍 地点：${i.location || '光明科学城'}`,
    `💡 适合谁：${i.target_audience || '青年科研人才 / 留学生 / 职场新人'}`,
    '',
    '你来光明之后最大的变化是什么？评论区聊聊👇',
  ].join('\n')
  return { title, body, tags: ['青年人才', '光明科学城', '深圳求职', '科研生活', label] }
}

function videoCopy(i, label) {
  const subject = i.event_name || i.topic || '青年人才故事'
  const title = `${subject}｜一个真实的青年人才故事`
  const body = [
    '【视频标题】' + title,
    '',
    '【分镜脚本】',
    '01 人物：一位刚落地光明的青年科研人才（真实、自然、非 AI 人脸）',
    `02 场景：${i.location || '光明科学城实验室 / 人才社区公共空间'}`,
    '03 情绪：温暖、坚定、充满可能性',
    '04 故事线：从远方来到光明 → 加入人才社群 → 获得政策与企业资源 → 找到归属感',
    '',
    '【口播要点】' + (i.core_info || '这里让青年人才被看见、被支持、被连接。'),
  ].join('\n')
  return { title, body, tags: ['人才故事', '光明科学城', '青年', '真实记录'] }
}

function linkedinCopy(i, label) {
  const subject = i.event_name || i.topic || 'Global Youth Talent Center'
  const title = `${subject} | Connecting Global Youth Talent at Guangming Science City`
  const body = [
    `We're excited to share updates from the Global Youth Talent Center of Guang Ming Science City.`,
    '',
    `(${label})`,
    i.core_info ? i.core_info + '\n' : '',
    i.time ? `📅 When: ${i.time}\n` : '',
    i.location ? `📍 Where: ${i.location}\n` : '',
    i.target_audience ? `🎯 Who: ${i.target_audience}\n` : '',
    '\nWe connect international researchers, science & technology enterprises, and the Guangming Science City ecosystem — building a truly global talent community.\n\n',
    "If you're a researcher or innovator exploring opportunities in the Greater Bay Area, let's connect.",
  ].join('')
  return { title, body, tags: ['#GlobalTalent', '#GuangmingScienceCity', '#YouthTalent', '#Innovation'] }
}

const BUILDERS = { wechat: wechatCopy, xiaohongshu: xhsCopy, video: videoCopy, linkedin: linkedinCopy }

function imagePrompt(i, platform) {
  const pr = BRAND.platforms[platform] || {}
  const dna = BRAND.visual_dna.join('\n- ')
  const forbidden = BRAND.forbidden.map((f) => `- 禁止：${f}`).join('\n')
  const logo = BRAND.logo.map((l) => `- ${l}`).join('\n') || '- 使用官方 GTC logo 作为品牌标记，不得重新设计'
  const subject = i.event_name || i.topic || '光明科学城全球青年人才中心活动'
  const vc = {
    poster_type: i.poster_type, main_visual: i.main_visual, brand_strength: i.brand_strength,
    theme_style: i.theme_style, text_density: i.text_density, required_modules: i.required_modules,
  }
  const vcBlock = visualControlBlock(vc, i)
  const casesBlock = loadReferenceCases(platform)

  const details = []
  if (i.time) details.push(`时间：${i.time}`)
  if (i.location) details.push(`地点：${i.location}`)
  if (i.target_audience) details.push(`目标人群：${i.target_audience}`)
  if (i.core_info) details.push(`核心信息：${i.core_info}`)
  const detailsBlock = details.length ? `\n具体信息：\n${details.map((d) => `- ${d}`).join('\n')}` : ''

  let prompt =
    `[角色] 你是${BRAND.info.name_cn}（${BRAND.info.name_en}）的品牌视觉设计师。\n\n` +
    `[品牌] ${BRAND.info.description}\n\n` +
    `[视觉风格] 品牌 DNA：\n- ${dna}\n\n`
  if (vcBlock) prompt += `[视觉控制]\n${vcBlock}\n\n`
  prompt +=
    `[内容] 为「${subject}」创作一张宣传图片。内容类型：${CONTENT_TYPE_LABEL[i.content_type] || i.content_type}。${detailsBlock}\n\n` +
    `[平台] ${PLATFORMS.find((p) => p.key === platform)?.label || platform} — 视觉规范：${pr.visual_style || ''}\n\n` +
    `[品牌标识]\n${logo}\n将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。\n\n` +
    `[禁止元素]\n${forbidden}\n\n`
  if (casesBlock) prompt += `${casesBlock}\n\n`
  prompt +=
    '[输出] 一段高质量、符合品牌调性的中文图像生成 Prompt。要求：科技蓝配色、白色背景、真实人文连接、干净专业、年轻国际化。'
  return prompt
}

export function generate(i) {
  const label = CONTENT_TYPE_LABEL[i.content_type] || i.content_type
  const platforms = i.platforms && i.platforms.length ? i.platforms : ['wechat']
  const primary = platforms[0]
  const primaryCopy = (BUILDERS[primary] || wechatCopy)(i, label)
  const img = imagePrompt(i, primary)
  const platform_versions = platforms.map((p) => ({
    platform: p,
    copy_text: (BUILDERS[p] || wechatCopy)(i, label),
    image_prompt: imagePrompt(i, p),
  }))
  return { content_type: i.content_type, copy_text: primaryCopy, image_prompt: img, platform_versions }
}

export function buildPrompt(user_input, platform, content_type, vc, info = {}) {
  const label = PLATFORMS.find((p) => p.key === platform)?.label || platform
  const pr = BRAND.platforms[platform] || {}
  const dna = BRAND.visual_dna.join('\n- ')
  const forbidden = BRAND.forbidden.map((f) => `- 禁止：${f}`).join('\n')
  const logo = BRAND.logo.map((l) => `- ${l}`).join('\n')
  const vcBlock = visualControlBlock(vc || {}, info)
  const casesBlock = loadReferenceCases(platform)

  const details = []
  if (info.time) details.push(`时间：${info.time}`)
  if (info.location) details.push(`地点：${info.location}`)
  if (info.target_audience) details.push(`目标人群：${info.target_audience}`)
  if (info.core_info) details.push(`核心信息：${info.core_info}`)
  const detailsBlock = details.length ? `\n具体信息：\n${details.map((d) => `- ${d}`).join('\n')}` : ''

  let prompt =
    `[角色]\n你是${BRAND.info.name_cn}（${BRAND.info.name_en}）的品牌视觉设计师。\n\n` +
    `[品牌]\n${BRAND.info.description}\n\n` +
    `[视觉风格]\n品牌 DNA：\n- ${dna}\n\n`
  if (vcBlock) prompt += `[视觉控制]\n${vcBlock}\n\n`
  prompt +=
    `[内容]\n用户需求：${user_input}\n内容类型：${content_type || '未指定'}\n平台：${label}\n调性：${pr.tone || ''}${detailsBlock}\n\n` +
    `[平台]\n视觉规范：${pr.visual_style || ''}\n\n` +
    `[品牌标识]\n${logo}\n将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。\n\n` +
    `[禁止元素]\n${forbidden}\n\n`
  if (casesBlock) prompt += `${casesBlock}\n\n`
  prompt +=
    '[输出]\n生成一段高质量、符合品牌调性的中文图像生成 Prompt。要求：画面感强、结构清晰、科技蓝配色、白色背景、真实人文连接、干净专业、年轻国际化。\n'
  return { platform, prompt, used_ai: false }
}

// ---- 案例：localStorage 持久化，作为后端不可用时的降级存储 ----
const CASES_KEY = 'gtc_cases_v1'
const SAMPLE_CASES = [
  { id: 1, platform: 'wechat', title: '光明科学城全球青年人才中心招聘启事', published_at: '2025-03-12',
    visual_analysis: '蓝白科技风；信息卡片化；企业介绍+岗位信息+报名方式三段式结构',
    scenario: '人才招聘类官方发布', content: '【岗位】科研项目管理岗 / 人才服务专员\n【要求】硕士及以上\n【报名】登录官网投递',
    is_reference: true },
  { id: 2, platform: 'xiaohongshu', title: '为什么越来越多青年科研人才选择光明？', published_at: '2025-04-02',
    visual_analysis: '蓝黄配色；大标题；青年化表达；活动照片',
    scenario: '青年人才引流与社群运营', content: '✨真实故事 | 从实验室到人才社区\n📍光明科学城全球青年人才中心',
    is_reference: true },
]

export function loadCases() {
  try {
    const raw = localStorage.getItem(CASES_KEY)
    if (raw) return JSON.parse(raw)
    localStorage.setItem(CASES_KEY, JSON.stringify(SAMPLE_CASES))
    return SAMPLE_CASES
  } catch {
    return SAMPLE_CASES
  }
}
export function saveCase(c) {
  const list = loadCases()
  const n = { ...c, id: Date.now() }
  localStorage.setItem(CASES_KEY, JSON.stringify([n, ...list]))
  return n
}
export function removeCase(id) {
  const list = loadCases().filter((c) => c.id !== id)
  localStorage.setItem(CASES_KEY, JSON.stringify(list))
  return list
}
export function updateCaseLocal(id, patch) {
  const list = loadCases().map((c) => (c.id === id ? { ...c, ...patch } : c))
  localStorage.setItem(CASES_KEY, JSON.stringify(list))
  return list.find((c) => c.id === id)
}

// 同平台「用作参考」的案例，拼进 Prompt（与 backend/app/services/brand_context.py 一致）
export function loadReferenceCases(platform, limit = 3) {
  const cases = loadCases()
    .filter((c) => c.platform === platform && c.is_reference !== false)
    .slice(0, limit)
  if (!cases.length) return ''
  const items = cases.map((c) => {
    const parts = [`标题：${c.title}`]
    if (c.visual_analysis) parts.push(`视觉分析：${c.visual_analysis}`)
    if (c.scenario) parts.push(`适用场景：${c.scenario}`)
    if (c.content) parts.push(`正文/要点：${c.content}`)
    if (c.analysis) parts.push(`分析：${c.analysis}`)
    return '- ' + parts.join('；')
  })
  return `【参考案例】以下为同平台（${platform}）优秀历史案例，作为本次生成的风格与内容参考，请保持一致的视觉调性与排版逻辑：\n${items.join('\n')}`
}
