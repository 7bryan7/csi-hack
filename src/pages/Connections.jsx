import { useState, useEffect } from 'react'
import {
  Cpu, KeyRound, Plug, PlugZap, Bot, Network, ShieldCheck, Zap,
  SlidersHorizontal, Bell, Rocket, CheckCircle2, Eye, EyeOff, Info,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// UI-only page: model connections + agent/swarm operator configuration.
// State persists to localStorage so the demo feels real; no backend calls.
// ---------------------------------------------------------------------------

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    desc: 'gemini-flash-lite-latest · free tier',
    color: '#4285F4',
    connectedByDefault: true,
    placeholder: 'AIza… or AQ…',
  },
  { id: 'openai', name: 'OpenAI', desc: 'gpt-4o / o3 family', color: '#10a37f', placeholder: 'sk-…' },
  { id: 'anthropic', name: 'Anthropic', desc: 'claude-sonnet / opus', color: '#d97757', placeholder: 'sk-ant-…' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'any model, one key', color: '#8b5cf6', placeholder: 'sk-or-…' },
  { id: 'custom', name: 'Custom endpoint', desc: 'OpenAI-compatible base URL', color: '#64748b', placeholder: 'https://…' },
]

const CONN_KEY = 'oa_connections'
const CFG_KEY = 'oa_agent_config'

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function Toggle({ on, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-brand-600' : 'bg-slate-200'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="py-3">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5 mb-2">{hint}</div>}
      {children}
    </div>
  )
}

const selectCls =
  'w-full px-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none text-sm'

export default function Connections() {
  const [conns, setConns] = useState(() => {
    const saved = load(CONN_KEY, {})
    const base = {}
    PROVIDERS.forEach((p) => {
      base[p.id] = saved[p.id] ?? { connected: p.connectedByDefault || false, key: '' }
    })
    return base
  })
  const [cfg, setCfg] = useState(() =>
    load(CFG_KEY, {
      routing: 'trust',
      auditPolicy: 'every',
      concurrency: 4,
      retries: 2,
      fallbackModel: 'gemini-flash-lite-latest',
      publish: true,
      autoAcceptAudits: true,
      trustAlert: 60,
      notifyTask: true,
      notifyAudit: true,
      notifyTrust: true,
    })
  )
  const [showKeys, setShowKeys] = useState({})

  useEffect(() => localStorage.setItem(CONN_KEY, JSON.stringify(conns)), [conns])
  useEffect(() => localStorage.setItem(CFG_KEY, JSON.stringify(cfg)), [cfg])

  const setConn = (id, patch) => setConns((c) => ({ ...c, [id]: { ...c[id], ...patch } }))
  const setCfgField = (k, v) => setCfg((c) => ({ ...c, [k]: v }))

  const connectedCount = Object.values(conns).filter((c) => c.connected).length

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">AI Models & Agent Config</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect your own model API keys and tune how your agents run, get audited and stay discoverable.
        </p>
      </div>

      {/* Model connections */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-brand-600" />
          <h2 className="text-sm font-bold text-slate-800">Model connections</h2>
          <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {connectedCount} connected
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Bring your own key (BYOK) — tasks you submit run on your quota. Keys are stored locally in your browser.
        </p>

        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const c = conns[p.id]
            const show = showKeys[p.id]
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 transition-colors ${
                  c.connected ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{p.desc}</div>
                  </div>
                  {c.connected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={11} /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      Not connected
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={show ? 'text' : 'password'}
                      value={c.key}
                      onChange={(e) => setConn(p.id, { key: e.target.value })}
                      placeholder={p.placeholder}
                      className="w-full pl-3 pr-9 py-2 rounded-lg bg-white border border-slate-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                    <button
                      onClick={() => setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={show ? 'Hide key' : 'Show key'}
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    onClick={() => setConn(p.id, { connected: !c.connected })}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
                      c.connected
                        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {c.connected ? <PlugZap size={14} /> : <Plug size={14} />}
                    {c.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Agent runtime */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={16} className="text-brand-600" />
          <h2 className="text-sm font-bold text-slate-800">Agent runtime</h2>
        </div>

        <div className="divide-y divide-slate-100">
          <Field label="Routing strategy" hint="How the orchestrator picks an agent for each task.">
            <select value={cfg.routing} onChange={(e) => setCfgField('routing', e.target.value)} className={selectCls}>
              <option value="trust">Trust-first — highest reputation wins</option>
              <option value="cost">Cost-first — cheapest capable agent</option>
              <option value="latency">Latency-first — fastest response</option>
              <option value="auto">Auto — blend trust, cost and latency</option>
            </select>
          </Field>

          <Field label="Audit policy" hint="How often peer agents review task outputs.">
            <select value={cfg.auditPolicy} onChange={(e) => setCfgField('auditPolicy', e.target.value)} className={selectCls}>
              <option value="every">Audit every task</option>
              <option value="sample">Sample 25% of tasks</option>
              <option value="manual">Manual — only when I trigger it</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max concurrent tasks" hint="Parallel executions per swarm.">
              <input
                type="number"
                min={1}
                max={32}
                value={cfg.concurrency}
                onChange={(e) => setCfgField('concurrency', Number(e.target.value))}
                className={selectCls}
              />
            </Field>
            <Field label="Retry attempts" hint="Retries before an agent is marked failed.">
              <input
                type="number"
                min={0}
                max={5}
                value={cfg.retries}
                onChange={(e) => setCfgField('retries', Number(e.target.value))}
                className={selectCls}
              />
            </Field>
          </div>

          <Field label="Fallback model" hint="Used when the primary model is rate-limited or down.">
            <select
              value={cfg.fallbackModel}
              onChange={(e) => setCfgField('fallbackModel', e.target.value)}
              className={selectCls}
            >
              <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
              <option value="gemini-3.6-flash">gemini-3.6-flash</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="claude-haiku">claude-haiku</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Developer & operator */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={16} className="text-brand-600" />
          <h2 className="text-sm font-bold text-slate-800">Developer & operator</h2>
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Controls for agent developers publishing to the marketplace and swarm operators governing fleets.
        </p>

        <div className="divide-y divide-slate-100">
          <Toggle
            on={cfg.publish}
            onChange={(v) => setCfgField('publish', v)}
            label="Publish my agents to the marketplace"
            hint="Your agents become discoverable and routable by other users."
          />
          <Toggle
            on={cfg.autoAcceptAudits}
            onChange={(v) => setCfgField('autoAcceptAudits', v)}
            label="Auto-accept peer audits"
            hint="Audit verdicts apply to your trust score immediately."
          />
          <Toggle
            on={cfg.notifyTask}
            onChange={(v) => setCfgField('notifyTask', v)}
            label="Task notifications"
            hint="Email me when a task completes or fails."
          />
          <Toggle
            on={cfg.notifyAudit}
            onChange={(v) => setCfgField('notifyAudit', v)}
            label="Audit notifications"
            hint="Email me when my agent is audited."
          />
          <Toggle
            on={cfg.notifyTrust}
            onChange={(v) => setCfgField('notifyTrust', v)}
            label="Trust-drop alerts"
            hint="Warn me when an agent's trust score drops sharply."
          />

          <Field label="Trust alert threshold" hint="Alert when an agent's trust score falls below this value.">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={90}
                value={cfg.trustAlert}
                onChange={(e) => setCfgField('trustAlert', Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-sm font-bold text-slate-700 w-10 text-right">{cfg.trustAlert}</span>
            </div>
          </Field>
        </div>
      </section>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-xs text-brand-800">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          This page is a UI preview — connections and settings are stored locally in your browser and are not yet
          wired to the backend. The platform key (Gemini) keeps powering live tasks until BYOK is enabled.
        </p>
      </div>
    </div>
  )
}