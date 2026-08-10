import React, { useState } from 'react'
import { signIn } from '../supabase.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message || '登录失败，请检查账号和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f7fb] p-6">
      <form onSubmit={submit} className="w-full max-w-sm glass rounded-card p-8 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gtc-ink">GTC AI Studio</h1>
          <p className="text-sm text-gtc-sub mt-1">登录后同步你的工作区</p>
        </div>
        <label className="block text-sm text-gtc-sub">
          邮箱
          <input className="input mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm text-gtc-sub">
          密码
          <input className="input mt-1 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
      </form>
    </main>
  )
}
