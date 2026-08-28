// ---------------------------------------------------------------------------
// API client — talks to the Express backend.
// Every call falls back to the bundled fake data if the backend is unreachable,
// so the UI never breaks during a demo.
// ---------------------------------------------------------------------------

import { AGENTS as FAKE_AGENTS, SWARMS as FAKE_SWARMS, AUDIT_LOG as FAKE_AUDITS } from './data/agents'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export const api = {
  async health() {
    try {
      return await get('/api/health')
    } catch {
      return { ok: false, mode: 'offline' }
    }
  },

  async agents() {
    try {
      const d = await get('/api/agents')
      return { agents: d.agents, mode: d.mode, live: true }
    } catch {
      return { agents: FAKE_AGENTS, mode: 'fallback', live: false }
    }
  },

  async swarms() {
    try {
      const d = await get('/api/swarms')
      return { swarms: d.swarms, live: true }
    } catch {
      return { swarms: FAKE_SWARMS, live: false }
    }
  },

  async audits() {
    try {
      const d = await get('/api/audits')
      return { audits: d.audits, total: d.total, live: true }
    } catch {
      return { audits: FAKE_AUDITS, total: FAKE_AUDITS.length, live: false }
    }
  },

  async runTask(task, opts = {}) {
    return post('/api/tasks', { task, ...opts })
  },

  async auditTask(taskId, opts = {}) {
    return post(`/api/tasks/${taskId}/audit`, opts)
  },
}