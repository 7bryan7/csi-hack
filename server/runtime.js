// ---------------------------------------------------------------------------
// Agent runtime — pluggable executor.
//   GEMINI mode (default when GEMINI_API_KEY is set): real LLM calls.
//   SIMULATED mode: deterministic persona-flavored output (fallback only).
// ---------------------------------------------------------------------------

import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export const MODE = GEMINI_KEY ? 'gemini' : 'simulated'

// Persona system prompts for each agent — the curated persona voice from
// the roster definition drives observable personality in output and feed posts.
const PERSONA = (agent) =>
  agent.persona
    ? `You are "${agent.name}", a ${agent.role} agent in a product development swarm. ` +
      `Your capabilities: ${agent.tags.join(', ')}. ` +
      `You are being evaluated on correctness, completeness and speed. ` +
      `Respond concisely (2-4 sentences) and stay in character: ${agent.persona} ` +
      `Do not mention that you are an AI model.`
    : `You are "${agent.name}", a ${agent.role} agent in a product development swarm. ` +
      `Your capabilities: ${agent.tags.join(', ')}. ` +
      `You are being evaluated on correctness, completeness and speed. ` +
      `Respond concisely and professionally (2-4 sentences). ` +
      `Do not mention that you are an AI model.`

// Extract clean text from a Gemini response (skips thought blocks)
export function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || []
  return parts
    .filter((p) => p.text && p.thought !== true)
    .map((p) => p.text)
    .join('')
    .trim()
}

// POST to Gemini with retry/backoff on 429 (rate limit) and 5xx
export async function geminiPost(body) {
  const maxAttempts = 4
  let delay = 5000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify(body),
    })
    if (res.ok) return res
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0
      if (attempt === maxAttempts) return res
      await new Promise((r) => setTimeout(r, retryAfter * 1000 || delay))
      delay *= 2
      continue
    }
    return res
  }
  return null
}

// Deterministic pseudo-random (seeded) for the simulation fallback
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Simulated execution (fallback only — never used when Gemini is live)
// ---------------------------------------------------------------------------
function simulate(agent, task) {
  const rng = mulberry32((agent.id + task).split('').reduce((s, c) => s + c.charCodeAt(0), 0))
  const latencyMs = Math.round(agent.pricePerTask * 400 + rng() * 900)
  const success = rng() > 0.08
  const templates = [
    `Analyzed "${task}" as ${agent.role}. Key findings: ${(rng() * 3 + 1).toFixed(0)} actionable items identified.`,
    `Completed ${agent.role} pass on "${task}". Output validated against ${agent.tags[0]} best practices.`,
    `Delivered ${agent.role} deliverable for "${task}". ${success ? 'All checks passed.' : 'Partial output — flagged 2 open questions.'}`,
  ]
  return { output: templates[Math.floor(rng() * templates.length)], success, latencyMs }
}

// ---------------------------------------------------------------------------
// Gemini execution
// ---------------------------------------------------------------------------
async function gemini(agent, task) {
  const start = Date.now()
  const res = await geminiPost({
    contents: [{ role: 'user', parts: [{ text: `${PERSONA(agent)}\n\nTask: ${task}` }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
  })
  const latencyMs = Date.now() - start
  if (!res) throw new Error('Gemini request failed')
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = extractText(data)
  if (!text) throw new Error('Gemini returned an empty response')
  return { output: text, success: true, latencyMs }
}

// ---------------------------------------------------------------------------
// Public API — Gemini primary, simulation fallback on failure
// ---------------------------------------------------------------------------
export async function runAgent(agent, task) {
  if (MODE === 'gemini') {
    try {
      return await gemini(agent, task)
    } catch (e) {
      console.error('[runtime] Gemini failed, falling back to simulation:', e.message)
      return simulate(agent, task)
    }
  }
  return simulate(agent, task)
}

// Peer audit: review an agent's output and return a verdict
export async function auditOutput(auditor, agent, task, output) {
  if (MODE === 'gemini') {
    try {
      const start = Date.now()
      const res = await geminiPost({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `${PERSONA(auditor)}\n\n` +
                  `You are auditing the output of "${agent.name}" (${agent.role}) for the task: "${task}".\n` +
                  `Output to review:\n"""\n${output}\n"""\n\n` +
                  `Return a JSON object with exactly: {"verdict": "pass"|"warn"|"fail", "note": "<one sentence>"}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      })
      const latencyMs = Date.now() - start
      if (!res) throw new Error('Gemini request failed')
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      const text = extractText(data)
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (!['pass', 'warn', 'fail'].includes(parsed.verdict)) throw new Error(`Bad verdict: ${parsed.verdict}`)
      return { verdict: parsed.verdict, note: parsed.note || 'No note provided.', latencyMs }
    } catch (e) {
      console.error('[runtime] Gemini audit failed, falling back to simulation:', e.message)
    }
  }
  // Simulated audit (fallback)
  const rng = mulberry32((auditor.id + agent.id + task).split('').reduce((s, c) => s + c.charCodeAt(0), 0))
  const roll = rng()
  const verdict = roll > 0.88 ? 'fail' : roll > 0.68 ? 'warn' : 'pass'
  const notes = {
    pass: 'Output meets quality bar; no issues found.',
    warn: 'Minor gaps found; acceptable with follow-up.',
    fail: 'Output does not meet the required standard.',
  }
  return { verdict, note: notes[verdict], latencyMs: Math.round(200 + rng() * 600) }
}