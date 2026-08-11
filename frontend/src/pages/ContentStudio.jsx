import React, { useState, useEffect } from 'react'
import { api, PLATFORMS, getContentTypes, addCustomContentType, platformLabel, platformColor } from '../api.js'
import { VISUAL_CONTROL } from '../engine.js'
import { SparkIcon, DocPenIcon, ChatIcon } from '../icons.jsx'

// ---- 表单内容缓存：切换导航 / 刷新页面后自动恢复用户输入 ----
const STUDIO_FORM_KEY = 'gtc_studio_form_v1'
function defaultStudioForm() {
  return {
    content_type: '招聘',
    topic: '',
    event_name: '',
    target_audience: '',
    time: '',
    location: '',
    core_info: '',
    platforms: ['wechat', 'xiaohongshu'],
    poster_type: '',
    main_visual: '',
    brand_strength: '',
    theme_style: '',
    text_density: '',
    required_modules: [],
  }
}
function loadStudioForm() {
  try {
    const raw = localStorage.getItem(STUDIO_FORM_KEY)
    if (raw) return { ...defaultStudioForm(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaultStudioForm()
}

const PROMPT_FORM_KEY = 'gtc_prompt_form_v1'
function defaultPromptForm() {
  return {
    input: '生成一个青年科学家交流活动海报',
    platform: 'wechat',
    ctype: '活动预告',
    vc: { poster_type: '', main_visual: '', brand_strength: '', theme_style: '', text_density: '', required_modules: [] },
  }
}
function loadPromptForm() {
  try {
    const raw = localStorage.getItem(PROMPT_FORM_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { ...defaultPromptForm(), ...p, vc: { ...defaultPromptForm().vc, ...(p.vc || {}) } }
    }
  } catch { /* ignore */ }
  return defaultPromptForm()
}

export default function ContentStudio({ onSendToChat }) {
  const [tab, setTab] = useState('generate')
  const [form, setForm] = useState(loadStudioForm())
  const [contentTypes, setContentTypes] = useState(getContentTypes)
  // 切换导航 / 刷新页面时保留已填内容
  useEffect(() => {
    try { localStorage.setItem(STUDIO_FORM_KEY, JSON.stringify(form)) } catch { /* ignore */ }
  }, [form])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeVer, setActiveVer] = useState(0)

  const togglePlatform = (key) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(key)
        ? f.platforms.filter((p) => p !== key)
        : [...f.platforms, key],
    }))
  }

  const createContentType = () => {
    const name = window.prompt('请输入自定义内容类型名称（例如：园区服务）')?.trim()
    if (!name) return
    setContentTypes(addCustomContentType(name))
    setForm((current) => ({ ...current, content_type: name }))
  }

  const generate = async () => {
    setError('')
    if (form.platforms.length === 0) return setError('请至少选择一个发布平台')
    setLoading(true)
    try {
      const r = await api.generate(form)
      setResult(r)
      setActiveVer(0)
    } catch (e) {
      setError('生成失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-gtc-ink">内容生产中心</h1>
        <p className="text-sm text-gtc-sub mt-1">AI 助力内容创作，一键生成多平台文案与图片 Prompt</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        <TabBtn active={tab === 'generate'} onClick={() => setTab('generate')}>内容创建</TabBtn>
        <TabBtn active={tab === 'prompt'} onClick={() => setTab('prompt')}>Prompt 优化引擎</TabBtn>
      </div>

      {tab === 'generate' ? (
        /* ---- AI 工作流三栏：输入需求 → 生成结果 → 操作 ---- */
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_230px] gap-5 items-start">
          {/* 左：输入需求 */}
          <div className="card space-y-4">
            <div className="text-[15px] font-semibold text-gtc-ink flex items-center gap-2">
              <DocPenIcon size={17} className="text-gtc-blue" /> 输入需求
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">内容类型</label>
                <button type="button" className="text-xs text-gtc-blue hover:underline" onClick={createContentType}>＋ 自定义</button>
              </div>
              <select className="input" value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value })}>
                {contentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="主题" value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} />
            <Field label="活动名称" value={form.event_name} onChange={(v) => setForm({ ...form, event_name: v })} />
            <Field label="目标对象" value={form.target_audience} onChange={(v) => setForm({ ...form, target_audience: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="时间" value={form.time} onChange={(v) => setForm({ ...form, time: v })} />
              <Field label="地点" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            </div>
            <div>
              <label className="label">核心信息</label>
              <textarea className="input" rows={3} value={form.core_info}
                onChange={(e) => setForm({ ...form, core_info: e.target.value })} />
            </div>

            {/* 视觉控制字段：让生成的提示词稳定、减少风格漂移 */}
            <VisualControlSection form={form} setForm={setForm} />
            <div>
              <label className="label">发布平台</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p.key} type="button" onClick={() => togglePlatform(p.key)}
                    className={'chip border ' + (form.platforms.includes(p.key)
                      ? p.color + ' border-transparent'
                      : 'bg-white text-gtc-sub border-black/[0.08]')}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <button className="btn-primary w-full" onClick={generate} disabled={loading}>
              {loading ? '生成中…' : '✦ 生成内容'}
            </button>
          </div>

          {/* 中：AI 生成结果 */}
          <div className="space-y-4 min-w-0">
            {!result && (
              <div className="card text-sm text-gtc-sub min-h-[300px] flex flex-col items-center justify-center gap-2">
                <SparkIcon size={28} className="text-gtc-blue/40" />
                填写左侧需求并点击生成，这里将展示 AI 生成的文案与图片 Prompt。
              </div>
            )}
            {result && (
              <>
                <ResultCard title={`主文案（${platformLabel(result.platform_versions[activeVer]?.platform || form.platforms[0])}）`}>
                  <div className="font-semibold text-gtc-ink">{result.copy_text.title}</div>
                  <pre className="whitespace-pre-wrap text-sm text-gtc-sub mt-2 font-sans">{result.copy_text.body}</pre>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {result.copy_text.tags.map((t) => <span key={t} className="chip bg-gtc-light/10 text-gtc-blue">#{t}</span>)}
                  </div>
                </ResultCard>

                <ResultCard title={
                  <div className="flex items-center justify-between gap-2">
                    <span>图片 Prompt（主版本）</span>
                    {result.used_ai
                      ? <span className="chip bg-emerald-50 text-emerald-600">{result.ai_source === 'client' ? 'DeepSeek 优化（前端直连）' : 'DeepSeek 优化'}</span>
                      : <span className="chip bg-amber-50 text-amber-600">规则化（未配置 Key）</span>}
                  </div>
                }>
                  {!result.used_ai && (
                    <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      未配置 DeepSeek Key，当前为规则化结果。前往左侧 <strong>⚙ 设置</strong> 填入 Key 后即可获得 DeepSeek 优化。
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap text-sm text-gtc-sub font-sans">{result.image_prompt}</pre>
                </ResultCard>

                {result.platform_versions.length > 1 && (
                  <ResultCard title="多平台版本">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {result.platform_versions.map((v, i) => (
                        <button key={v.platform} onClick={() => setActiveVer(i)}
                          className={'chip ' + (i === activeVer ? platformColor(v.platform) : 'bg-slate-100 text-gtc-sub')}>
                          {platformLabel(v.platform)}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gtc-ink">{result.platform_versions[activeVer].copy_text.title}</div>
                      <CopyButton text={result.platform_versions[activeVer].copy_text.body} />
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gtc-sub mt-2 font-sans">{result.platform_versions[activeVer].copy_text.body}</pre>
                  </ResultCard>
                )}
              </>
            )}
          </div>

          {/* 右：操作栏 */}
          <div className="card space-y-3 lg:sticky lg:top-4">
            <div className="text-[15px] font-semibold text-gtc-ink">操作</div>
            {result ? (
              <>
                <div className="rounded-2xl bg-gtc-bg border border-black/[0.04] p-3 text-xs text-gtc-sub">
                  {result.used_ai ? '✦ 已由 DeepSeek 优化' : '规则化引擎生成'}
                </div>
                <ActionRow label="复制主文案" text={result.copy_text.body} />
                <ActionRow label="复制图片 Prompt" text={result.image_prompt} />
                <button
                  onClick={() => onSendToChat && onSendToChat(result.image_prompt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gtc-ink border border-black/[0.05] bg-white transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <ChatIcon size={16} className="text-gtc-blue shrink-0" />
                  用 AI 助手优化
                </button>
                <button
                  onClick={generate}
                  disabled={loading}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gtc-ink border border-black/[0.05] bg-white transition hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-50"
                >
                  <SparkIcon size={16} className="text-gtc-blue shrink-0" />
                  {loading ? '生成中…' : '重新生成'}
                </button>
                {result.platform_versions.length > 1 && (
                  <div className="pt-2 border-t border-black/[0.05]">
                    <div className="label !mb-2">切换平台版本</div>
                    <div className="flex flex-col gap-1.5">
                      {result.platform_versions.map((v, i) => (
                        <button key={v.platform} onClick={() => setActiveVer(i)}
                          className={'text-left text-xs px-3 py-2 rounded-xl transition ' +
                            (i === activeVer ? 'bg-gtc-blue/10 text-gtc-blue font-medium' : 'text-gtc-sub hover:bg-black/[0.03]')}>
                          {platformLabel(v.platform)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-gtc-sub">生成后，这里提供复制、AI 优化、重新生成与平台切换操作。</div>
            )}
          </div>
        </div>
      ) : (
        <PromptEngine onSendToChat={onSendToChat} />
      )}
    </div>
  )
}

// 视觉控制字段：单选用 chip 切换，信息模块多选
function VisualControlSection({ form, setForm }) {
  const singleKeys = ['poster_type', 'main_visual', 'brand_strength', 'theme_style', 'text_density']
  const modulesKey = 'required_modules'
  const toggleModule = (m) => {
    const arr = form[modulesKey] || []
    setForm({ ...form, [modulesKey]: arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m] })
  }
  return (
    <div className="rounded-2xl bg-gtc-bg border border-black/[0.04] p-4 space-y-3">
      <div className="text-[13px] font-semibold text-gtc-ink">视觉控制（让提示词更稳定）</div>
      {singleKeys.map((key) => {
        const def = VISUAL_CONTROL[key]
        return (
          <div key={key}>
            <div className="label !mb-1.5">{def.label}</div>
            <div className="flex flex-wrap gap-2">
              {def.options.map((opt) => {
                const active = form[key] === opt
                return (
                  <button key={opt} type="button" onClick={() => setForm({ ...form, [key]: active ? '' : opt })}
                    className={'chip border ' + (active ? 'bg-gtc-blue text-white border-transparent' : 'bg-white text-gtc-sub border-black/[0.08]')}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div>
        <div className="label !mb-1.5">{VISUAL_CONTROL[modulesKey].label}（可多选）</div>
        <div className="flex flex-wrap gap-2">
          {VISUAL_CONTROL[modulesKey].options.map((opt) => {
            const active = (form[modulesKey] || []).includes(opt)
            return (
              <button key={opt} type="button" onClick={() => toggleModule(opt)}
                className={'chip border ' + (active ? 'bg-gtc-blue text-white border-transparent' : 'bg-white text-gtc-sub border-black/[0.08]')}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PromptEngine({ onSendToChat }) {
  const init = loadPromptForm()
  const [contentTypes, setContentTypes] = useState(getContentTypes)
  const [input, setInput] = useState(init.input)
  const [platform, setPlatform] = useState(init.platform)
  const [ctype, setCtype] = useState(init.ctype)
  const [vc, setVc] = useState(init.vc)
  useEffect(() => {
    try { localStorage.setItem(PROMPT_FORM_KEY, JSON.stringify({ input, platform, ctype, vc })) } catch { /* ignore */ }
  }, [input, platform, ctype, vc])
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)

  const createContentType = () => {
    const name = window.prompt('请输入自定义内容类型名称（例如：园区服务）')?.trim()
    if (!name) return
    setContentTypes(addCustomContentType(name))
    setCtype(name)
  }

  const run = async () => {
    setLoading(true)
    try {
      const r = await api.buildPrompt({
        user_input: input, platform, content_type: ctype,
        poster_type: vc.poster_type, main_visual: vc.main_visual, brand_strength: vc.brand_strength,
        theme_style: vc.theme_style, text_density: vc.text_density, required_modules: vc.required_modules,
      })
      setRes(r)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card space-y-4">
        <div>
          <label className="label">你的需求</label>
          <textarea className="input" rows={3} value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">平台</label>
            <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">内容类型</label>
              <button type="button" className="text-xs text-gtc-blue hover:underline" onClick={createContentType}>＋ 自定义</button>
            </div>
            <select className="input" value={ctype} onChange={(e) => setCtype(e.target.value)}>
              {contentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <VisualControlSection form={vc} setForm={setVc} />
        <button className="btn-primary w-full" onClick={run} disabled={loading}>
          {loading ? '生成中…' : '✦ 生成品牌 Prompt'}
        </button>
        <p className="text-xs text-gtc-sub">系统自动拼接：用户需求 + GTC 品牌 DNA + 平台规则 + 视觉控制 + 视觉约束。</p>
      </div>
      <div className="card">
        <div className="font-semibold text-gtc-ink mb-3">生成结果</div>
        {!res && <div className="text-sm text-gtc-sub">输入需求后点击生成。</div>}
        {res && (
          <>
            <span className={'chip mb-3 ' + (res.used_ai ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
              {res.used_ai ? (res.ai_source === 'client' ? 'DeepSeek 优化（前端直连）' : 'DeepSeek 优化') : '规则化引擎（未配置 Key）'}
            </span>
            {!res.used_ai && (
              <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                未配置 DeepSeek Key，当前为规则化结果。前往左侧 <strong>⚙ 设置</strong> 填入 Key 后即可获得 DeepSeek 优化的提示词。
              </div>
            )}
            <div className="flex justify-end gap-3 mb-2">
              {onSendToChat && (
                <button onClick={() => onSendToChat(res.prompt)}
                  className="text-xs text-gtc-blue hover:underline shrink-0">💬 用 AI 助手优化</button>
              )}
              <CopyButton text={res.prompt} />
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gtc-sub font-sans">{res.prompt}</pre>
          </>
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={'seg-tab' + (active ? ' active' : '')}>
      {children}
    </button>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ResultCard({ title, children }) {
  return (
    <div className="card">
      <div className="font-semibold text-gtc-ink mb-2">{title}</div>
      {children}
    </div>
  )
}

function ActionRow({ label, text }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch { /* ignore */ }
  }
  return (
    <button
      onClick={copy}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gtc-ink border border-black/[0.05] bg-white transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <DocPenIcon size={16} className="text-gtc-blue shrink-0" />
      {done ? '已复制 ✓' : label}
    </button>
  )
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  }
  return (
    <button onClick={copy} className="text-xs text-gtc-blue hover:underline shrink-0">
      {done ? '已复制 ✓' : '复制'}
    </button>
  )
}
