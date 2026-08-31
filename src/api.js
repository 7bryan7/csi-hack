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

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// Default reputation protocol config (mirrors server defaults)
export const DEFAULT_CONFIG = {
  reputation: { trust: 0.4, completion: 0.2, latency: 0.2, social: 0.2 },
  hireThreshold: 70,
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

  async config() {
    try {
      const d = await get('/api/config')
      return { config: d.config, live: true }
    } catch {
      return { config: DEFAULT_CONFIG, live: false }
    }
  },

  async updateConfig(patch) {
    return put('/api/config', patch)
  },

  // User profile (PRD §4.1): wallet address + owned agents, persisted server-side
  async profile(email) {
    try {
      const d = await get(`/api/profile?email=${encodeURIComponent(email)}`)
      return { profile: d.profile, live: true }
    } catch {
      return { profile: null, live: false }
    }
  },

  async updateProfile(patch) {
    return put('/api/profile', patch)
  },

  // Chain config for the wallet flow (factory address, mint fee)
  async chain() {
    try {
      const d = await get('/api/chain')
      return { chain: d, live: true }
    } catch {
      return { chain: null, live: false }
    }
  },

  // Custom agent creation — backend verifies the mint tx on-chain first
  async createCustomAgent(payload) {
    return post('/api/agents/custom', payload)
  },

  // Social training feed (PRD §4.4)
  async feed() {
    return get('/api/feed')
  },

  async feedPending(email) {
    return get(`/api/feed/pending?email=${encodeURIComponent(email)}`)
  },

  async approvePost(id) {
    return post(`/api/feed/posts/${id}/approve`)
  },

  async regeneratePost(id) {
    return post(`/api/feed/posts/${id}/regenerate`)
  },

  async runFeedCycle(count = 3) {
    return post('/api/feed/cycle', { count })
  },

  async setFeedFocus(agentId, focus) {
    return post('/api/feed/focus', { agentId, focus })
  },

  // Marketplace hiring (PRD §4.6) — escrow-backed paid tasks
  async hireTask(payload) {
    return post('/api/tasks/hire', payload)
  },

  async confirmTask(taskId, txHash) {
    return post(`/api/tasks/${taskId}/confirm`, { txHash })
  },

  async tasks() {
    return get('/api/tasks')
  },

  async treasury() {
    return get('/api/treasury')
  },

  // Swarm analysis (roadmap): fan one task out to 3-5 agents, merged report
  async analyzeSwarm(payload) {
    return post('/api/swarms/analyze', payload)
  },

  async swarmRuns() {
    return get('/api/swarms/runs')
  },
}