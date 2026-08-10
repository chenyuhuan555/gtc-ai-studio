import React, { useState } from 'react'
import { api } from '../api.js'
import { GearIcon, SparkIcon, StatusIcon } from '../icons.jsx'

export default function Settings({ onSaved }) {
  const [apiKey, setApiKey] = useState(() => api.getSettings().apiKey)
  const [model, setModel] = useState(() => api.getSettings().model)
  const [saved, setSaved] = useState(false)
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  const save = () => {
    api.saveSettings({ apiKey, model })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (onSaved) onSaved()
  }

  const test = async () => {
    setTesting(true)
    setTestMsg('')
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], stream: false }),
      })
      setTestMsg(res.ok ? '✅ 连接成功，Key 可用' : `❌ ${res.status}：Key 无效或受限`)
    } catch (e) {
      setTestMsg('❌ 网络 / CORS 错误：' + e.message)
    } finally {
      setTesting(false)
    }
  }

  const configured = !!apiKey.trim()

  return (
    <div className="max-w-2xl space-y-5">
      {/* 标题 */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-gtc-ink">设置</h1>
        <p className="text-sm text-gtc-sub mt-1">管理 AI 连接与模型偏好</p>
      </div>

      {/* Apple 设置风格：单卡片分组列表 */}
      <div className="card !p-0 overflow-hidden divide-y divide-black/[0.05]">
        {/* API 配置 */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gtc-blue/10 text-gtc-blue flex items-center justify-center"><GearIcon size={20} /></div>
            <div>
              <div className="text-[15px] font-semibold text-gtc-ink">API 配置</div>
              <div className="text-xs text-gtc-sub">Key 仅保存在本机浏览器，不上传任何服务器</div>
            </div>
          </div>
          <label className="label">DeepSeek API Key</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type={show ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button className="btn-ghost !px-3" onClick={() => setShow((s) => !s)}>
              {show ? '隐藏' : '显示'}
            </button>
          </div>
          <p className="text-xs text-gtc-sub mt-1.5">
            申请地址：
            <a className="text-gtc-blue hover:underline" href="https://platform.deepseek.com" target="_blank" rel="noreferrer">
              platform.deepseek.com
            </a>
          </p>
        </div>

        {/* 模型选择 */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gtc-blue/10 text-gtc-blue flex items-center justify-center"><SparkIcon size={20} /></div>
            <div>
              <div className="text-[15px] font-semibold text-gtc-ink">模型选择</div>
              <div className="text-xs text-gtc-sub">用于提示词优化与 AI 助手对话</div>
            </div>
          </div>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="deepseek-chat">deepseek-chat（默认 · 快 · 经济）</option>
            <option value="deepseek-reasoner">deepseek-reasoner（推理更强）</option>
          </select>
          <div className="pt-4">
            <button className="btn-primary" onClick={save}>{saved ? '已保存 ✓' : '保存设置'}</button>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gtc-blue/10 text-gtc-blue flex items-center justify-center"><StatusIcon size={20} /></div>
            <div>
              <div className="text-[15px] font-semibold text-gtc-ink">连接状态</div>
              <div className="text-xs text-gtc-sub">验证当前 Key 是否可用</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={test} disabled={testing || !apiKey.trim()}>
              {testing ? '测试中…' : '测试连接'}
            </button>
            {configured
              ? (
                <span className="chip bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                  已配置
                </span>
              )
              : (
                <span className="chip bg-amber-50 text-amber-600 border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 inline-block" />
                  未配置 · AI 将降级为规则化
                </span>
              )}
          </div>
          {testMsg && <div className="text-sm text-gtc-sub mt-3">{testMsg}</div>}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="rounded-card bg-gtc-bg border border-black/[0.04] p-5 text-xs text-gtc-sub space-y-1.5">
        <div className="font-medium text-gtc-ink">使用说明</div>
        <div>1. 在「API 配置」填入 Key 并保存（仅存本机浏览器，清除浏览器数据会丢失，需重新填）。</div>
        <div>2. 前往「内容生产中心」生成提示词，或「AI 助手」做多轮优化，均会通过 DeepSeek 实时生成。</div>
        <div>3. 若不填 Key：AI 助手与优化会降级为本地规则化引擎（仍可生成基础提示词，但非 AI 优化）。</div>
      </div>
    </div>
  )
}
