// 前端直连 DeepSeek（OpenAI 兼容接口）。
// 用途：CloudStudio 等纯静态托管没有后端，用户在前端「⚙️ 设置」填入自己的 DeepSeek API Key 后，
// 前端直接调用 https://api.deepseek.com，不经任何服务器转发，Key 仅存浏览器 localStorage。
// 与 backend/app/services 的 AI 逻辑保持一致的提示词与"强制补回品牌约束"修复。
import { BRAND, PLATFORMS } from './engine.js'

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const KEY_STORAGE = 'gtc_ds_key'
const MODEL_STORAGE = 'gtc_ds_model'

export function getSettings() {
  try {
    const apiKey = localStorage.getItem(KEY_STORAGE) || ''
    const model = localStorage.getItem(MODEL_STORAGE) || 'deepseek-chat'
    return { apiKey, model }
  } catch {
    return { apiKey: '', model: 'deepseek-chat' }
  }
}

export function saveSettings({ apiKey, model }) {
  try {
    localStorage.setItem(KEY_STORAGE, (apiKey || '').trim())
    localStorage.setItem(MODEL_STORAGE, model || 'deepseek-chat')
  } catch { /* ignore */ }
}

export function isConfigured() {
  return !!getSettings().apiKey
}

export async function callDeepSeek(messages, { apiKey, model = 'deepseek-chat', temperature = 0.7 } = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, stream: false }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.text()).slice(0, 200) } catch { /* ignore */ }
    throw new Error(`DeepSeek ${res.status}: ${detail || res.statusText}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ''
}

const OPTIMIZE_SYSTEM =
  'You are the brand visual designer for GTC (Global Youth Talent Center of Guang Ming Science City). ' +
  'Rewrite the provided draft image-generation prompt into a more professional, vivid, and brand-consistent ' +
  'Chinese prompt that can be pasted directly into ChatGPT / Midjourney. Keep the same structure and intent. ' +
  'You MUST preserve every [Brand Mark] and [Visual Control] constraint from the original, ' +
  'including any specific time, location, organizer, or other concrete details. ' +
  'Never replace concrete details with placeholder text such as "待定", "TBD", or "待定中".'

// 单轮优化一段已生成的 Prompt（用于内容生成 / Prompt 引擎的图片 Prompt 增强）
export async function optimizePrompt(basePrompt, settings) {
  const raw = await callDeepSeek(
    [
      { role: 'system', content: OPTIMIZE_SYSTEM },
      { role: 'user', content: basePrompt },
    ],
    settings,
  )
  return ensureConstraints(raw, basePrompt)
}

const CHAT_SYSTEM =
  '你是 GTC（深圳市光明科学城全球青年人才中心）的 AI 提示词优化助手，服务对象是新媒体运营人员。' +
  '你非常熟悉 GTC 的品牌 DNA、禁止元素、官方 Logo 使用规则与四大平台规范。' +
  '你的任务：结合对话历史分析用户觉得图片生成结果哪里不满意，并产出一版更稳定、更符合品牌的中文图像生成 Prompt。' +
  '\n\n【输出要求】每次回复必须且只输出一个 JSON 对象（不要使用代码块标记、不要额外解释），结构如下：' +
  '\n{\n  "reply": "给用户的简短中文分析与建议（2-4 句，说清你改了什么、为什么）",' +
  '\n  "optimized_prompt": "优化后的中文图像生成 Prompt，必须包含 [角色][品牌][视觉风格][视觉控制][内容][平台][品牌标识][禁止元素][输出] 各段，且 [品牌标识] 段必须出现官方 Logo 使用约束。如果原提示词中包含具体时间、地点、主办单位、二维码备注、报名入口等必须呈现的信息，必须原样保留，禁止替换为待定、TBD、待定中等占位文字。"\n}' +
  '\n\n【约束】品牌标记（官方 GTC logo）约束在任何情况下都必须保留，不得重新设计、改色或变形。' +
  '具体时间、地点、主办单位等关键信息必须原样保留，不得省略或改写为占位符。'

// 多轮对话式优化（用于 AI 助手页）
export async function chatOptimize({ messages, currentPrompt, platform, contentType, settings }) {
  const label = PLATFORMS.find((p) => p.key === platform)?.label || platform
  const contextNote =
    `[GTC 品牌上下文]\n${brandBlockText()}\n\n` +
    `[当前平台] ${label}｜[内容类型] ${contentType || '未指定'}\n` +
    (currentPrompt ? `\n[用户当前提示词（优化基线）]\n${currentPrompt}\n` : '')

  const full = [
    { role: 'system', content: contextNote },
    ...messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
  ]

  const raw = await callDeepSeek(full, { ...settings, temperature: 0.7 })
  const parsed = parseJson(raw)
  if (parsed && parsed.reply !== undefined) {
    const reply = String(parsed.reply || '').trim()
    const optimized = ensureConstraints(String(parsed.optimized_prompt || currentPrompt || ''), currentPrompt || '')
    return { reply, optimized_prompt: optimized, used_ai: true, source: 'client' }
  }
  // JSON 解析失败：把原始回复作为分析，保留当前提示词
  return {
    reply: raw || '（未能解析 AI 返回，请重试）',
    optimized_prompt: ensureConstraints(currentPrompt || '', currentPrompt || ''),
    used_ai: true,
    source: 'client',
  }
}

// ---- helpers ----
function brandBlockText() {
  const dna = BRAND.visual_dna.map((d) => `- ${d}`).join('\n')
  const forbidden = BRAND.forbidden.map((f) => `- 禁止：${f}`).join('\n')
  const logo = BRAND.logo.map((l) => `- ${l}`).join('\n') || '- 使用官方 GTC logo 作为品牌标记，不得重新设计'
  return (
    `品牌英文名：${BRAND.info.name_en}（${BRAND.info.name_cn}）\n` +
    `品牌定位：${BRAND.info.description}\n\n` +
    `[Visual Style] Brand DNA:\n${dna}\n\n` +
    `[Brand Mark] 官方 Logo 使用规则：\n${logo}\n` +
    '将官方 GTC logo 作为参考图上传给 AI，原样使用；不得重新设计、改色、变形或重绘字体。\n\n' +
    `[Avoid] 禁止元素：\n${forbidden}`
  )
}

function extractSection(text, name) {
  if (!text) return ''
  const re = new RegExp(`\\[${name}\\][\\s\\S]*?(?=\\n\\[[A-Za-z][^\\]]*\\]|$)`, 'i')
  const m = text.match(re)
  if (!m) return ''
  return m[0].replace(new RegExp(`^\\[${name}\\]\\s*`, 'i'), '').trim()
}

function ensureConstraints(enhanced, base) {
  let out = (enhanced || '').trim()
  const vc = extractSection(base, 'Visual Control')
  if (vc && !/\[Visual Control\]/i.test(out)) out += `\n\n[Visual Control]\n${vc}`
  out = ensureBrandMark(out, base)
  out = ensureConcreteDetails(out, base)
  return out
}

function ensureBrandMark(out, base) {
  out = (out || '').trim()
  if (/\[Brand Mark\]/i.test(out)) return out
  const bm = extractSection(base, 'Brand Mark')
  const bmDefault = BRAND.logo.join('; ') || 'Use the official GTC logo as a brand mark; do not redesign it.'
  const bmText = bm
    ? `[Brand Mark]\n${bm}`
    : `[Brand Mark]\n${bmDefault} Place the official GTC logo as given (upload it as a reference image). Do NOT redesign, recolor, distort, or redraw the logo; keep it exactly as provided.`
  return out + `\n\n${bmText}`
}

// 从基线 Prompt 里提取具体时间/地点/主办单位等关键信息，如果增强后的 Prompt 把它们弄丢了，强制补回
function ensureConcreteDetails(out, base) {
  out = (out || '').trim()
  base = (base || '').trim()
  if (!base) return out
  const extracted = []
  const re = /(?:时间|地点|主办单位|目标人群|核心信息|二维码旁备注|报名入口文案)[：:\s]+「?([^\n\r「」]+?)」?(?=\n|;|，|$)/g
  let m
  while ((m = re.exec(base)) !== null) {
    const raw = m[0]
    const val = m[1].trim()
    if (!val || /待定|TBD|待定中|待定/.test(val)) continue
    // 如果增强后的文本里已经没有这个具体值，把它收集起来
    if (!out.includes(val)) extracted.push(raw.trim().replace(/[：:]\s*$/, '') + `「${val}」`)
  }
  if (extracted.length) {
    return out + `\n\n【关键信息必须原样保留】\n${extracted.map((s) => '- ' + s).join('\n')}\n禁止把这些具体信息替换为「待定」「TBD」「待定中」等占位文字。`
  }
  return out
}

function parseJson(text) {
  if (!text) return null
  let t = text.trim()
  const m = t.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (m) {
    t = m[1]
  } else {
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  }
  try { return JSON.parse(t) } catch { return null }
}
