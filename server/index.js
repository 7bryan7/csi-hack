// ---------------------------------------------------------------------------
// OnlyAgent backend — Express API
//   GET  /api/health
//   GET  /api/agents            → agents with computed reputation metrics
//   GET  /api/agents/:id        → single agent
//   GET  /api/swarms            → swarms with computed health
//   GET  /api/audits            → audit ledger (newest first)
//   POST /api/tasks             → run a task (routes to best agent by reputation)
//   POST /api/tasks/:id/audit   → trigger a peer audit on a completed task
//   GET  /api/events            → recent activity feed
// ---------------------------------------------------------------------------

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
import { AGENTS, getAgent } from './agents.js'
import { store, nextId, warmup, loadStore, saveStore } from './store.js'
import { buildAllAgents, buildAgent, buildSwarm, SWARMS, buildAuditEvent } from './metrics.js'
import { runAgent, auditOutput, MODE } from './runtime.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8787

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Route a task to the best available agent for a given stage (by trust score)
function routeTask(task, stageId) {
  const pool = AGENTS.filter((a) => (stageId ? a.stage.id === stageId : true) && a.status !== 'stalled')
  if (pool.length === 0) return null
  const ranked = pool
    .map((a) => ({ agent: a, trust: buildAgent(a).trustScore }))
    .sort((x, y) => y.trust - x.trust)
  return ranked[0].agent
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: MODE,
    agents: AGENTS.length,
    executions: store.executions.length,
    audits: store.audits.length,
    warmup: store.warmup,
  })
})

app.get('/api/agents', (req, res) => {
  res.json({ agents: buildAllAgents(), mode: MODE })
})

app.get('/api/agents/:id', (req, res) => {
  const agent = getAgent(req.params.id)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  res.json({ agent: buildAgent(agent) })
})

app.get('/api/swarms', (req, res) => {
  res.json({ swarms: SWARMS.map(buildSwarm) })
})

app.get('/api/audits', (req, res) => {
  const list = [...store.audits].sort((a, b) => b.ts - a.ts).slice(0, 100).map(buildAuditEvent)
  res.json({ audits: list, total: store.audits.length })
})

app.get('/api/events', (req, res) => {
  const events = [
    ...store.audits.map((a) => ({ type: 'audit', ...a, tsLabel: timeAgo(a.ts) })),
    ...store.executions.map((e) => ({ type: 'execution', ...e, tsLabel: timeAgo(e.ts) })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 30)
  res.json({ events })
})

// Run a task: { task, stage?, agentId? } — routes to best agent unless specified
app.post('/api/tasks', async (req, res) => {
  const { task, stage, agentId } = req.body || {}
  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'task is required' })
  }

  const agent = agentId ? getAgent(agentId) : routeTask(task, stage)
  if (!agent) return res.status(503).json({ error: 'No available agent for routing' })

  const started = Date.now()
  const result = await runAgent(agent, task)

  const execution = {
    id: nextId('ex'),
    agentId: agent.id,
    task,
    output: result.output,
    success: result.success,
    latencyMs: result.latencyMs,
    ts: Date.now(),
  }
  store.executions.push(execution)
  saveStore()

  const taskRecord = {
    id: nextId('tk'),
    task,
    agentId: agent.id,
    status: result.success ? 'completed' : 'failed',
    executionId: execution.id,
    ts: Date.now(),
  }
  store.tasks.push(taskRecord)
  saveStore()

  res.json({
    task: taskRecord,
    execution: { ...execution, agent: buildAgent(agent), totalMs: Date.now() - started },
    routedTo: buildAgent(agent),
    mode: MODE,
  })
})

// Peer audit a completed task: { auditorId? } — picks a peer auditor by default
app.post('/api/tasks/:id/audit', async (req, res) => {
  const task = store.tasks.find((t) => t.id === req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  const execution = store.executions.find((e) => e.id === task.executionId)
  if (!execution) return res.status(404).json({ error: 'Execution not found' })

  const agent = getAgent(task.agentId)
  const auditorId = req.body?.auditorId
  const auditor = auditorId
    ? getAgent(auditorId)
    : AGENTS.find((a) => a.id !== agent.id && a.stage.id === agent.stage.id) || AGENTS.find((a) => a.id !== agent.id)

  const result = await auditOutput(auditor, agent, task.task, execution.output)

  const audit = {
    id: nextId('au'),
    agentId: agent.id,
    auditorId: auditor.id,
    task: task.task,
    output: execution.output,
    verdict: result.verdict,
    note: result.note,
    ts: Date.now(),
  }
  store.audits.push(audit)
  saveStore()

  res.json({ audit: buildAuditEvent(audit), updatedAgent: buildAgent(agent), mode: MODE })
})

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return `${Math.max(1, Math.round(diff / 1000))}s ago`
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return `${Math.round(diff / 86400000)}d ago`
}

app.listen(PORT, () => {
  const hasData = loadStore()
  console.log(`[onlyagent] backend on http://localhost:${PORT} (mode: ${MODE})`)
  if (hasData) {
    console.log(`[onlyagent] loaded ${store.executions.length} executions, ${store.audits.length} audits from disk`)
  } else {
    console.log(`[onlyagent] store empty — warming up with real runtime calls...`)
    // Fire-and-forget: populate the store with real executions/audits in the background.
    // Serial + 4s spacing keeps us under the free-tier rate limit (~15 RPM sustained).
    warmup({ tasksPerAgent: 1, audits: true, concurrency: 1, spacingMs: 4000 }).catch((e) =>
      console.error('[warmup] failed:', e.message)
    )
  }
})