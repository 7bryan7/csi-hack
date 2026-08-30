// ---------------------------------------------------------------------------
// Reputation metrics — computed from execution + audit history.
// Mirrors the shape the frontend expects so swapping fake → live is seamless.
// ---------------------------------------------------------------------------

import { AGENTS, LIFECYCLE_STAGES } from './agents.js'
import { store, getAllAgents, getAgent } from './store.js'

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

// ---------------------------------------------------------------------------
// Composite reputation (PRD v2): four pillars, configurable weights.
//   trust      — peer-audit verdicts (pass/warn/fail)
//   completion — share of successful executions
//   latency    — inverted response-time health (0-100)
//   social     — on-chain social feed score; 0 until the feed exists (Phase 2)
// reputationScore = Σ weight_i × pillar_i, 0-100.
// ---------------------------------------------------------------------------

// Social pillar (PRD §4.4): recency-weighted average of the agent's audited
// feed posts + reactions. Computed from real feed history — never hardcoded.
// An agent with no feed activity honestly scores 0.
function computeSocial(agentId) {
  const items = [
    ...store.feedPosts
      .filter((p) => p.agentId === agentId && p.status === 'live')
      .map((p) => ({ score: p.auditScore, ts: p.ts })),
    ...store.feedReactions.filter((r) => r.agentId === agentId).map((r) => ({ score: r.auditScore, ts: r.ts })),
  ].filter((i) => typeof i.score === 'number')
  if (items.length === 0) return 0
  const now = Date.now()
  const weight = (ts) => Math.max(0.2, 1 - (now - ts) / (30 * DAY)) // linear decay over 30 days
  const totalW = items.reduce((s, i) => s + weight(i.ts), 0)
  const score = items.reduce((s, i) => s + i.score * weight(i.ts), 0) / totalW
  return Math.round(clamp(score, 0, 100) * 10) / 10
}

// Latency → health: 0-100 index, higher is better (sub-second ≈ 95+).
function computeLatencyHealth(agentId) {
  const ex = store.executions.filter((e) => e.agentId === agentId)
  if (ex.length === 0) return 87
  const avg = ex.reduce((s, e) => s + e.latencyMs, 0) / ex.length
  return Math.round(clamp(100 - avg / 30, 10, 98) * 10) / 10
}

function computeReputation(agentId) {
  const w = store.config.reputation
  // PRD §4.3: a brand-new agent (no executions, no audits, no feed activity)
  // starts at reputation 0 across all metrics — no evidence yet, so nothing
  // is assumed. Feed posts/reactions count as evidence for the social pillar
  // only (PRD §4.4); execution/audit pillars stay 0 until real task history
  // exists — the "no data" defaults must never leak in as assumed performance.
  const hasExecOrAudit =
    store.executions.some((e) => e.agentId === agentId) || store.audits.some((a) => a.agentId === agentId)
  const hasFeed =
    store.feedPosts.some((p) => p.agentId === agentId && p.status === 'live') ||
    store.feedReactions.some((r) => r.agentId === agentId)
  if (!hasExecOrAudit && !hasFeed) {
    return { score: 0, pillars: { trust: 0, completion: 0, latency: 0, social: 0 } }
  }
  const pillars = {
    trust: hasExecOrAudit ? computeTrust(agentId) : 0,
    completion: hasExecOrAudit ? computeCompletion(agentId) : 0,
    latency: hasExecOrAudit ? computeLatencyHealth(agentId) : 0,
    social: hasFeed ? computeSocial(agentId) : 0,
  }
  const score = pillars.trust * w.trust + pillars.completion * w.completion + pillars.latency * w.latency + pillars.social * w.social
  return { score: Math.round(clamp(score, 0, 100) * 10) / 10, pillars }
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
  const { score: reputationScore, pillars } = computeReputation(agent.id)
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
    // Composite reputation (PRD v2)
    reputationScore,
    pillars,
    socialScore: pillars.social,
    latencyHealth: pillars.latency,
    hireable: reputationScore >= store.config.hireThreshold,
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
  return getAllAgents().map(buildAgent)
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
    name: 'Content Studio',
    description: 'Content, community and design swarm: writing → visuals → engagement.',
    agents: ['ag-101', 'ag-106', 'ag-104'],
  },
  {
    id: 'sw-02',
    name: 'Research & Insights',
    description: 'Research and data swarm: evidence gathering → analysis → reporting.',
    agents: ['ag-102', 'ag-105'],
  },
  {
    id: 'sw-03',
    name: 'Build & Ship',
    description: 'Build swarm: design → code → QA, end to end.',
    agents: ['ag-103', 'ag-104', 'ag-105'],
  },
]

export function buildAuditEvent(a) {
  const agent = getAgent(a.agentId)
  const auditor = getAgent(a.auditorId)
  // Records referencing retired agents (pre-v2 roster) are filtered upstream;
  // guard here so a stale record can never crash the ledger.
  if (!agent || !auditor) return null
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