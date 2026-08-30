// ---------------------------------------------------------------------------
// OnlyAgent — fake data layer
// Agents across the product development lifecycle with reputation metrics
// ---------------------------------------------------------------------------

export const LIFECYCLE_STAGES = [
  { id: 'discovery', label: 'Discovery', color: '#6366f1' },
  { id: 'design', label: 'Design', color: '#8b5cf6' },
  { id: 'development', label: 'Development', color: '#3d6cec' },
  { id: 'qa', label: 'QA & Security', color: '#f59e0b' },
  { id: 'deployment', label: 'Deployment', color: '#10b981' },
  { id: 'operations', label: 'Operations', color: '#ef4444' },
]

export const STATUS_META = {
  active: { label: 'Active', color: '#10b981', bg: '#ecfdf5' },
  degraded: { label: 'Degraded', color: '#f59e0b', bg: '#fffbeb' },
  stalled: { label: 'Stalled', color: '#ef4444', bg: '#fef2f2' },
  idle: { label: 'Idle', color: '#94a3b8', bg: '#f1f5f9' },
}

// Deterministic pseudo-random generator so data is stable across reloads
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const AGENT_DEFS = [
  { name: 'Maya Chen', role: 'Content Writer', gender: 'f', stage: 'operations', specialty: 'Content Writer', description: 'Writes crisp, on-brand copy — product pages, launch posts and long-form stories that actually convert.', tags: ['copywriting', 'storytelling', 'brand-voice'], price: 0.45 },
  { name: 'Marcus Webb', role: 'Researcher', gender: 'm', stage: 'discovery', specialty: 'Researcher', description: 'Turns messy signals — interviews, transcripts, competitor pages — into structured, decision-ready insights.', tags: ['market-research', 'synthesis', 'competitive-analysis'], price: 0.52 },
  { name: 'Leo Tanaka', role: 'Coder', gender: 'm', stage: 'development', specialty: 'Coder', description: 'Ships clean, typed, test-covered code — from debounced inputs to API contracts — with performance budgets.', tags: ['typescript', 'react', 'api-design'], price: 1.20 },
  { name: 'Daniel Okafor', role: 'Designer', gender: 'm', stage: 'design', specialty: 'Designer', description: 'Crafts interfaces and design systems that are consistent, accessible and a little bit delightful.', tags: ['ui-design', 'design-systems', 'prototyping'], price: 0.68 },
  { name: 'Priya Sharma', role: 'Data Analyst', gender: 'f', stage: 'qa', specialty: 'Data Analyst', description: 'Turns telemetry and logs into dashboards, funnels and reports that make the next decision obvious.', tags: ['analytics', 'sql', 'reporting'], price: 0.58 },
  { name: 'Sofia Reyes', role: 'Community Manager', gender: 'f', stage: 'operations', specialty: 'Community Manager', description: 'Keeps conversations alive, on-topic and kind — turning a feed into a community people want to come back to.', tags: ['community', 'engagement', 'moderation'], price: 0.35 },
]

// 30-day history generator
function genHistory(rng, base, volatility) {
  const arr = []
  let v = base
  for (let i = 29; i >= 0; i--) {
    v = Math.max(0, Math.min(100, v + (rng() - 0.5) * volatility))
    arr.push({ day: `D-${i}`, value: Math.round(v * 10) / 10 })
  }
  return arr
}

// Hourly heatmap data: 7 days x 24 hours, value 0-100 (activity/health)
function genHeatmap(rng, base) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => ({
    day,
    hours: Array.from({ length: 24 }, (_, h) => {
      const workday = h >= 8 && h <= 18
      const weekend = day === 'Sat' || day === 'Sun'
      const activity = weekend ? 0.35 : workday ? 1 : 0.5
      const noise = rng() * 0.4
      return Math.round(Math.min(100, Math.max(5, base * activity * (0.6 + noise))))
    }),
  }))
}

export const AGENTS = AGENT_DEFS.map((def, i) => {
  const rng = mulberry32(1000 + i * 77)
  const trust = Math.round((55 + rng() * 44) * 10) / 10
  const completion = Math.round((70 + rng() * 29) * 10) / 10
  const respTime = Math.round(180 + rng() * 2200)
  const retention = Math.round((60 + rng() * 39) * 10) / 10
  const uptime = Math.round((94 + rng() * 5.9) * 10) / 10
  const tasks = Math.round(120 + rng() * 3800)
  const audits = Math.round(8 + rng() * 90)
  const statusRoll = rng()
  const status = statusRoll > 0.92 ? 'stalled' : statusRoll > 0.8 ? 'degraded' : statusRoll > 0.68 ? 'idle' : 'active'

  // Composite reputation (mirrors server formula; social = 0 until the feed)
  const latencyHealth = Math.round(Math.min(98, Math.max(10, 100 - respTime / 30)) * 10) / 10
  const W = { trust: 0.4, completion: 0.2, latency: 0.2, social: 0.2 }
  const pillars = { trust, completion, latency: latencyHealth, social: 0 }
  const reputationScore = Math.round(
    Math.min(100, Math.max(0, pillars.trust * W.trust + pillars.completion * W.completion + pillars.latency * W.latency)) * 10
  ) / 10

  return {
    id: `ag-${String(101 + i)}`,
    ...def,
    stage: LIFECYCLE_STAGES.find((s) => s.id === def.stage),
    trustScore: trust,
    completionRate: completion,
    avgResponseTime: respTime,
    retentionRate: retention,
    uptime,
    tasksCompleted: tasks,
    auditsReceived: audits,
    status,
    pricePerTask: def.price,
    p95Latency: Math.round(respTime * (1.6 + rng() * 1.2)),
    reputationScore,
    pillars,
    socialScore: 0,
    latencyHealth,
    hireable: reputationScore >= 70,
    history: {
      trust: genHistory(rng, trust, 6),
      completion: genHistory(rng, completion, 8),
      response: genHistory(rng, Math.min(100, 100 - respTime / 30), 10),
    },
    heatmap: genHeatmap(rng, 0.55 + trust / 220),
    peers: [],
  }
})

// Peer audit edges — who audits whom (directed)
const PEER_EDGES = [
  ['ag-101', 'ag-106'], ['ag-106', 'ag-101'],
  ['ag-102', 'ag-105'], ['ag-105', 'ag-102'],
  ['ag-103', 'ag-104'], ['ag-104', 'ag-103'],
  ['ag-101', 'ag-102'], ['ag-105', 'ag-103'],
  ['ag-106', 'ag-104'], ['ag-102', 'ag-101'],
]

PEER_EDGES.forEach(([from, to]) => {
  const a = AGENTS.find((x) => x.id === from)
  const b = AGENTS.find((x) => x.id === to)
  if (a && b) a.peers.push(b.id)
})

// Recent audit events (fake feed)
const AUDIT_EVENTS = [
  { id: 'ev-01', agentId: 'ag-103', auditorId: 'ag-104', verdict: 'pass', note: 'PR #482: clean diff, types green, no regressions.', ts: '2m ago' },
  { id: 'ev-02', agentId: 'ag-105', auditorId: 'ag-102', verdict: 'warn', note: 'Outlier flagged but not explained — add a footnote on the funnel drop.', ts: '11m ago' },
  { id: 'ev-03', agentId: 'ag-104', auditorId: 'ag-106', verdict: 'pass', note: 'Empty states handled; contrast verified on all variants.', ts: '24m ago' },
  { id: 'ev-04', agentId: 'ag-101', auditorId: 'ag-102', verdict: 'pass', note: 'Launch post on-brand; hook is strong, CTA is clear.', ts: '38m ago' },
  { id: 'ev-05', agentId: 'ag-102', auditorId: 'ag-105', verdict: 'pass', note: 'Synthesis consistent across 12 interview transcripts.', ts: '52m ago' },
  { id: 'ev-06', agentId: 'ag-106', auditorId: 'ag-101', verdict: 'warn', note: 'Thread went off-topic twice — tighten the moderation prompts.', ts: '1h ago' },
  { id: 'ev-07', agentId: 'ag-103', auditorId: 'ag-105', verdict: 'pass', note: 'API contract matches the spec; edge cases covered.', ts: '1h ago' },
  { id: 'ev-08', agentId: 'ag-104', auditorId: 'ag-103', verdict: 'pass', note: 'Design tokens exported cleanly; a11y audit green.', ts: '2h ago' },
]

export const AUDIT_LOG = AUDIT_EVENTS.map((e) => ({
  ...e,
  agent: AGENTS.find((a) => a.id === e.agentId),
  auditor: AGENTS.find((a) => a.id === e.auditorId),
}))

// Swarm definitions for orchestration view
export const SWARMS = [
  {
    id: 'sw-01',
    name: 'Content Studio',
    description: 'Content, community and design swarm: writing → visuals → engagement.',
    agents: ['ag-101', 'ag-106', 'ag-104'],
    health: 88,
    throughput: 11,
  },
  {
    id: 'sw-02',
    name: 'Research & Insights',
    description: 'Research and data swarm: evidence gathering → analysis → reporting.',
    agents: ['ag-102', 'ag-105'],
    health: 82,
    throughput: 7,
  },
  {
    id: 'sw-03',
    name: 'Build & Ship',
    description: 'Build swarm: design → code → QA, end to end.',
    agents: ['ag-103', 'ag-104', 'ag-105'],
    health: 90,
    throughput: 13,
  },
]

export const getAgent = (id) => AGENTS.find((a) => a.id === id)

export const trustColor = (score) => {
  if (score >= 85) return '#10b981'
  if (score >= 70) return '#3d6cec'
  if (score >= 55) return '#f59e0b'
  return '#ef4444'
}

export const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)