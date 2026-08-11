import React, { useEffect, useRef, useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import ContentStudio from './pages/ContentStudio.jsx'
import BrandKnowledge from './pages/BrandKnowledge.jsx'
import ChatAssistant from './pages/ChatAssistant.jsx'
import Settings from './pages/Settings.jsx'
import { api, getActiveWorkspaceId, isClientConfigured, setActiveWorkspaceId } from './api.js'
import Login from './pages/Login.jsx'
import { getSession, signOut, supabase, supabaseConfigured } from './supabase.js'
import { bootstrapWorkspace, captureWorkspaceState, clearWorkspaceData, clearWorkspaceSession, saveWorkspace } from './workspaceSync.js'
import { SparkIcon, HomeIcon, DocPenIcon, BookIcon, ChatIcon, GearIcon } from './icons.jsx'

const NAV = [
  { key: 'dashboard', label: '首页', icon: HomeIcon },
  { key: 'studio', label: '内容生产中心', icon: DocPenIcon },
  { key: 'brand', label: '品牌知识库', icon: BookIcon },
  { key: 'chat', label: 'AI 助手', icon: ChatIcon },
  { key: 'settings', label: '设置', icon: GearIcon },
]

const VIEW_TITLE = {
  dashboard: '运营中心概览',
  studio: '内容生产中心',
  brand: '品牌知识库',
  chat: 'AI 助手',
  settings: '设置',
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [chatPrefill, setChatPrefill] = useState('')
  const [hasKey, setHasKey] = useState(() => isClientConfigured())
  const [session, setSession] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspace] = useState(getActiveWorkspaceId())
  const [authLoading, setAuthLoading] = useState(supabaseConfigured)
  const [syncStatus, setSyncStatus] = useState('')
  const syncVersion = useRef(null)
  const [syncReadyVersion, setSyncReadyVersion] = useState(null)
  const lastSyncedState = useRef('')
  const syncError = useRef(false)

  useEffect(() => {
    if (!supabaseConfigured) return undefined
    getSession().then(setSession).catch(() => setSession(null)).finally(() => setAuthLoading(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        clearWorkspaceSession()
        syncVersion.current = null
        setSyncReadyVersion(null)
        lastSyncedState.current = ''
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return undefined
    let active = true
    syncError.current = false
    bootstrapWorkspace(session).then((result) => {
      if (!active) return
      syncVersion.current = result.version || null
      setSyncReadyVersion(result.version || null)
      lastSyncedState.current = JSON.stringify(captureWorkspaceState())
      setSyncStatus(result.mode === 'hydrated' ? '已从云端恢复' : '云端同步已连接')
      if (result.reload && !window.location.search.includes('sync-ready')) {
        window.location.replace(`${window.location.pathname}?sync-ready=1`)
      }
    }).catch((error) => {
      syncError.current = true
      setSyncStatus(error.status === 401 ? '登录已失效' : '云端同步失败，当前保留本地数据')
    })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session) return undefined
    api.getWorkspaces().then((items) => {
      setWorkspaces(items)
      if (!items.some((item) => item.id === activeWorkspaceId) && items[0]) {
        setActiveWorkspaceId(items[0].id)
        setActiveWorkspace(items[0].id)
        clearWorkspaceSession()
        window.location.reload()
      }
    }).catch(() => setWorkspaces([]))
    return undefined
  }, [session, activeWorkspaceId])

  const switchWorkspace = (workspaceId) => {
    if (!workspaceId || workspaceId === activeWorkspaceId) return
    setActiveWorkspaceId(workspaceId)
    setActiveWorkspace(workspaceId)
    clearWorkspaceData()
    clearWorkspaceSession()
    window.location.reload()
  }

  const createWorkspace = async () => {
    const name = window.prompt('请输入公众号名称')?.trim()
    if (!name) return
    try {
      const workspace = await api.createWorkspace({ name })
      switchWorkspace(workspace.id)
    } catch (error) {
      window.alert(`新建失败：${error.message || '请稍后重试'}`)
    }
  }

  const deleteWorkspace = async () => {
    if (activeWorkspaceId === 'gtc-default' || workspaces.length <= 1) return
    const current = workspaces.find((workspace) => workspace.id === activeWorkspaceId)
    if (!current || !window.confirm(`确定删除“${current.name}”及其全部知识库、案例和同步数据吗？此操作不可恢复。`)) return
    try {
      await api.deleteWorkspace(activeWorkspaceId)
      const next = workspaces.find((workspace) => workspace.id !== activeWorkspaceId)
      setActiveWorkspaceId(next.id)
      setActiveWorkspace(next.id)
      clearWorkspaceData()
      clearWorkspaceSession()
      window.location.reload()
    } catch (error) {
      window.alert(`删除失败：${error.message || '请稍后重试'}`)
    }
  }

  useEffect(() => {
    if (!session || !syncReadyVersion || syncError.current) return undefined
    const timer = window.setInterval(() => {
      const currentState = JSON.stringify(captureWorkspaceState())
      if (currentState === lastSyncedState.current) return
      saveWorkspace(session, syncVersion.current).then((result) => {
        if (result) {
          syncVersion.current = result.version
          lastSyncedState.current = JSON.stringify(captureWorkspaceState())
          setSyncStatus('已同步')
        }
      }).catch(() => {
        syncError.current = true
        setSyncStatus('同步失败，当前保留本地数据')
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [session, syncReadyVersion])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-gtc-sub">正在检查登录状态…</div>
  if (supabaseConfigured && !session) return <Login />

  // 从内容生产中心「用 AI 助手优化」带入当前提示词
  const sendToChat = (prompt) => {
    setChatPrefill(prompt)
    setView('chat')
  }

  const onKeySaved = () => setHasKey(true)

  return (
    <div className="flex min-h-screen">
      {/* 轻量悬浮 Sidebar（玻璃质感，不贴边） */}
      <aside className="w-[180px] shrink-0 p-4 pr-0">
        <div className="glass rounded-card h-[calc(100vh-2rem)] sticky top-4 flex flex-col">
          <div className="px-5 pt-6 pb-5">
            <div className="text-[18px] font-semibold tracking-tight text-gtc-ink flex items-center gap-1.5">
              <SparkIcon size={18} className="text-gtc-blue shrink-0" /> GTC AI Studio
            </div>
            <div className="text-[11px] text-gtc-sub mt-1 ml-[22px]">全球青年人才中心</div>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={'nav-item' + (view === n.key ? ' active' : '')}
              >
                <n.icon size={17} className="shrink-0" />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="px-5 py-4 text-[11px] text-gtc-sub/70">
            MVP v1.0
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex-1 min-w-0">
        <header className="h-16 px-8 flex items-center justify-end gap-3">
          {hasKey
            ? (
              <span className="chip bg-emerald-50 text-emerald-600 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                AI · DeepSeek 已连接
              </span>
            )
            : (
              <span className="chip bg-white text-gtc-sub border border-black/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 inline-block" />
                AI · 未配置 Key
              </span>
            )}
          {syncStatus && <span className="text-xs text-gtc-sub">{syncStatus}</span>}
          {session && <button className="text-xs text-gtc-sub hover:text-gtc-ink" onClick={signOut}>退出登录</button>}
          <div className="flex items-center gap-2 text-sm text-gtc-sub bg-white/60 border border-black/[0.05] rounded-full px-2 py-1">
            <select value={activeWorkspaceId} onChange={(event) => switchWorkspace(event.target.value)} className="bg-transparent border-0 outline-none text-sm text-gtc-sub py-0.5">
              {workspaces.length === 0 && <option value={activeWorkspaceId}>GTC 官方公众号</option>}
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
            <button onClick={createWorkspace} className="w-6 h-6 rounded-full text-gtc-sub hover:bg-gtc-bg" title="新建公众号">＋</button>
            {activeWorkspaceId !== 'gtc-default' && workspaces.length > 1 && <button onClick={deleteWorkspace} className="w-6 h-6 rounded-full text-rose-400 hover:bg-rose-50" title="删除当前公众号">×</button>}
          </div>
        </header>
        <div className="px-8 pb-12 page-enter" key={view}>
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'studio' && <ContentStudio onSendToChat={sendToChat} />}
          {view === 'brand' && <BrandKnowledge />}
          {view === 'chat' && <ChatAssistant prefill={chatPrefill} />}
          {view === 'settings' && <Settings onSaved={onKeySaved} />}
        </div>
      </main>
    </div>
  )
}
