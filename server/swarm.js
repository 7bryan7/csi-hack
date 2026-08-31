// ---------------------------------------------------------------------------
// Swarm analysis (roadmap: "fan one task out to 3-5 agents in parallel,
// merged report").
//
//   pickSwarmAgents  → diversity-first roster (one per lifecycle stage, then
//                      fill by trust score)
//   runSwarmAnalysis → fan the task out with limited concurrency, record each
//                      execution for reputation, then merge + synthesize
//   synthesize       → Gemini merge report (deterministic fallback)
// ---------------------------------------------------------------------------

import { store, getAllAgents, getAgent, nextId, saveStore } from './store.js'
import { runAgent, geminiPost, extractText, MODE } from './runtime.js'
import { buildAgent } from './metrics.js'

const MAX_AGENTS = 6
const MIN_AGENTS = 3
const CONCURRENCY = 3 // parallel Gemini calls per wave (rate-limit friendly)

// Diversity-first pick: one agent per lifecycle stage (highest trust), then
// fill the remaining slots by trust score. Never includes stalled agents.
export function pickSwarmAgents({ agentIds, count = 4 } = {}) {
  const roster = getAllAgents().filter((a) => a.status !== 'stalled')
  const target = Math.max(MIN_AGENTS, Math.min(count, MAX_AGENTS))

  if (agentIds && agentIds.length) {
    const picked = agentIds.map((id) => getAgent(id)).filter(Boolean)
    return picked.slice(0, MAX_AGENTS)
  }

  const byStage = new Map()
  for (const a of roster) {
    const key = a.stage?.id || 'other'
    if (!byStage.has(key)) byStage.set(key, [])
    byStage.get(key).push(a)
  }

  const picked = []
  for (const group of byStage.values()) {
    group.sort((x, y) => buildAgent(y).trustScore - buildAgent(x).trustScore)
    picked.push(group[0])
  }
  const rest = roster
    .filter((a) => !picked.includes(a))
    .sort((x, y) => buildAgent(y).trustScore - buildAgent(x).trustScore)
  for (const a of rest) {
    if (picked.length >= target) break
    picked.push(a)
  }
  return picked.slice(0, target)
}

// Deterministic merge — used as the report body and as the synthesis fallback.
function mergeResults(results, agents) {
  const ok = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const lines = []
  for (const r of ok) {
    const agent = agents.find((a) => a.id === r.agentId)
    lines.push(`## ${agent?.name || r.agentId} (${agent?.role || 'agent'})`)
    lines.push(r.output.trim())
    lines.push('')
  }
  if (failed.length) {
    lines.push(`## Failed contributors (${failed.length})`)
    for (const r of failed) {
      const agent = agents.find((a) => a.id === r.agentId)
      lines.push(`- ${agent?.name || r.agentId}: ${r.error || 'no output'}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim() || 'No agent produced output.'
}

// Gemini synthesis: one call that reads every contributor's output and writes
// a single merged report. Falls back to the deterministic merge on any failure.
async function synthesize(run, agents) {
  if (MODE !== 'gemini') return mergeResults(run.results, agents)
  const ok = run.results.filter((r) => r.success)
  if (!ok.length) return mergeResults(run.results, agents)

  const sections = ok
    .map((r) => {
      const agent = agents.find((a) => a.id === r.agentId)
      return `### ${agent?.name} (${agent?.role})\n${r.output.trim()}`
    })
    .join('\n\n')

  try {
    const res = await geminiPost({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `A swarm of ${ok.length} specialist agents independently analyzed the task: "${run.task}".\n\n` +
                `Their outputs:\n"""\n${sections}\n"""\n\n` +
                `Write a single merged analysis report: a 2-3 sentence executive summary, ` +
                `then "Key findings" as 3-6 bullet points that synthesize agreement and ` +
                `conflicts across contributors, then "Recommended next step" in one sentence. ` +
                `Do not mention that you are an AI model.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}`)
    const data = await res.json()
    const text = extractText(data)
    if (!text) throw new Error('empty synthesis')
    return text
  } catch (e) {
    console.error('[swarm] synthesis failed, using deterministic merge:', e.message)
    return mergeResults(run.results, agents)
  }
}

// Fan one task out to a swarm, record executions for reputation, merge.
export async function runSwarmAnalysis({ task, agentIds, count }) {
  const agents = pickSwarmAgents({ agentIds, count })
  const run = {
    id: nextId('sw'),
    task,
    agentIds: agents.map((a) => a.id),
    status: 'running',
    startedAt: Date.now(),
    finishedAt: null,
    results: [],
    merged: null,
    synthesis: null,
    error: null,
  }
  store.swarmRuns.push(run)
  saveStore()

  let cursor = 0
  async function worker() {
    while (cursor < agents.length) {
      const agent = agents[cursor]
      cursor += 1
      const started = Date.now()
      try {
        const result = await runAgent(agent, task)
        run.results.push({
          agentId: agent.id,
          output: result.output,
          success: result.success,
          latencyMs: result.latencyMs,
        })
        store.executions.push({
          id: nextId('ex'),
          agentId: agent.id,
          task,
          output: result.output,
          success: result.success,
          latencyMs: result.latencyMs,
          ts: Date.now(),
        })
      } catch (e) {
        run.results.push({
          agentId: agent.id,
          output: null,
          success: false,
          latencyMs: Date.now() - started,
          error: e.message,
        })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, agents.length) }, worker))

  run.merged = mergeResults(run.results, agents)
  run.synthesis = await synthesize(run, agents)
  run.status = 'done'
  run.finishedAt = Date.now()
  saveStore()
  return run
}

// Recent runs, newest first, with agent names resolved for the UI.
export function recentSwarmRuns(limit = 20) {
  return [...store.swarmRuns]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map((r) => ({
      ...r,
      agents: r.agentIds.map((id) => {
        const a = getAgent(id)
        return a ? { id, name: a.name, role: a.role } : { id, name: id, role: 'unknown' }
      }),
    }))
}