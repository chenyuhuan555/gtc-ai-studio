import React, { useEffect, useState } from 'react'
import { api, PLATFORMS, platformLabel, platformColor } from '../api.js'
import { BRAND } from '../engine.js'
import { SparkIcon, BookIcon, ShieldIcon, DocPenIcon } from '../icons.jsx'

// Notion 式知识库目录
const SECTIONS = [
  { key: 'dna', label: '品牌定位', icon: SparkIcon },
  { key: 'dna2', label: '视觉 DNA', icon: SparkIcon },
  { key: 'templates', label: '内容规范', icon: DocPenIcon },
  { key: 'forbidden', label: '禁止元素', icon: ShieldIcon },
  { key: 'logo', label: 'Logo 规范', icon: BookIcon },
  { key: 'cases', label: '历史案例', icon: BookIcon },
]

export default function BrandKnowledge() {
  const [tab, setTab] = useState('dna')
  const [brand, setBrand] = useState(null)
  const [cases, setCases] = useState([])
  const [notice, setNotice] = useState('')

  const reloadBrand = () => api.getBrand().then(setBrand).catch(() => {})
  const loadCases = () => api.getCases().then(setCases).catch(() => setCases([]))

  useEffect(() => {
    reloadBrand()
    loadCases()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-gtc-ink">品牌知识库</h1>
        <p className="text-sm text-gtc-sub mt-1">统一管理品牌定位、视觉 DNA、内容规范与历史案例，并支持手动编辑</p>
      </div>

      {notice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button className="text-amber-500 shrink-0 text-xs" onClick={() => setNotice('')}>关闭</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)] gap-5 items-start">
        {/* 左侧目录（Notion 风格） */}
        <div className="card lg:sticky lg:top-4 !p-3">
          <div className="px-2 pb-2 text-[11px] font-medium text-gtc-sub/70 uppercase tracking-wide">目录</div>
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setTab(s.key)}
                className={
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition ' +
                  (tab === s.key
                    ? 'bg-gtc-blue/10 text-gtc-blue font-medium'
                    : 'text-gtc-sub hover:bg-black/[0.03] hover:text-gtc-ink')
                }
              >
                <s.icon size={15} className="shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="min-w-0">
          {tab === 'dna' && brand && (
            <BrandInfoEditor info={brand.info} onChanged={reloadBrand} onError={(m) => setNotice(m)} />
          )}

          {tab === 'dna2' && brand && (
            <RuleListEditor
              title="视觉 DNA" desc="品牌色彩、风格关键词与视觉基因" category="visual_dna"
              rules={brand.visual_dna} onChanged={reloadBrand} onError={(m) => setNotice(m)}
            />
          )}

          {tab === 'templates' && brand && (
            <RuleListEditor
              title="内容规范" desc="内容结构与排版规范" category="template"
              rules={brand.templates} onChanged={reloadBrand} onError={(m) => setNotice(m)}
            />
          )}

          {tab === 'forbidden' && brand && (
            <RuleListEditor
              title="禁止元素" desc="AI 生成与视觉输出的红线约束" category="forbidden"
              rules={brand.forbidden} onChanged={reloadBrand} onError={(m) => setNotice(m)}
            />
          )}

          {tab === 'logo' && (
            <div className="space-y-5">
              <SectionCard title="Logo 规范" desc="官方标识的统一使用规则">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="shrink-0 rounded-2xl border border-black/[0.05] bg-white p-4">
                    <img src={BRAND.logo_url} alt="GTC 官方 Logo" className="h-28 w-auto object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gtc-ink">官方 Logo 使用规范</div>
                    <div className="text-sm text-gtc-sub mt-1 leading-relaxed">
                      生成图片如涉及 GTC，必须使用此官方 logo 作为品牌标记，不得重新设计、改色、变形或重绘字体。
                    </div>
                    <a href={BRAND.logo_url} download="gtc-logo.png"
                      className="btn-ghost mt-3 text-sm">⬇ 下载官方 Logo</a>
                  </div>
                </div>
              </SectionCard>

              {brand && (
                <RuleListEditor
                  title="使用规则" desc="在 AI 生成流程中原样使用官方 Logo" category="logo"
                  rules={brand.logo} onChanged={reloadBrand} onError={(m) => setNotice(m)}
                />
              )}
            </div>
          )}

          {tab === 'cases' && (
            <CasesPanel cases={cases} reload={loadCases} onError={(m) => setNotice(m)} />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, desc, children }) {
  return (
    <div className="card">
      <div className="mb-4">
        <div className="text-[17px] font-semibold text-gtc-ink">{title}</div>
        {desc && <div className="text-xs text-gtc-sub mt-1">{desc}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// ---- 开关组件 ----
function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={'relative inline-flex h-5 w-9 items-center rounded-full transition ' + (checked ? 'bg-gtc-blue' : 'bg-black/15')}
      aria-pressed={checked}
    >
      <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition ' + (checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

// ---- 品牌定位编辑 ----
function BrandInfoEditor({ info, onChanged, onError }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(info)
  const [err, setErr] = useState('')

  useEffect(() => setForm(info), [info])

  const save = async () => {
    setErr('')
    try {
      await api.updateBrandInfo(form)
      setEditing(false)
      await onChanged()
    } catch {
      setErr('保存失败')
      onError('保存失败：当前为静态预览模式，品牌编辑需部署后端后生效。')
    }
  }

  if (!editing) {
    return (
      <SectionCard title="品牌定位" desc="GTC 的基础身份与定位描述">
        <Row k="中文名称" v={info.name_cn} />
        <Row k="英文名称" v={info.name_en} />
        <div>
          <div className="label">品牌定位</div>
          <div className="text-sm text-gtc-sub leading-relaxed">{info.description}</div>
        </div>
        <button className="btn-ghost text-sm" onClick={() => setEditing(true)}>✏ 编辑</button>
        {err && <div className="text-xs text-rose-500">{err}</div>}
      </SectionCard>
    )
  }

  return (
    <SectionCard title="品牌定位" desc="编辑并保存品牌基础身份">
      <div>
        <label className="label">中文名称</label>
        <input className="input" value={form.name_cn} onChange={(e) => setForm({ ...form, name_cn: e.target.value })} />
      </div>
      <div>
        <label className="label">英文名称</label>
        <input className="input" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
      </div>
      <div>
        <label className="label">品牌定位</label>
        <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={save}>保存</button>
        <button className="btn-ghost" onClick={() => { setEditing(false); setErr('') }}>取消</button>
      </div>
      {err && <div className="text-xs text-rose-500">{err}</div>}
    </SectionCard>
  )
}

// ---- 可编辑规则列表（视觉 DNA / 内容规范 / 禁止元素 / Logo 规则）----
function RuleListEditor({ title, desc, category, rules, onChanged, onError }) {
  const [editingId, setEditingId] = useState(null) // null | number | 'new'
  const [draft, setDraft] = useState({ rule: '', example: '' })
  const [err, setErr] = useState('')

  const startEdit = (r) => { setEditingId(r.id); setDraft({ rule: r.rule, example: r.example || '' }); setErr('') }
  const startNew = () => { setEditingId('new'); setDraft({ rule: '', example: '' }); setErr('') }
  const cancel = () => { setEditingId(null); setErr('') }

  const save = async () => {
    if (!draft.rule.trim()) { setErr('规则内容不能为空'); return }
    setErr('')
    try {
      if (editingId === 'new') await api.createBrandRule(category, draft.rule.trim(), draft.example.trim())
      else await api.updateBrandRule(editingId, { rule: draft.rule.trim(), example: draft.example.trim() })
      setEditingId(null)
      await onChanged()
    } catch {
      onError(`保存失败：当前为静态预览模式，${title}编辑需部署后端后生效。`)
    }
  }

  const remove = async (id) => {
    setErr('')
    try { await api.deleteBrandRule(id); await onChanged() }
    catch { onError(`删除失败：当前为静态预览模式，${title}编辑需部署后端后生效。`) }
  }

  return (
    <SectionCard title={title} desc={desc}>
      {(rules || []).length === 0 && editingId !== 'new' && (
        <div className="text-sm text-gtc-sub rounded-2xl bg-gtc-bg border border-black/[0.04] p-4">
          暂无条目，点击下方「+ 新增」添加。
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(rules || []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-black/[0.05] bg-gtc-bg p-4">
            {editingId === r.id ? (
              <div className="space-y-2">
                <textarea className="input" rows={2} value={draft.rule} onChange={(e) => setDraft({ ...draft, rule: e.target.value })} placeholder="规则内容" />
                <input className="input" value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} placeholder="示例（可选）" />
                <div className="flex gap-2">
                  <button className="btn-primary text-xs" onClick={save}>保存</button>
                  <button className="btn-ghost text-xs" onClick={cancel}>取消</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm text-gtc-ink">{r.rule}</div>
                {r.example && <div className="text-xs text-gtc-sub mt-1">示例：{r.example}</div>}
                <div className="flex gap-3 mt-2">
                  <button className="text-xs text-gtc-blue" onClick={() => startEdit(r)}>编辑</button>
                  <button className="text-xs text-rose-500" onClick={() => remove(r.id)}>删除</button>
                </div>
              </>
            )}
          </div>
        ))}

        {editingId === 'new' && (
          <div className="rounded-2xl border border-gtc-blue/30 bg-gtc-blue/[0.03] p-4 space-y-2 md:col-span-2">
            <textarea className="input" rows={2} value={draft.rule} onChange={(e) => setDraft({ ...draft, rule: e.target.value })} placeholder="规则内容" />
            <input className="input" value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} placeholder="示例（可选）" />
            <div className="flex gap-2">
              <button className="btn-primary text-xs" onClick={save}>添加</button>
              <button className="btn-ghost text-xs" onClick={cancel}>取消</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button className="btn-ghost text-sm" onClick={startNew} disabled={editingId === 'new'}>+ 新增</button>
      </div>
      {err && <div className="text-xs text-rose-500">{err}</div>}
    </SectionCard>
  )
}

// ---- 历史案例面板（含「用作参考」开关）----
function CasesPanel({ cases, reload, onError }) {
  const [form, setForm] = useState({ platform: 'wechat', title: '', visual_analysis: '', scenario: '', content: '' })
  const [adding, setAdding] = useState(false)

  const submit = async () => {
    if (!form.title) return
    await api.createCase(form)
    setForm({ platform: 'wechat', title: '', visual_analysis: '', scenario: '', content: '' })
    setAdding(false)
    reload()
  }
  const remove = async (id) => {
    await api.deleteCase(id)
    reload()
  }
  const toggleRef = async (c) => {
    const next = !c.is_reference
    try {
      await api.updateCase(c.id, { is_reference: next })
    } catch {
      onError?.('更新失败：当前为静态预览模式，开关状态仅保存在本机浏览器。')
    }
    reload() // 同步最新状态（后端或本地存储）
  }

  return (
    <SectionCard title="历史案例" desc="沉淀优秀内容，作为 AI 生成的参考样本；关闭「用作参考」后该案例不再注入 Prompt">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gtc-sub">共 {cases.length} 个案例</div>
        <button className="btn-ghost" onClick={() => setAdding((v) => !v)}>{adding ? '收起' : '+ 新增案例'}</button>
      </div>

      {adding && (
        <div className="rounded-2xl border border-black/[0.05] bg-gtc-bg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">平台</label>
              <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">标题</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">视觉分析</label>
            <input className="input" value={form.visual_analysis} onChange={(e) => setForm({ ...form, visual_analysis: e.target.value })} />
          </div>
          <div>
            <label className="label">适用场景</label>
            <input className="input" value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} />
          </div>
          <div>
            <label className="label">正文 / 要点</label>
            <textarea className="input" rows={2} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_reference !== false} onChange={() => setForm({ ...form, is_reference: !(form.is_reference !== false) })} />
            <span className="text-xs text-gtc-sub">用作参考（默认开启）</span>
          </div>
          <button className="btn-primary" onClick={submit}>保存案例</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cases.map((c) => (
          <div key={c.id} className="rounded-2xl border border-black/[0.05] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-gtc-ink text-sm">{c.title}</div>
              <button className="text-xs text-rose-500 shrink-0" onClick={() => remove(c.id)}>删除</button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={'chip ' + platformColor(c.platform)}>{platformLabel(c.platform)}</span>
              <label className="flex items-center gap-2 text-xs text-gtc-sub cursor-pointer select-none">
                <Switch checked={c.is_reference !== false} onChange={() => toggleRef(c)} />
                用作参考
              </label>
            </div>
            {c.visual_analysis && <div className="text-xs text-gtc-sub mt-2">视觉：{c.visual_analysis}</div>}
            {c.scenario && <div className="text-xs text-gtc-sub">场景：{c.scenario}</div>}
            {c.is_reference === false && (
              <div className="text-[11px] text-amber-600 mt-1">已关闭参考，该案例不会注入 AI Prompt</div>
            )}
          </div>
        ))}
        {cases.length === 0 && (
          <div className="rounded-2xl border border-black/[0.05] bg-gtc-bg p-4 text-sm text-gtc-sub">
            暂无案例，点击「新增案例」上传历史优秀内容。
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 text-sm text-gtc-sub">{k}</div>
      <div className="text-sm text-gtc-ink font-medium">{v}</div>
    </div>
  )
}
