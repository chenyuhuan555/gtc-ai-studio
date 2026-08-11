import { supabase, supabaseConfigured } from './supabase.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const WORKSPACE_ID = 'main'
const HYDRATED_KEY = 'gtc_sync_hydrated'
const VERSION_KEY = 'gtc_sync_version'
const KEYS = [
  'gtc_today_tasks',
  'gtc_calendar_events',
  'gtc_performance_data',
  'gtc_chat_sessions',
  'gtc_recent_gens',
  'gtc_studio_form_v1',
  'gtc_prompt_form_v1',
]

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function captureWorkspaceState() {
  const state = {}
  KEYS.forEach((key) => {
    const value = readJson(key)
    if (value !== null) state[key] = value
  })
  return state
}

export function applyWorkspaceState(state) {
  Object.entries(state || {}).forEach(([key, value]) => {
    if (KEYS.includes(key)) localStorage.setItem(key, JSON.stringify(value))
  })
}

async function request(path, session, options = {}) {
  const token = session?.access_token
  if (!token) throw new Error('未登录')
  const response = await fetch(`${API_BASE}/api/sync${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    const error = new Error(body || response.statusText)
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function bootstrapWorkspace(session) {
  if (!supabaseConfigured || !session) return { mode: 'local' }

  const cloud = await request(`/workspace?workspace_id=${WORKSPACE_ID}`, session)
  if (!cloud) {
    const created = await request('/workspace', session, {
      method: 'PUT',
      body: JSON.stringify({ workspace_id: WORKSPACE_ID, state: captureWorkspaceState(), expected_version: null }),
    })
    localStorage.setItem(HYDRATED_KEY, '1')
    localStorage.setItem(VERSION_KEY, String(created.version))
    return { mode: 'initialized', version: created.version }
  }

  applyWorkspaceState(cloud.state)
  localStorage.setItem(HYDRATED_KEY, '1')
  localStorage.setItem(VERSION_KEY, String(cloud.version))
  return { mode: 'hydrated', version: cloud.version, reload: true }
}

export async function saveWorkspace(session, version) {
  if (!supabaseConfigured || !session || !version) return null
  const save = (expectedVersion) => request('/workspace', session, {
    method: 'PUT',
    body: JSON.stringify({ workspace_id: WORKSPACE_ID, state: captureWorkspaceState(), expected_version: expectedVersion }),
  })

  try {
    return await save(version)
  } catch (error) {
    if (error.status !== 409) throw error
    const latest = await request(`/workspace?workspace_id=${WORKSPACE_ID}`, session)
    if (!latest) throw error
    return save(latest.version)
  }
}

export function clearWorkspaceSession() {
  localStorage.removeItem(HYDRATED_KEY)
  localStorage.removeItem(VERSION_KEY)
}
