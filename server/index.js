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
//   GET  /api/config            → reputation weights + hire threshold
//   PUT  /api/config            → update weights/threshold (persisted)
//   GET  /api/profile           → user profile (wallet, owned agents)
//   PUT  /api/profile           → update wallet address / profile fields
//   POST /api/agents/custom     → mint-verified custom agent creation (PRD §4.3)
//   GET  /api/feed              → live social timeline (PRD §4.4)
//   GET  /api/feed/pending      → pending posts for the user's agents
//   POST /api/feed/posts/:id/approve    → approve a pending post → live
//   POST /api/feed/posts/:id/regenerate → regenerate a pending post
//   POST /api/feed/cycle        → run a feed cycle now (demo trigger)
//   POST /api/feed/focus        → set an agent's focus for the next cycle
//   GET  /api/feed/status       → scheduler state
// ---------------------------------------------------------------------------

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
import { AGENTS, LIFECYCLE_STAGES } from './agents.js'
import { store, nextId, warmup, loadStore, saveStore, getAgent, getAllAgents } from './store.js'
import { buildAllAgents, buildAgent, buildSwarm, SWARMS, buildAuditEvent } from './metrics.js'
import { runAgent, auditOutput, MODE } from './runtime.js'
import { verifyMint, metadataHashOf, AGENT_FACTORY_ADDRESS, TASK_ESCROW_ADDRESS, TREASURY_ADDRESS } from './chain.js'
import { verifyCreateTask, verifyCompleteTask, readTreasuryStats } from './chain.js'
import {
  runFeedCycle,
  startFeedScheduler,
  seedFeedIfEmpty,
  feedStatus,
  generatePost,
  auditContent,
} from './feed.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8787

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const clamp01 = (v) => clamp(v, 0, 1)
// Route a task to the best available agent for a given stage (by trust score)
function routeTask(task, stageId) {
  const pool = getAllAgents().filter((a) => (stageId ? a.stage.id === stageId : true) && a.status !== 'stalled')
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
    agents: getAllAgents().length,
    executions: store.executions.length,
    audits: store.audits.length,
    warmup: store.warmup,
  })
})

// Chain config for the frontend wallet flow (PRD §4.3)
app.get('/api/chain', (req, res) => {
  res.json({
    chainId: 84532,
    chainName: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    agentFactory: AGENT_FACTORY_ADDRESS,
    taskEscrow: TASK_ESCROW_ADDRESS,
    treasury: TREASURY_ADDRESS,
    mintFeeEth: '0.001',
    deployed: !!AGENT_FACTORY_ADDRESS,
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

// Reputation protocol config — weights + hire threshold
app.get('/api/config', (req, res) => {
  res.json({ config: store.config })
})

app.put('/api/config', (req, res) => {
  const body = req.body || {}
  const w = body.reputation
  if (w) {
    const keys = ['trust', 'completion', 'latency', 'social']
    const next = {}
    let sum = 0
    for (const k of keys) {
      const v = typeof w[k] === 'number' ? w[k] : store.config.reputation[k]
      next[k] = Math.round(clamp01(v) * 1000) / 1000
      sum += next[k]
    }
    if (Math.abs(Math.round(sum * 1000) / 1000 - 1) > 0.001) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (got ${sum.toFixed(3)})` })
    }
    store.config.reputation = next
  }
  if (typeof body.hireThreshold === 'number') {
    store.config.hireThreshold = Math.round(clamp(body.hireThreshold, 0, 100))
  }
  saveStore()
  res.json({ config: store.config })
})

app.get('/api/swarms', (req, res) => {
  res.json({ swarms: SWARMS.map(buildSwarm) })
})

// ---------------------------------------------------------------------------
// User profile (PRD §4.1): wallet address + owned agent ids, persisted to SQLite.
// The client sends the Google identity; the server upserts and returns the row.
// ---------------------------------------------------------------------------
function upsertProfile({ email, name, picture, walletAddress }) {
  if (!email || typeof email !== 'string') return null
  const existing = store.users.find((u) => u.id === email)
  const now = Date.now()
  const user = {
    id: email,
    name: typeof name === 'string' && name ? name : existing?.name || email.split('@')[0],
    email,
    picture: typeof picture === 'string' ? picture : existing?.picture || null,
    walletAddress:
      typeof walletAddress === 'string' && walletAddress ? walletAddress : existing?.walletAddress || null,
    created_at: existing?.created_at || now,
  }
  if (!existing) store.users.push(user)
  else Object.assign(existing, user)
  saveStore()
  return user
}

app.get('/api/profile', (req, res) => {
  const { email } = req.query
  if (!email) return res.status(400).json({ error: 'email query param is required' })
  const user = store.users.find((u) => u.id === email)
  if (!user) return res.status(404).json({ error: 'Profile not found' })
  // Owned agents: custom agents minted by this user (Phase 2 populates these)
  const ownedAgentIds = []
  res.json({ profile: { ...user, ownedAgentIds } })
})

app.put('/api/profile', (req, res) => {
  const { email, name, picture, walletAddress } = req.body || {}
  const user = upsertProfile({ email, name, picture, walletAddress })
  if (!user) return res.status(400).json({ error: 'email is required' })
  res.json({ profile: { ...user, ownedAgentIds: [] } })
})

// ---------------------------------------------------------------------------
// Custom agent creation (PRD §4.3): the client submits a mint txHash; the
// backend verifies it ON-CHAIN (receipt + AgentMinted event, owner + metadata
// hash must match) before persisting anything. Never trust the client.
// ---------------------------------------------------------------------------
const SPECIALTIES = ['Content Writer', 'Researcher', 'Coder', 'Designer', 'Data Analyst', 'Community Manager']

app.post('/api/agents/custom', async (req, res) => {
  const { txHash, walletAddress, name, personaPrompt, specialty, email } = req.body || {}

  // --- validate input ---
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40) {
    return res.status(400).json({ error: 'name must be 2-40 characters' })
  }
  if (!personaPrompt || typeof personaPrompt !== 'string' || personaPrompt.trim().length < 10 || personaPrompt.trim().length > 500) {
    return res.status(400).json({ error: 'personaPrompt must be 10-500 characters' })
  }
  if (!SPECIALTIES.includes(specialty)) {
    return res.status(400).json({ error: `specialty must be one of: ${SPECIALTIES.join(', ')}` })
  }
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'walletAddress must be a valid address' })
  }
  if (!txHash) return res.status(400).json({ error: 'txHash is required' })

  // --- verify the mint on-chain (PRD §7: verify before any off-chain effect) ---
  const metadataHash = metadataHashOf({ name: name.trim(), personaPrompt: personaPrompt.trim(), specialty })
  const verified = await verifyMint(txHash, walletAddress, metadataHash)
  if (!verified.ok) {
    return res.status(400).json({ error: `on-chain verification failed: ${verified.error}` })
  }

  // --- persist the agent (starting reputation 0 — no history yet) ---
  const agent = {
    id: nextId('cu'),
    name: name.trim(),
    role: specialty,
    gender: null,
    stage: LIFECYCLE_STAGES.find((s) => s.id === 'discovery'),
    specialty,
    description: `Custom agent minted on-chain by ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
    tags: ['custom', 'on-chain'],
    price: 0.1,
    persona: personaPrompt.trim(),
    ownerId: email || null,
    walletAddress,
    mintTxHash: txHash,
    tokenId: verified.tokenId ? String(verified.tokenId) : null,
    created_at: Date.now(),
  }
  store.agents.push(agent)
  saveStore()

  // Link the agent to the owner's profile
  if (email) upsertProfile({ email, walletAddress })

  res.status(201).json({ agent: buildAgent(agent), verified: { tokenId: String(verified.tokenId) }, mode: MODE })
})

app.get('/api/audits', (req, res) => {
  const list = [...store.audits]
    .filter((a) => getAgent(a.agentId) && getAgent(a.auditorId))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 100)
    .map(buildAuditEvent)
    .filter(Boolean)
  res.json({ audits: list, total: store.audits.filter((a) => getAgent(a.agentId) && getAgent(a.auditorId)).length })
})

app.get('/api/events', (req, res) => {
  const events = [
    ...store.audits
      .filter((a) => getAgent(a.agentId) && getAgent(a.auditorId))
      .map((a) => ({ type: 'audit', ...a, tsLabel: timeAgo(a.ts) })),
    ...store.executions
      .filter((e) => getAgent(e.agentId))
      .map((e) => ({ type: 'execution', ...e, tsLabel: timeAgo(e.ts) })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 30)
  res.json({ events })
})

// ---------------------------------------------------------------------------
// Social training feed (PRD §4.4)
// ---------------------------------------------------------------------------
function buildFeedPost(p) {
  const agent = getAgent(p.agentId)
  const reactions = store.feedReactions
    .filter((r) => r.postId === p.id)
    .map((r) => ({ ...r, agent: getAgent(r.agentId) ? buildAgent(getAgent(r.agentId)) : null }))
  return {
    ...p,
    agent: agent ? buildAgent(agent) : null,
    reactions,
    tsLabel: timeAgo(p.ts),
  }
}

// Live timeline, newest first
app.get('/api/feed', (req, res) => {
  const posts = store.feedPosts
    .filter((p) => p.status === 'live')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
    .map(buildFeedPost)
  res.json({ posts, status: feedStatus() })
})

// Pending posts for the signed-in user's agents (approval gate)
app.get('/api/feed/pending', (req, res) => {
  const { email } = req.query
  const owned = store.agents.filter((a) => a.ownerId === email).map((a) => a.id)
  const pending = store.feedPosts
    .filter((p) => p.status === 'pending' && owned.includes(p.agentId))
    .sort((a, b) => b.ts - a.ts)
    .map((p) => ({ ...p, agent: getAgent(p.agentId) ? buildAgent(getAgent(p.agentId)) : null }))
  res.json({ pending })
})

// Approve a pending post → live (owner training interaction)
app.post('/api/feed/posts/:id/approve', (req, res) => {
  const post = store.feedPosts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  if (post.status !== 'pending') return res.status(400).json({ error: 'Post is not pending' })
  post.status = 'live'
  saveStore()
  res.json({ post: buildFeedPost(post) })
})

// Regenerate a pending post's content (owner training interaction)
app.post('/api/feed/posts/:id/regenerate', async (req, res) => {
  const post = store.feedPosts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  if (post.status !== 'pending') return res.status(400).json({ error: 'Only pending posts can be regenerated' })
  const agent = getAgent(post.agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  const content = await generatePost(agent, store.config.feedFocus?.[agent.id] || null)
  const audit = await auditContent(agent, content)
  post.content = content
  post.auditScore = audit.score
  post.audit = audit.axes
  saveStore()
  res.json({ post: buildFeedPost(post) })
})

// Manual cycle trigger (demo: "Run cycle now")
app.post('/api/feed/cycle', async (req, res) => {
  const count = Math.min(Number(req.body?.count) || 3, 6)
  const results = await runFeedCycle({ count })
  res.json({ results, status: feedStatus() })
})

// Set an agent's focus for the next cycle (owner steering)
app.post('/api/feed/focus', (req, res) => {
  const { agentId, focus } = req.body || {}
  const agent = getAgent(agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  store.config.feedFocus = store.config.feedFocus || {}
  store.config.feedFocus[agentId] =
    typeof focus === 'string' && focus.trim() ? focus.trim().slice(0, 200) : null
  saveStore()
  res.json({ agentId, focus: store.config.feedFocus[agentId] })
})

app.get('/api/feed/status', (req, res) => {
  res.json({ status: feedStatus() })
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

// ---------------------------------------------------------------------------
// Marketplace hiring (PRD §4.6): consumer locks testnet ETH in TaskEscrow,
// the agent executes, then the consumer confirms completion to release
// (amount − 7% fee) to the agent owner and the fee to the treasury.
// Every step is verified on-chain before any off-chain effect.
// ---------------------------------------------------------------------------
const FEE_BPS = 700

function agentOwnerOf(agent) {
  // Custom agents pay their minting wallet; platform-owned flagships pay the
  // platform treasury (the platform owns them).
  return agent.walletAddress || TREASURY_ADDRESS
}

// Hire: { task, agentId, amountEth, txHash, walletAddress }
app.post('/api/tasks/hire', async (req, res) => {
  const { task, agentId, amountEth, txHash, walletAddress } = req.body || {}

  if (!task || typeof task !== 'string' || !task.trim()) {
    return res.status(400).json({ error: 'task is required' })
  }
  const agent = agentId ? getAgent(agentId) : null
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  const built = buildAgent(agent)
  if (!built.hireable) {
    return res.status(403).json({ error: `Agent not hireable — reputation ${built.reputationScore} < threshold ${store.config.hireThreshold}` })
  }
  const amount = Number(amountEth)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10) {
    return res.status(400).json({ error: 'amountEth must be a positive number (max 10 ETH)' })
  }
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'walletAddress must be a valid address' })
  }
  if (!txHash) return res.status(400).json({ error: 'txHash is required' })

  const agentOwner = agentOwnerOf(agent)
  const amountWei = BigInt(Math.round(amount * 1e18))

  // --- verify the escrow lock on-chain (PRD §7) ---
  const verified = await verifyCreateTask(txHash, walletAddress, agentOwner, amountWei)
  if (!verified.ok) {
    return res.status(400).json({ error: `on-chain escrow verification failed: ${verified.error}` })
  }

  // --- persist the task (escrowed) ---
  const taskRecord = {
    id: nextId('tk'),
    task: task.trim(),
    agentId: agent.id,
    status: 'escrowed',
    executionId: null,
    ts: Date.now(),
    escrowTaskId: String(verified.taskId),
    consumer: walletAddress,
    amountEth: amount,
    txHash,
  }
  store.tasks.push(taskRecord)
  saveStore()

  // --- agent executes (existing task runner) ---
  const started = Date.now()
  const result = await runAgent(agent, task.trim())
  const execution = {
    id: nextId('ex'),
    agentId: agent.id,
    task: task.trim(),
    output: result.output,
    success: result.success,
    latencyMs: result.latencyMs,
    ts: Date.now(),
  }
  store.executions.push(execution)
  taskRecord.executionId = execution.id
  taskRecord.status = result.success ? 'completed' : 'failed'
  saveStore()

  const fee = Math.round(amount * FEE_BPS) / 10000
  res.status(201).json({
    task: taskRecord,
    execution: { ...execution, agent: buildAgent(agent), totalMs: Date.now() - started },
    escrow: {
      taskId: String(verified.taskId),
      amountEth: amount,
      feeEth: fee,
      payoutEth: Math.round((amount - fee) * 10000) / 10000,
      agentOwner,
      feeBps: FEE_BPS,
    },
    mode: MODE,
  })
})

// Confirm completion: { txHash } — consumer releases the escrowed payment
app.post('/api/tasks/:id/confirm', async (req, res) => {
  const task = store.tasks.find((t) => t.id === req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  if (task.status === 'paid' || task.status === 'released') {
    return res.status(400).json({ error: `Task already settled (${task.status})` })
  }
  if (task.status !== 'completed') {
    return res.status(400).json({ error: `Task must be completed before confirming (status: ${task.status})` })
  }
  const { txHash } = req.body || {}
  if (!txHash) return res.status(400).json({ error: 'txHash is required' })

  // --- verify the payout on-chain (PRD §7) ---
  const verified = await verifyCompleteTask(txHash, task.escrowTaskId)
  if (!verified.ok) {
    return res.status(400).json({ error: `on-chain payout verification failed: ${verified.error}` })
  }

  task.status = verified.released ? 'released' : 'paid'
  task.payoutEth = Number(verified.payout) / 1e18
  task.feeEth = Number(verified.fee) / 1e18
  task.paidAt = Date.now()
  saveStore()

  const agent = getAgent(task.agentId)
  res.json({
    task,
    payout: { payoutEth: task.payoutEth, feeEth: task.feeEth, agentOwner: agentOwnerOf(agent) },
    mode: MODE,
  })
})

// Task ledger with escrow state (hiring history)
app.get('/api/tasks', (req, res) => {
  const list = [...store.tasks]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 100)
    .map((t) => ({ ...t, agent: getAgent(t.agentId) ? buildAgent(getAgent(t.agentId)) : null }))
  res.json({ tasks: list })
})

// Treasury stats (PRD §4.7) — cumulative fees read from contract events
app.get('/api/treasury', async (req, res) => {
  const stats = await readTreasuryStats()
  res.json({ treasury: { ...stats, address: TREASURY_ADDRESS, escrow: TASK_ESCROW_ADDRESS, factory: AGENT_FACTORY_ADDRESS } })
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
  // Social feed (PRD §4.4): seed once so the timeline is alive, then schedule.
  startFeedScheduler()
  seedFeedIfEmpty()
    .then((r) => console.log(`[feed] seed: ${r.seeded ? `posted ${r.count} items` : r.reason}`))
    .catch((e) => console.error('[feed] seed failed:', e.message))
})