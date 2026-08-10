import React, { useEffect, useRef, useState } from 'react'
import { api, PLATFORMS, CONTENT_TYPES } from '../api.js'
import { SparkIcon, ChatIcon } from '../icons.jsx'

const SUGGESTIONS = [
  '科技感太强了，想要更温暖、更真实的氛围',
  '人物不够真实，避免 AI 假人脸',
  '文字太多，希望更简洁、留白更多',
  '品牌 logo 不够突出，请加强品牌露出',
  '想要插画风格，而不是照片风格',
]

// ---- 会话历史（localStorage 持久化，ChatGPT 式） ----
const SESSIONS_KEY = 'gtc_chat_sessions'
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] }
}
function persistSessions(list) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 30))) } catch { /* ignore */ }
}

export default function ChatAssistant({ prefill }) {
  const [sessions, setSessions] = useState(loadSessions)
  const [currentId, setCurrentId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [seed, setSeed] = useState('')          // 当前提示词（优化基线）
  const [optimized, setOptimized] = useState('') // 最新优化提示词
  const [platform, setPlatform] = useState('wechat')
  const [ctype, setCtype] = useState('活动预告')
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef(null)

  // 从「用 AI 助手优化」按钮带入当前提示词：新建一个会话
  useEffect(() => {
    if (prefill) {
      newChat()
      setSeed(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, optimized, loading])

  // 当前会话变更时同步回历史列表
  useEffect(() => {
    if (!currentId) return
    setSessions((list) => {
      const idx = list.findIndex((s) => s.id === currentId)
      if (idx === -1) return list
      const title = list[idx].title || (messages.find((m) => m.role === 'user')?.content || '新对话').slice(0, 16)
      const next = [...list]
      next[idx] = { ...next[idx], title, messages, seed, optimized, platform, ctype, updatedAt: Date.now() }
      persistSessions(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, seed, optimized, platform, ctype, currentId])

  const newChat = () => {
    const id = 's' + Date.now()
    setSessions((list) => {
      const next = [{ id, title: '', messages: [], seed: '', optimized: '', platform, ctype, updatedAt: Date.now() }, ...list]
      persistSessions(next)
      return next
    })
    setCurrentId(id)
    setMessages([])
    setSeed('')
    setOptimized('')
    setInput('')
  }

  const openSession = (s) => {
    setCurrentId(s.id)
    setMessages(s.messages || [])
    setSeed(s.seed || '')
    setOptimized(s.optimized || '')
    setPlatform(s.platform || 'wechat')
    setCtype(s.ctype || '活动预告')
    setInput('')
  }

  const removeSession = (id) => {
    setSessions((list) => {
      const next = list.filter((s) => s.id !== id)
      persistSessions(next)
      return next
    })
    if (currentId === id) {
      setCurrentId(null)
      setMessages([])
      setSeed('')
      setOptimized('')
    }
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    if (!currentId) {
      const id = 's' + Date.now()
      setSessions((list) => {
        const next = [{ id, title: content.slice(0, 16), messages: [], seed, optimized: '', platform, ctype, updatedAt: Date.now() }, ...list]
        persistSessions(next)
        return next
      })
      setCurrentId(id)
    }
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const r = await api.chatOptimize({
        messages: next,
        current_prompt: seed,
        platform,
        content_type: ctype,
      })
      setMessages([...next, { role: 'assistant', content: r.reply }])
      setOptimized(r.optimized_prompt || '')
    } catch {
      setMessages([...next, { role: 'assistant', content: '调用失败，请稍后重试。' }])
    } finally {
      setLoading(false)
    }
  }

  const copyOptimized = async () => {
    try {
      await navigator.clipboard.writeText(optimized)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const fmtTime = (ts) => {
    const d = new Date(ts)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-gtc-ink">AI 助手</h1>
        <p className="text-sm text-gtc-sub mt-1">多轮对话打磨提示词，历史会话自动保存</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_300px] gap-5 items-start">
        {/* 左：历史会话（ChatGPT 式） */}
        <div className="card lg:sticky lg:top-4 !p-3">
          <button onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gtc-blue bg-gtc-blue/10 transition hover:bg-gtc-blue/15 mb-2">
            <ChatIcon size={15} /> 新对话
          </button>
          <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
            {sessions.length === 0 && (
              <div className="text-xs text-gtc-sub px-3 py-2">暂无历史会话</div>
            )}
            {sessions.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => openSession(s)}
                  className={
                    'w-full text-left px-3 py-2 rounded-xl transition ' +
                    (currentId === s.id ? 'bg-gtc-blue/10' : 'hover:bg-black/[0.03]')
                  }
                >
                  <div className={'text-[13px] truncate ' + (currentId === s.id ? 'text-gtc-blue font-medium' : 'text-gtc-ink')}>
                    {s.title || '新对话'}
                  </div>
                  <div className="text-[10px] text-gtc-sub/60 mt-0.5">{fmtTime(s.updatedAt)}</div>
                </button>
                <button
                  onClick={() => removeSession(s.id)}
                  className="absolute right-2 top-2 text-[11px] text-gtc-sub/40 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 中：对话区 */}
        <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
          <div className="flex items-center justify-between border-b border-black/[0.05] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-[17px] font-semibold text-gtc-ink flex items-center gap-1.5">
                <SparkIcon size={18} className="text-gtc-blue shrink-0" /> GTC 提示词优化助手
              </div>
              {api.isClientConfigured()
                ? (
                  <span className="chip bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                    DeepSeek 已连接
                  </span>
                )
                : (
                  <span className="chip bg-amber-50 text-amber-600 border border-amber-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 inline-block" />
                    未连接
                  </span>
                )}
            </div>
            <div className="flex gap-2">
              <select className="input !py-1 !text-xs w-28" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <select className="input !py-1 !text-xs w-28" value={ctype} onChange={(e) => setCtype(e.target.value)}>
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {!api.isClientConfigured() && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-2">
                未配置 DeepSeek Key，AI 助手暂不可用。请前往左侧 <strong>⚙ 设置</strong> 填入你的 DeepSeek API Key（仅存本机浏览器）后即可多轮优化提示词。
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-sm text-gtc-sub">
                把「生成结果哪里不满意」告诉我，助手会结合 GTC 品牌规范，多轮帮你打磨出一版更稳定的提示词。
                {seed && <div className="mt-2 rounded-xl bg-gtc-light/10 text-gtc-blue px-3 py-2">已带入当前提示词作为优化基线，描述你的问题即可。</div>}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap font-sans ' +
                  (m.role === 'user' ? 'bg-gtc-blue text-white' : 'bg-gtc-bg border border-black/[0.04] text-gtc-ink')
                }>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gtc-bg border border-black/[0.04] px-4 py-2 text-sm text-gtc-sub">助手思考中…</div>
              </div>
            )}
          </div>

          {/* 快捷建议 */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="chip bg-white text-gtc-sub border border-black/[0.08] hover:border-gtc-blue hover:text-gtc-blue transition">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 输入区 */}
          <div className="flex gap-2 mt-3">
            <textarea
              className="input flex-1 !py-2"
              rows={2}
              placeholder={seed ? '描述你对当前结果的哪里不满意…' : '例如：科技感太强，想要更温暖真实的氛围…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button className="btn-primary px-5 self-stretch" onClick={() => send()} disabled={loading}>
              发送
            </button>
          </div>
        </div>

        {/* 右：优化结果区 */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="card">
            <div className="font-semibold text-gtc-ink mb-2">最新优化提示词</div>
            {!optimized && <div className="text-sm text-gtc-sub">对话后，助手给出的优化提示词会显示在这里，可直接复制到网页 ChatGPT / Midjourney。</div>}
            {optimized && (
              <>
                <div className="flex justify-end mb-2">
                  <button onClick={copyOptimized} className="text-xs text-gtc-blue hover:underline">{copied ? '已复制 ✓' : '复制'}</button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gtc-sub font-sans max-h-[50vh] overflow-y-auto">{optimized}</pre>
              </>
            )}
          </div>
          {seed && (
            <div className="card">
              <div className="font-semibold text-gtc-ink mb-2">当前提示词（优化基线）</div>
              <pre className="whitespace-pre-wrap text-xs text-gtc-sub font-sans max-h-[30vh] overflow-y-auto">{seed}</pre>
              <button onClick={() => setSeed('')} className="text-xs text-gtc-sub hover:underline mt-2">清除基线</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
