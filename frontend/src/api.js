// 前端 API 封装：优先走后端（开发期 Vite proxy 转发 /api → :8000），
// 后端不可达时自动降级到内置纯前端引擎（engine.js），保证静态部署也能完整演示。
// 若用户在前端「⚙️ 设置」填入了 DeepSeek Key，则降级路径会改为前端直连 DeepSeek。
import {
  BRAND, PLATFORMS, generate as engGenerate, buildPrompt as engBuild,
  loadCases, saveCase, removeCase, updateCaseLocal,
} from './engine.js'
import * as ds from './deepseek.js'
import { supabase } from './supabase.js'

async function req(path, opts = {}) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json()
}

async function optimizeImagePromptIfConfigured(result) {
  if (!result || result.used_ai || !ds.isConfigured() || !result.image_prompt) return result
  try {
    return {
      ...result,
      image_prompt: await ds.optimizePrompt(result.image_prompt, ds.getSettings()),
      used_ai: true,
      ai_source: 'client',
    }
  } catch {
    return result
  }
}

function brandFallback() {
  return {
    info: BRAND.info,
    visual_dna: BRAND.visual_dna.map((rule, i) => ({ id: i, category: 'visual_dna', rule, example: '' })),
    forbidden: BRAND.forbidden.map((rule, i) => ({ id: i, category: 'forbidden', rule, example: '' })),
    templates: [],
    logo: BRAND.logo.map((rule, i) => ({ id: i, category: 'logo', rule, example: '' })),
  }
}
function platformsFallback() {
  return Object.entries(BRAND.platforms).map(([platform, v]) => ({ platform, ...v }))
}

export const api = {
  async getBrand() {
    try { return await req('/brand') } catch { return brandFallback() }
  },
  async getPlatforms() {
    try { return await req('/platforms') } catch { return platformsFallback() }
  },
  async getCases(platform) {
    try {
      const r = await req('/cases' + (platform ? `?platform=${platform}` : ''))
      return r
    } catch {
      let c = loadCases()
      if (platform) c = c.filter((x) => x.platform === platform)
      return c
    }
  },
  async createCase(data) {
    try { return await req('/cases', { method: 'POST', body: JSON.stringify(data) }) }
    catch { return saveCase(data) }
  },
  async deleteCase(id) {
    try { await req('/cases/' + id, { method: 'DELETE' }) } catch { removeCase(id) }
    return { ok: true }
  },
  async updateCase(id, data) {
    try { return await req('/cases/' + id, { method: 'PUT', body: JSON.stringify(data) }) }
    catch { return updateCaseLocal(id, data) }
  },
  // 品牌知识库编辑（需后端；静态预览模式调用会失败，由 UI 提示）
  async updateBrandInfo(data) {
    return req('/brand/info', { method: 'PUT', body: JSON.stringify(data) })
  },
  async createBrandRule(category, rule, example = '') {
    return req('/brand/rules', { method: 'POST', body: JSON.stringify({ category, rule, example }) })
  },
  async updateBrandRule(id, data) {
    return req('/brand/rules/' + id, { method: 'PUT', body: JSON.stringify(data) })
  },
  async deleteBrandRule(id) {
    return req('/brand/rules/' + id, { method: 'DELETE' })
  },
  async generate(data) {
    let r
    try {
      r = await req('/content/generate', { method: 'POST', body: JSON.stringify(data) })
      r = await optimizeImagePromptIfConfigured(r)
    } catch {
      r = engGenerate(data)
      if (ds.isConfigured()) {
        try {
          r.image_prompt = await ds.optimizePrompt(r.image_prompt, ds.getSettings())
          r.used_ai = true
          r.ai_source = 'client'
        } catch { /* 前端 AI 失败则保留规则化结果 */ }
      }
    }
    recordGeneration({
      kind: '内容生成',
      title: r.copy_text?.title || data.event_name || data.topic || data.content_type,
      platform: data.platforms?.[0] || 'wechat',
      used_ai: !!r.used_ai,
    })
    return r
  },
  async buildPrompt(data) {
    let r
    try {
      r = await req('/prompt/build', { method: 'POST', body: JSON.stringify(data) })
      if (!r.used_ai && ds.isConfigured() && r.prompt) {
        try {
          r = { ...r, prompt: await ds.optimizePrompt(r.prompt, ds.getSettings()), used_ai: true, ai_source: 'client' }
        } catch { /* 本地 Key 失败则保留规则化结果 */ }
      }
    } catch {
      const vc = {
        poster_type: data.poster_type, main_visual: data.main_visual, brand_strength: data.brand_strength,
        theme_style: data.theme_style, text_density: data.text_density, required_modules: data.required_modules,
      }
      const info = {
        time: data.time, location: data.location, target_audience: data.target_audience, core_info: data.core_info,
      }
      r = engBuild(data.user_input, data.platform, data.content_type, vc, info)
      if (ds.isConfigured()) {
        try {
          r.prompt = await ds.optimizePrompt(r.prompt, ds.getSettings())
          r.used_ai = true
          r.ai_source = 'client'
        } catch { /* 保留规则化 */ }
      }
    }
    recordGeneration({
      kind: 'Prompt 引擎',
      title: (data.user_input || '').slice(0, 30) || '品牌 Prompt',
      platform: data.platform || 'wechat',
      used_ai: !!r.used_ai,
    })
    return r
  },
  async chatOptimize(data) {
    try {
      return await req('/chat/optimize', { method: 'POST', body: JSON.stringify(data) })
    } catch (e) {
      if (ds.isConfigured()) {
        // 静态部署无后端：前端直接用用户填入的 DeepSeek Key 调用
        return ds.chatOptimize({
          messages: data.messages,
          currentPrompt: data.current_prompt,
          platform: data.platform,
          contentType: data.content_type,
          settings: ds.getSettings(),
        })
      }
      // 既无后端也无前端 Key：引导去设置页
      return {
        reply:
          'AI 助手需要 DeepSeek API Key 才能运行。当前未配置 Key。\n\n' +
          '请点击左侧「⚙️ 设置」，粘贴你的 DeepSeek API Key（仅保存在本机浏览器），保存后即可在此直接多轮优化提示词，无需后端。',
        optimized_prompt: data.current_prompt || '',
        used_ai: false,
        needs_key: true,
      }
    }
  },

  getSettings: ds.getSettings,
  saveSettings: ds.saveSettings,
  isClientConfigured: ds.isConfigured,
}

export const getSettings = ds.getSettings
export const saveSettings = ds.saveSettings
export const isClientConfigured = ds.isConfigured

// ---- 最近 AI 生成记录（localStorage，Dashboard 展示）----
const RECENT_KEY = 'gtc_recent_gens'
export function recordGeneration(entry) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    list.unshift({ ...entry, time: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)))
  } catch { /* ignore */ }
}
export function loadRecentGenerations() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export { PLATFORMS }

export const CONTENT_TYPES = [
  '招聘', '活动预告', '活动回顾', '人才政策', '企业介绍', '科研动态', '品牌宣传',
]

export function platformLabel(key) {
  return PLATFORMS.find((p) => p.key === key)?.label || key
}
export function platformColor(key) {
  return ({
    wechat: 'bg-green-50 text-green-600',
    xiaohongshu: 'bg-rose-50 text-rose-600',
    video: 'bg-blue-50 text-blue-600',
    linkedin: 'bg-sky-50 text-sky-700',
  })[key] || 'bg-slate-100 text-slate-600'
}
