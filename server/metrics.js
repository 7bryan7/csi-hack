// ---------------------------------------------------------------------------
// Reputation metrics — computed from execution + audit history.
// Mirrors the shape the frontend expects so swapping fake → live is seamless.
// ---------------------------------------------------------------------------

import { AGENTS, LIFECYCLE_STAGES } from './agents.js'
import { store } from './store.js'

const DAY = 86400000

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// Trust score: 100 base, −2 per warn, −8 per fail, +1 per pass (capped)
function computeTrust(agentId) {
  const audits = store.audits.filter((a) => a.agentId === agentId)
  let score = 78
  audits.forEach((a) => {
    if (a.verdict === 'pass') score += 1
    else if (a.verdict === 'warn') score -= 2
    else score -= 8
  })
  return Math.round(clamp(score, 20, 99) * 10) / 10
}

function computeCompletion(agentId) {
  const ex = store.executions.filter((e) => e.agentId === agentId)
  if (ex.length === 0) return 95
  const ok = ex.filter((e) => e.success).length
  return Math.round((ok / ex.length) * 1000) / 10
}

function computeLatency(agentId) {
  const ex = store.executions.filter((e) => e.agentId === agentId)
  if (ex.length === 0) return 400
  const avg = ex.reduce((s, e) => s + e.latencyMs, 0) / ex.length
  return Math.round(avg)
}

function computeP95(agentId) {
  const ex = store.executions.filter((e) => e.agentId === agentId).map((e) => e.latencyMs).sort((a, b) => a - b)
  if (ex.length === 0) return 800
  return ex[Math.floor(ex.length * 0.95)]
}

function computeRetention(agentId) {
  // Proxy: share of executions in the last 7 days vs total
  const ex = store.executions.filter((e) => e.agentId === agentId)
  if (ex.length === 0) return 90
  const recent = ex.filter((e) => e.ts > Date.now() - 7 * DAY).length
  return Math.round(clamp((recent / ex.length) * 100 + 55, 40, 99) * 10) / 10
}

function computeUptime(agentId) {
  const ex = store.executions.filter((e) => e.agentId === agentId)
  if (ex.length === 0) return 99
  const ok = ex.filter((e) => e.success).length
  return Math.round(clamp(90 + (ok / ex.length) * 9, 85, 99.9) * 10) / 10
}

function computeStatus(agentId) {
  const trust = computeTrust(agentId)
  const completion = computeCompletion(agentId)
  const recent = store.executions.filter((e) => e.agentId === agentId && e.ts > Date.now() - 24 * 3600000)
  const recentFail = recent.filter((e) => !e.success).length
  if (trust < 55 || recentFail >= 3) return 'stalled'
  if (trust < 70 || completion < 80 || recentFail >= 1) return 'degraded'
  if (recent.length === 0) return 'idle'
  return 'active'
}

// 30-day history series for charts
function computeHistory(agentId, metric) {
  const now = Date.now()
  const out = []
  for (let day = 29; day >= 0; day--) {
    const start = now - (day + 1) * DAY
    const end = now - day * DAY
    const ex = store.executions.filter((e) => e.agentId === agentId && e.ts >= start && e.ts < end)
    let value
    if (metric === 'trust') {
      const audits = store.audits.filter((a) => a.agentId === agentId && a.ts >= start && a.ts < end)
      value = 78 + audits.reduce((s, a) => s + (a.verdict === 'pass' ? 1 : a.verdict === 'warn' ? -2 : -8), 0)
      value = clamp(value, 20, 99)
    } else if (metric === 'completion') {
      value = ex.length ? (ex.filter((e) => e.success).length / ex.length) * 100 : 95
    } else {
      // response (inverted health index 0-100)
      value = ex.length ? clamp(100 - ex.reduce((s, e) => s + e.latencyMs, 0) / ex.length / 30, 10, 98) : 70
    }
    out.push({ day: `D-${day}`, value: Math.round(value * 10) / 10 })
  }
  return out
}

// 7x24 activity heatmap from execution timestamps
function computeHeatmap(agentId) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const now = Date.now()
  const grid = days.map((day) => ({ day, hours: Array(24).fill(0) }))
  const ex = store.executions.filter((e) => e.agentId === agentId && e.ts > now - 7 * DAY)
  ex.forEach((e) => {
    const d = new Date(e.ts)
    const dayIdx = (d.getDay() + 6) % 7 // Mon=0
    grid[dayIdx].hours[d.getHours()] += 1
  })
  // Normalize to 0-100
  const max = Math.max(1, ...grid.flatMap((g) => g.hours))
  grid.forEach((g) => {
    g.hours = g.hours.map((v) => Math.round((v / max) * 100))
  })
  return grid
}

function computePeers(agentId) {
  const auditedBy = store.audits.filter((a) => a.agentId === agentId).map((a) => a.auditorId)
  const audited = store.audits.filter((a) => a.auditorId === agentId).map((a) => a.agentId)
  return [...new Set([...auditedBy, ...audited])]
}

export function buildAgent(agent) {
  const trustScore = computeTrust(agent.id)
  const completionRate = computeCompletion(agent.id)
  const avgResponseTime = computeLatency(agent.id)
  return {
    ...agent,
    trustScore,
    completionRate,
    avgResponseTime,
    retentionRate: computeRetention(agent.id),
    uptime: computeUptime(agent.id),
    tasksCompleted: store.executions.filter((e) => e.agentId === agent.id).length,
    auditsReceived: store.audits.filter((a) => a.agentId === agent.id).length,
    status: computeStatus(agent.id),
    p95Latency: computeP95(agent.id),
    history: {
      trust: computeHistory(agent.id, 'trust'),
      completion: computeHistory(agent.id, 'completion'),
      response: computeHistory(agent.id, 'response'),
    },
    heatmap: computeHeatmap(agent.id),
    peers: computePeers(agent.id),
  }
}

export function buildAllAgents() {
  return AGENTS.map(buildAgent)
}

export function buildSwarm(swarm) {
  const members = swarm.agents.map((id) => buildAgent(AGENTS.find((a) => a.id === id)))
  const health = Math.round(
    members.reduce((s, a) => s + a.trustScore, 0) / members.length
  )
  const throughput = members.reduce((s, a) => s + Math.round(a.tasksCompleted / 30), 0)
  return { ...swarm, health, throughput, members }
}

export const SWARMS = [
  {
    id: 'sw-01',
    name: 'Feature Factory',
    description: 'End-to-end feature delivery swarm: discovery → design → dev → QA → release.',
    agents: ['ag-001', 'ag-002', 'ag-003', 'ag-004', 'ag-007', 'ag-008', 'ag-011', 'ag-014'],
  },
  {
    id: 'sw-02',
    name: 'Security Response',
    description: 'Continuous security auditing and incident triage swarm.',
    agents: ['ag-012', 'ag-013', 'ag-017'],
  },
  {
    id: 'sw-03',
    name: 'Platform Reliability',
    description: 'Infrastructure, performance and operations monitoring swarm.',
    agents: ['ag-015', 'ag-014', 'ag-013', 'ag-018'],
  },
]

export function buildAuditEvent(a) {
  const agent = AGENTS.find((x) => x.id === a.agentId)
  const auditor = AGENTS.find((x) => x.id === a.auditorId)
  return {
    ...a,
    agent: buildAgent(agent),
    auditor: buildAgent(auditor),
    tsLabel: timeAgo(a.ts),
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return `${Math.max(1, Math.round(diff / 1000))}s ago`
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return `${Math.round(diff / 86400000)}d ago`
}

export { LIFECYCLE_STAGES }