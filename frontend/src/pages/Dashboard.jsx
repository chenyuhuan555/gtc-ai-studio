import React, { useEffect, useState } from 'react'
import { api, PLATFORMS, loadRecentGenerations, platformLabel } from '../api.js'
import { GridIcon, BookIcon, SparkIcon, ShieldIcon, DocPenIcon, PlusIcon, TrashIcon } from '../icons.jsx'

// 平台 Apple App Icon 风格（圆角矩形 + 状态）
const PLATFORM_META = {
  wechat: { name: '微信公众号', bg: 'bg-[#07C160]', text: '微', status: '运营中' },
  xiaohongshu: { name: '小红书', bg: 'bg-[#FF2442]', text: '红', status: '运营中' },
  video: { name: '视频号', bg: 'bg-[#FA9D3B]', text: '视', status: '运营中' },
  linkedin: { name: 'LinkedIn', bg: 'bg-[#0A66C2]', text: 'in', status: '运营中' },
}

// 内容日历事件（localStorage 持久化，day: 1=周一 ... 7=周日）
const CAL_KEY = 'gtc_calendar_events'
const DEFAULT_CAL = [
  { id: 101, day: 1, title: '推文发布', time: '10:00', platform: 'wechat' },
  { id: 102, day: 2, title: '小红书笔记', time: '14:30', platform: 'xiaohongshu' },
  { id: 103, day: 3, title: '视频号发布', time: '11:00', platform: 'video' },
  { id: 104, day: 4, title: '行业动态推文', time: '09:30', platform: 'wechat' },
  { id: 105, day: 5, title: 'LinkedIn 帖子', time: '16:00', platform: 'linkedin' },
]
function loadCal() {
  try {
    const raw = localStorage.getItem(CAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT_CAL
}
const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function weekDays() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function eventDateKey(event) {
  if (event.date) return event.date
  const days = weekDays()
  return dateKey(days[Math.max(0, (event.day || 1) - 1)])
}

function monthCells(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1)
    return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() }
  })
}

// 日历事件行内编辑器（新增/编辑共用）
function CalEventEditor({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [time, setTime] = useState(initial?.time || '')
  const [platform, setPlatform] = useState(initial?.platform || 'wechat')
  const save = () => {
    const t = title.trim()
    if (!t) return
    onSave({ title: t, time: time.trim() || '—', platform })
  }
  return (
    <div className="rounded-2xl border border-gtc-blue/30 bg-gtc-bg p-2.5 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel() }}
        placeholder="发布内容"
        className="input !py-1.5 !text-sm w-full"
      />
      <div className="flex items-center gap-1.5">
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel() }}
          placeholder="时间"
          className="input !w-20 !py-1.5 !text-xs"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="input !flex-1 !py-1.5 !text-xs"
        >
          {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={save} className="px-3 py-1.5 rounded-lg bg-gtc-blue text-white text-xs font-medium hover:opacity-90 transition">保存</button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-gtc-sub hover:bg-black/[0.05] text-xs transition">取消</button>
      </div>
    </div>
  )
}

// 内容表现（手动编辑，localStorage 持久化；本周各平台阅读量）
const PERF_KEY = 'gtc_performance_data'
const SHOW_PERFORMANCE = false
const DEFAULT_PERF = [
  { platform: 'wechat', reads: 3240, growth: '+12%' },
  { platform: 'xiaohongshu', reads: 5180, growth: '+24%' },
  { platform: 'video', reads: 2960, growth: '+8%' },
  { platform: 'linkedin', reads: 1140, growth: '+5%' },
]
function loadPerf() {
  try {
    const raw = localStorage.getItem(PERF_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_PERF
}

// 今日任务（localStorage 持久化勾选状态）
const TASKS_KEY = 'gtc_today_tasks'
const DEFAULT_TASKS = [
  { id: 1, title: '审核公众号推文封面', tag: '设计', done: false },
  { id: 2, title: '发布小红书活动笔记', tag: '发布', done: false },
  { id: 3, title: '回复 LinkedIn 候选人留言', tag: '互动', done: false },
  { id: 4, title: '整理本周内容数据周报', tag: '复盘', done: false },
]
function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT_TASKS
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState(loadTasks)
  const [recent, setRecent] = useState([])
  const [selectedRecent, setSelectedRecent] = useState(null)
  const [events, setEvents] = useState(loadCal)
  const [editingEvt, setEditingEvt] = useState(null) // {id} 正在编辑的事件
  const [addingDay, setAddingDay] = useState(null)   // 正在新增事件的 weekday(1-7)
  const [showAll, setShowAll] = useState(false)       // 查看全部弹层
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [addingDate, setAddingDate] = useState(null)
  const [perf, setPerf] = useState(loadPerf)          // 内容表现（手动编辑）
  const [editingPerf, setEditingPerf] = useState(null) // 正在编辑表现的平台 key

  useEffect(() => {
    Promise.all([api.getBrand(), api.getPlatforms(), api.getCases()])
      .then(([brand, platforms, cases]) => {
        setStats({
          visualDna: brand.visual_dna.length,
          forbidden: brand.forbidden.length,
          platforms: platforms.length,
          cases: cases.length,
        })
      })
      .catch(() => setStats({ error: true }))
    setRecent(loadRecentGenerations())
  }, [])

  useEffect(() => {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch { /* ignore */ }
  }, [tasks])

  useEffect(() => {
    try { localStorage.setItem(CAL_KEY, JSON.stringify(events)) } catch { /* ignore */ }
  }, [events])

  useEffect(() => {
    try { localStorage.setItem(PERF_KEY, JSON.stringify(perf)) } catch { /* ignore */ }
  }, [perf])

  const addEvent = (day, data) => {
    const date = weekDays()[Math.max(0, day - 1)]
    setEvents((evs) => [...evs, { id: Date.now(), day, date: dateKey(date), ...data }])
    setAddingDay(null)
  }
  const addEventOnDate = (date, data) => {
    const parsed = new Date(`${date}T12:00:00`)
    setEvents((evs) => [...evs, { id: Date.now(), day: parsed.getDay() || 7, date, ...data }])
    setAddingDate(null)
  }
  const updateEvent = (id, data) => {
    setEvents((evs) => evs.map((e) => (e.id === id ? { ...e, ...data } : e)))
    setEditingEvt(null)
  }
  const deleteEvent = (id) => {
    setEvents((evs) => evs.filter((e) => e.id !== id))
    setEditingEvt(null)
  }

  const closeModal = () => {
    setShowAll(false)
    setEditingEvt(null)
    setAddingDay(null)
    setAddingDate(null)
  }

  const toggleTask = (id) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTag, setNewTag] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('')

  const addTask = () => {
    const title = newTitle.trim()
    if (!title) return
    setTasks((ts) => [...ts, { id: Date.now(), title, tag: newTag.trim() || '任务', done: false }])
    setNewTitle('')
    setNewTag('')
    setAdding(false)
  }

  const deleteTask = (id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id))
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditTag(t.tag)
  }

  const saveEdit = () => {
    const title = editTitle.trim()
    if (!title) return
    setTasks((ts) => ts.map((t) => (t.id === editingId ? { ...t, title, tag: editTag.trim() || t.tag } : t)))
    setEditingId(null)
  }

  const days = weekDays()
  const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const range = `${fmt(days[0])} – ${fmt(days[6])}`
  const maxReads = Math.max(...perf.map((p) => p.reads), 1)

  const cards = [
    { label: '接入平台', value: stats?.platforms ?? '—', sub: '公众号 / 小红书 / 视频号 / LinkedIn', icon: GridIcon, to: 'studio' },
    { label: '历史案例', value: stats?.cases ?? '—', sub: '已沉淀优秀内容模板', icon: BookIcon, to: 'brand' },
    { label: '视觉 DNA', value: stats?.visualDna ?? '—', sub: '品牌色彩与风格关键词', icon: SparkIcon, to: 'brand' },
    { label: '禁止元素', value: stats?.forbidden ?? '—', sub: 'AI 生成红线约束', icon: ShieldIcon, to: 'brand' },
  ]

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-gtc-ink">运营中心概览</h1>
        <p className="text-sm text-gtc-sub mt-1.5">AI 驱动的新媒体内容运营工作台</p>
      </div>

      {/* 指标卡（带辅助信息） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onNavigate?.(c.to)}
            className="card card-lift text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gtc-blue/10 text-gtc-blue flex items-center justify-center shrink-0">
                <c.icon size={24} />
              </div>
              <div>
                <div className="text-[34px] leading-none font-semibold text-gtc-ink">{c.value}</div>
                <div className="text-sm font-medium text-gtc-ink mt-1.5">{c.label}</div>
              </div>
            </div>
            <div className="text-xs text-gtc-sub mt-3 pt-3 border-t border-black/[0.04]">{c.sub}</div>
          </button>
        ))}
      </div>

      {/* 今日任务 */}
      <div className="grid grid-cols-1 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-semibold text-gtc-ink">今日任务</div>
            <span className="text-xs text-gtc-sub">{tasks.filter((t) => t.done).length}/{tasks.length} 已完成</span>
          </div>
          <div className="space-y-1">
            {tasks.map((t) => {
              const editing = editingId === t.id
              if (editing) {
                return (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-gtc-bg border border-gtc-blue/30">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      placeholder="任务内容"
                      className="input flex-1 !py-1.5 !text-sm"
                    />
                    <input
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      placeholder="标签"
                      className="input !w-20 !py-1.5 !text-xs"
                    />
                    <button onClick={saveEdit} className="px-2.5 py-1.5 rounded-lg bg-gtc-blue text-white text-xs font-medium hover:opacity-90 transition">保存</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1.5 rounded-lg text-gtc-sub hover:bg-black/[0.05] text-xs transition">取消</button>
                  </div>
                )
              }
              return (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-black/[0.03]"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={
                      'w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 transition ' +
                      (t.done ? 'bg-gtc-blue border-gtc-blue text-white' : 'border-black/20')
                    }
                  >
                    {t.done && <span className="text-[10px] leading-none">✓</span>}
                  </button>
                  <span className={'flex-1 text-sm ' + (t.done ? 'text-gtc-sub line-through' : 'text-gtc-ink')}>{t.title}</span>
                  <span className="chip bg-gtc-bg text-gtc-sub border border-black/[0.04]">{t.tag}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 rounded-lg text-gtc-sub hover:text-gtc-blue hover:bg-black/[0.05] transition"
                      title="编辑"
                    >
                      <DocPenIcon size={15} />
                    </button>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="p-1.5 rounded-lg text-gtc-sub hover:text-rose-500 hover:bg-black/[0.05] transition"
                      title="删除"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {adding ? (
            <div className="flex items-center gap-2 mt-2 px-2 py-2 rounded-xl bg-gtc-bg border border-gtc-blue/30">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="新任务内容"
                className="input flex-1 !py-1.5 !text-sm"
              />
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="标签"
                className="input !w-20 !py-1.5 !text-xs"
              />
              <button onClick={addTask} className="px-2.5 py-1.5 rounded-lg bg-gtc-blue text-white text-xs font-medium hover:opacity-90 transition">添加</button>
              <button onClick={() => setAdding(false)} className="px-2 py-1.5 rounded-lg text-gtc-sub hover:bg-black/[0.05] text-xs transition">取消</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gtc-sub hover:text-gtc-blue hover:bg-black/[0.03] transition"
            >
              <PlusIcon size={16} /> 添加任务
            </button>
          )}
        </div>

        {SHOW_PERFORMANCE && <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-semibold text-gtc-ink">内容表现（本周）</div>
            <span className="text-xs text-gtc-sub">阅读量 · 可手动编辑</span>
          </div>
          <div className="space-y-4">
            {perf.map((p) => {
              const meta = PLATFORM_META[p.platform]
              const editing = editingPerf === p.platform
              const pct = Math.round((p.reads / maxReads) * 100)
              if (editing) {
                const item = perf.find((x) => x.platform === p.platform)
                const ir = item?.reads ?? 0
                const ig = item?.growth ?? ''
                return (
                  <div key={p.platform} className="rounded-2xl bg-gtc-bg border border-gtc-blue/30 p-3 space-y-2">
                    <div className="text-sm font-medium text-gtc-ink">{meta.name}</div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gtc-sub w-12 shrink-0">阅读量</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={ir}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0)
                          setPerf((ps) => ps.map((x) => (x.platform === p.platform ? { ...x, reads: v } : x)))
                        }}
                        className="input !w-24 !py-1.5 !text-sm"
                      />
                      <label className="text-xs text-gtc-sub w-10 shrink-0">增幅</label>
                      <input
                        defaultValue={ig}
                        onChange={(e) => {
                          const v = e.target.value
                          setPerf((ps) => ps.map((x) => (x.platform === p.platform ? { ...x, growth: v } : x)))
                        }}
                        placeholder="+12%"
                        className="input !flex-1 !py-1.5 !text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingPerf(null)} className="px-3 py-1.5 rounded-lg bg-gtc-blue text-white text-xs font-medium hover:opacity-90 transition">完成</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={p.platform} className="group">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-gtc-ink">
                      {meta.name}
                      <button
                        onClick={() => setEditingPerf(p.platform)}
                        className="p-1 rounded-md text-gtc-sub/60 hover:text-gtc-blue hover:bg-black/[0.05] transition opacity-0 group-hover:opacity-100"
                        title="编辑数据"
                      >
                        <DocPenIcon size={13} />
                      </button>
                    </span>
                    <span className="text-gtc-sub text-xs">
                      {p.reads.toLocaleString()}
                      <span className="text-emerald-600 ml-2">{p.growth}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.bg} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>}
      </div>

      {/* 平台覆盖（App Icon 风格 + 状态） */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[17px] font-semibold text-gtc-ink">平台覆盖</div>
          <span className="text-xs text-gtc-sub">已接入 {PLATFORMS.length} 个主流内容平台</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {PLATFORMS.map((p) => {
            const meta = PLATFORM_META[p.key] || { name: p.label, bg: 'bg-gtc-blue', text: p.label[0], status: '运营中' }
            return (
              <div key={p.key} className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-soft">
                <div className={`w-11 h-11 rounded-[13px] ${meta.bg} text-white flex items-center justify-center text-base font-semibold shadow-soft shrink-0`}>
                  {meta.text}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gtc-ink truncate">{meta.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {meta.status}
                  </div>
                </div>
      </div>
            )
          })}
        </div>
      </div>

      {/* 内容日历（本周） */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-baseline gap-3">
            <div className="text-[17px] font-semibold text-gtc-ink">内容日历（本周）</div>
            <div className="text-xs text-gtc-sub">{range}</div>
          </div>
          <button onClick={() => setShowAll(true)} className="text-xs text-gtc-sub hover:text-gtc-blue transition">查看全部 ›</button>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map((d, i) => {
            const dayIdx = i + 1
            const ev = events.find((e) => e.day === dayIdx)
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} className="min-w-0">
                <div className="text-center mb-2">
                  <div className={'text-xs ' + (isToday ? 'text-gtc-blue font-semibold' : 'text-gtc-sub')}>{WEEK_LABELS[i]}</div>
                  <div className={'text-[11px] mt-0.5 ' + (isToday ? 'text-gtc-blue' : 'text-gtc-sub/60')}>{fmt(d)}</div>
                </div>
                {addingDay === dayIdx ? (
                  <CalEventEditor
                    onSave={(data) => addEvent(dayIdx, data)}
                    onCancel={() => setAddingDay(null)}
                  />
                ) : ev ? (
                  editingEvt?.id === ev.id ? (
                    <CalEventEditor
                      initial={ev}
                      onSave={(data) => updateEvent(ev.id, data)}
                      onCancel={() => setEditingEvt(null)}
                    />
                  ) : (
                    <div className="group rounded-2xl bg-gtc-bg border border-black/[0.04] p-3 hover:shadow-soft transition">
                      <div className="text-xs font-medium text-gtc-ink truncate">{ev.title}</div>
                      <div className="text-[11px] text-gtc-sub mt-1">{ev.time}</div>
                      <div className={`mt-2 w-5 h-5 rounded-full ${PLATFORM_META[ev.platform]?.bg || 'bg-gtc-blue'} text-white flex items-center justify-center text-[10px]`}>
                        {PLATFORM_META[ev.platform]?.text}
                      </div>
                      <div className="hidden group-hover:flex items-center gap-0.5 mt-2">
                        <button onClick={() => setEditingEvt({ id: ev.id })} className="p-1 rounded-md text-gtc-sub hover:text-gtc-blue hover:bg-black/[0.06] transition" title="编辑">
                          <DocPenIcon size={13} />
                        </button>
                        <button onClick={() => deleteEvent(ev.id)} className="p-1 rounded-md text-gtc-sub hover:text-rose-500 hover:bg-black/[0.06] transition" title="删除">
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => setAddingDay(dayIdx)}
                    className="w-full rounded-2xl border border-dashed border-black/[0.12] p-3 text-center text-[11px] text-gtc-sub/60 h-[86px] flex flex-col items-center justify-center gap-1 hover:border-gtc-blue/40 hover:text-gtc-blue transition"
                  >
                    <span className="text-base leading-none">+</span>
                    添加内容
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 查看全部：本月日程日历 */}
      {showAll && (
        <div className="fixed inset-0 z-50 min-h-screen flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[28px] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.04]">
              <div>
                <div className="text-[17px] font-semibold text-gtc-ink">本月内容日程</div>
                <div className="text-xs text-gtc-sub mt-0.5">{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月 · 共 {events.filter((e) => eventDateKey(e).startsWith(`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`)).length} 条</div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center text-gtc-sub hover:bg-black/[0.05] transition" title="关闭">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {addingDate && (
                <div className="mb-4 rounded-2xl border border-gtc-blue/30 bg-gtc-bg p-3">
                  <div className="text-xs text-gtc-sub mb-2">{addingDate} 新增排期</div>
                  <CalEventEditor onSave={(data) => addEventOnDate(addingDate, data)} onCancel={() => setAddingDate(null)} />
                </div>
              )}
              {editingEvt && (() => {
                const event = events.find((item) => item.id === editingEvt.id)
                return event ? (
                  <div className="mb-4 rounded-2xl border border-gtc-blue/30 bg-gtc-bg p-3">
                    <div className="text-xs text-gtc-sub mb-2">编辑排期</div>
                    <CalEventEditor initial={event} onSave={(data) => updateEvent(event.id, data)} onCancel={() => setEditingEvt(null)} />
                  </div>
                ) : null
              })()}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-3 py-1.5 rounded-lg text-sm text-gtc-sub hover:bg-gtc-bg">‹ 上月</button>
                <div className="text-sm font-medium text-gtc-ink">{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月</div>
                <button onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-3 py-1.5 rounded-lg text-sm text-gtc-sub hover:bg-gtc-bg">下月 ›</button>
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.06]">
                {WEEK_LABELS.map((label) => <div key={label} className="bg-gtc-bg px-2 py-2 text-center text-xs text-gtc-sub">{label}</div>)}
                {monthCells(calendarMonth).map(({ date, key, inMonth }) => {
                  const dayEvents = events.filter((event) => eventDateKey(event) === key)
                  return (
                    <div key={key} role="button" tabIndex={0} onClick={() => setAddingDate(key)} onKeyDown={(event) => { if (event.key === 'Enter') setAddingDate(key) }} className={`min-h-28 bg-white p-2 text-left align-top hover:bg-gtc-bg transition ${!inMonth ? 'text-black/20' : 'text-gtc-ink'}`}>
                      <div className="text-xs font-medium">{date.getDate()}</div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map((event) => (
                          <div key={event.id} className="group rounded-lg bg-gtc-bg px-2 py-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
                            <div className="truncate">{event.title}</div>
                            <div className="text-gtc-sub">{event.time}</div>
                            <div className="hidden group-hover:flex gap-1 mt-1">
                              <button onClick={() => setEditingEvt({ id: event.id })} className="text-gtc-blue">编辑</button>
                              <button onClick={() => deleteEvent(event.id)} className="text-rose-500">删除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 最近 AI 生成记录 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[17px] font-semibold text-gtc-ink">最近 AI 生成记录</div>
          <button onClick={() => onNavigate('studio')} className="text-xs text-gtc-blue hover:underline">去生成 ›</button>
        </div>
        {recent.length === 0 ? (
          <div className="text-sm text-gtc-sub rounded-2xl bg-gtc-bg border border-black/[0.04] p-4">
            还没有生成记录。前往「内容生产中心」生成第一条内容后，这里会展示最近 10 条。
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {recent.map((r, i) => (
              <button key={i} onClick={() => setSelectedRecent(r)} className="w-full flex items-center gap-3 py-3 text-left first:pt-0 last:pb-0 hover:bg-gtc-bg/60 transition rounded-xl px-2">
                <div className="w-9 h-9 rounded-xl bg-gtc-blue/10 text-gtc-blue flex items-center justify-center shrink-0">
                  <SparkIcon size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gtc-ink truncate">{r.title}</div>
                  <div className="text-[11px] text-gtc-sub mt-0.5">
                    {r.kind} · {platformLabel(r.platform)} · {timeAgo(r.time)}
                  </div>
                </div>
                <span className={'chip shrink-0 ' + (r.used_ai ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-gtc-sub')}>
                  {r.used_ai ? 'DeepSeek' : '规则化'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRecent && (
        <div className="fixed inset-0 z-50 min-h-screen flex items-center justify-center p-4" onClick={() => setSelectedRecent(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[28px] bg-white shadow-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-[18px] font-semibold text-gtc-ink">{selectedRecent.title}</div>
                <div className="text-xs text-gtc-sub mt-1">{selectedRecent.kind} · {platformLabel(selectedRecent.platform)}</div>
              </div>
              <button onClick={() => setSelectedRecent(null)} className="w-8 h-8 rounded-full text-gtc-sub hover:bg-gtc-bg">✕</button>
            </div>
            {selectedRecent.result ? (
              <div className="space-y-4">
                {selectedRecent.result.copy_text && (
                  <div className="rounded-2xl bg-gtc-bg p-4">
                    <div className="text-sm font-medium text-gtc-ink mb-2">主文案</div>
                    <div className="font-medium text-gtc-ink">{selectedRecent.result.copy_text.title}</div>
                    <pre className="whitespace-pre-wrap text-sm text-gtc-sub mt-2 font-sans">{selectedRecent.result.copy_text.body}</pre>
                  </div>
                )}
                {(selectedRecent.result.image_prompt || selectedRecent.result.prompt) && (
                  <div className="rounded-2xl bg-gtc-bg p-4">
                    <div className="text-sm font-medium text-gtc-ink mb-2">图片 Prompt</div>
                    <pre className="whitespace-pre-wrap text-sm text-gtc-sub font-sans">{selectedRecent.result.image_prompt || selectedRecent.result.prompt}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-gtc-bg p-4 text-sm text-gtc-sub">该记录是在详情功能上线前生成的，只有摘要信息，没有保存完整内容。</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
