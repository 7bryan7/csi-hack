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
  { name: 'Product Scout', role: 'Product Manager', stage: 'discovery', desc: 'Scans market signals, user feedback and competitor moves to surface product opportunities.', tags: ['market-research', 'roadmap', 'prioritization'], price: 0.42 },
  { name: 'Requirement Miner', role: 'Business Analyst', stage: 'discovery', desc: 'Extracts structured requirements from stakeholder conversations and raw briefs.', tags: ['requirements', 'spec-writing', 'stakeholder'], price: 0.38 },
  { name: 'UX Researcher', role: 'UX Researcher', stage: 'discovery', desc: 'Designs and runs user studies, synthesizes interviews into actionable insights.', tags: ['user-research', 'interviews', 'insights'], price: 0.55 },
  { name: 'Wireframe Artist', role: 'Product Designer', stage: 'design', desc: 'Produces low-fidelity wireframes and user flows from validated requirements.', tags: ['wireframes', 'user-flows', 'prototyping'], price: 0.61 },
  { name: 'UI Systems Builder', role: 'UI Designer', stage: 'design', desc: 'Maintains the design system, tokens and component specs across the product.', tags: ['design-system', 'tokens', 'components'], price: 0.74 },
  { name: 'Design Critic', role: 'Design Reviewer', stage: 'design', desc: 'Peer-audits design output for consistency, accessibility and brand compliance.', tags: ['audit', 'a11y', 'brand'], price: 0.29 },
  { name: 'Frontend Engineer', role: 'Frontend Dev', stage: 'development', desc: 'Implements UI features with typed components, tests and performance budgets.', tags: ['react', 'typescript', 'css'], price: 1.20 },
  { name: 'Backend Engineer', role: 'Backend Dev', stage: 'development', desc: 'Builds APIs, data models and business logic with contract-first design.', tags: ['api', 'databases', 'services'], price: 1.35 },
  { name: 'API Integration Specialist', role: 'Integration Dev', stage: 'development', desc: 'Wires third-party services and internal systems into reliable integrations.', tags: ['integrations', 'webhooks', 'oauth'], price: 0.98 },
  { name: 'Code Reviewer', role: 'Engineering Reviewer', stage: 'development', desc: 'Peer-reviews pull requests for correctness, security and maintainability.', tags: ['code-review', 'security', 'best-practices'], price: 0.45 },
  { name: 'QA Tester', role: 'QA Engineer', stage: 'qa', desc: 'Designs test plans, runs regression suites and files reproducible bug reports.', tags: ['test-plans', 'regression', 'bug-reports'], price: 0.52 },
  { name: 'Security Auditor', role: 'Security Engineer', stage: 'qa', desc: 'Scans for vulnerabilities, reviews threat models and enforces policy gates.', tags: ['pentest', 'threat-model', 'compliance'], price: 0.88 },
  { name: 'Performance Optimizer', role: 'Performance Engineer', stage: 'qa', desc: 'Profiles bottlenecks and applies targeted optimizations to latency and memory.', tags: ['profiling', 'latency', 'optimization'], price: 0.79 },
  { name: 'Release Orchestrator', role: 'DevOps Engineer', stage: 'deployment', desc: 'Coordinates build, staging and production rollouts with rollback safety.', tags: ['ci-cd', 'rollouts', 'rollback'], price: 0.66 },
  { name: 'Infra Provisioner', role: 'Platform Engineer', stage: 'deployment', desc: 'Provisions and tunes cloud infrastructure, autoscaling and cost controls.', tags: ['terraform', 'kubernetes', 'cloud'], price: 0.93 },
  { name: 'Docs Scribe', role: 'Technical Writer', stage: 'operations', desc: 'Keeps API docs, runbooks and changelogs accurate and searchable.', tags: ['documentation', 'runbooks', 'changelog'], price: 0.31 },
  { name: 'Support Triage', role: 'Support Engineer', stage: 'operations', desc: 'Classifies incoming issues, drafts responses and escalates with context.', tags: ['triage', 'support', 'escalation'], price: 0.27 },
  { name: 'Analytics Reporter', role: 'Data Analyst', stage: 'operations', desc: 'Turns product telemetry into dashboards, funnels and decision-ready reports.', tags: ['analytics', 'dashboards', 'funnels'], price: 0.58 },
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

  return {
    id: `ag-${String(i + 1).padStart(3, '0')}`,
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
  ['ag-001', 'ag-002'], ['ag-002', 'ag-003'], ['ag-003', 'ag-004'],
  ['ag-004', 'ag-005'], ['ag-005', 'ag-006'], ['ag-006', 'ag-004'],
  ['ag-007', 'ag-008'], ['ag-008', 'ag-009'], ['ag-009', 'ag-010'],
  ['ag-010', 'ag-007'], ['ag-008', 'ag-010'], ['ag-007', 'ag-009'],
  ['ag-011', 'ag-012'], ['ag-012', 'ag-013'], ['ag-013', 'ag-011'],
  ['ag-014', 'ag-015'], ['ag-015', 'ag-014'],
  ['ag-016', 'ag-017'], ['ag-017', 'ag-018'], ['ag-018', 'ag-016'],
  ['ag-003', 'ag-004'], ['ag-005', 'ag-007'], ['ag-006', 'ag-011'],
  ['ag-010', 'ag-012'], ['ag-013', 'ag-014'], ['ag-015', 'ag-016'],
  ['ag-002', 'ag-018'], ['ag-009', 'ag-011'],
]

PEER_EDGES.forEach(([from, to]) => {
  const a = AGENTS.find((x) => x.id === from)
  const b = AGENTS.find((x) => x.id === to)
  if (a && b) a.peers.push(b.id)
})

// Recent audit events (fake feed)
const AUDIT_EVENTS = [
  { id: 'ev-01', agentId: 'ag-007', auditorId: 'ag-010', verdict: 'pass', note: 'PR #482: clean diff, tests green, no security regressions.', ts: '2m ago' },
  { id: 'ev-02', agentId: 'ag-012', auditorId: 'ag-011', verdict: 'warn', note: 'Threat model gap: rate limiting missing on /v2/export.', ts: '11m ago' },
  { id: 'ev-03', agentId: 'ag-004', auditorId: 'ag-006', verdict: 'pass', note: 'Wireframes match spec; a11y contrast verified on all states.', ts: '24m ago' },
  { id: 'ev-04', agentId: 'ag-015', auditorId: 'ag-014', verdict: 'fail', note: 'Terraform plan drifted: prod bucket policy reverted to public.', ts: '38m ago' },
  { id: 'ev-05', agentId: 'ag-003', auditorId: 'ag-002', verdict: 'pass', note: 'Interview synthesis consistent across 12 sessions.', ts: '52m ago' },
  { id: 'ev-06', agentId: 'ag-009', auditorId: 'ag-008', verdict: 'warn', note: 'OAuth refresh flow untested for token rotation edge case.', ts: '1h ago' },
  { id: 'ev-07', agentId: 'ag-011', auditorId: 'ag-013', verdict: 'pass', note: 'Regression suite 100% green on staging.', ts: '1h ago' },
  { id: 'ev-08', agentId: 'ag-017', auditorId: 'ag-016', verdict: 'pass', note: 'Triage accuracy 94% this shift; escalations well-contextualized.', ts: '2h ago' },
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
    name: 'Feature Factory',
    description: 'End-to-end feature delivery swarm: discovery → design → dev → QA → release.',
    agents: ['ag-001', 'ag-002', 'ag-003', 'ag-004', 'ag-007', 'ag-008', 'ag-011', 'ag-014'],
    health: 92,
    throughput: 14,
  },
  {
    id: 'sw-02',
    name: 'Security Response',
    description: 'Continuous security auditing and incident triage swarm.',
    agents: ['ag-012', 'ag-013', 'ag-017'],
    health: 78,
    throughput: 6,
  },
  {
    id: 'sw-03',
    name: 'Platform Reliability',
    description: 'Infrastructure, performance and operations monitoring swarm.',
    agents: ['ag-015', 'ag-014', 'ag-013', 'ag-018'],
    health: 85,
    throughput: 9,
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