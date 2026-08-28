import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Bot, ShieldCheck, CheckCircle2, Timer, RefreshCw, Zap, DollarSign, Activity } from 'lucide-react'
import { getAgent, AGENTS, STATUS_META, trustColor, fmtMs, AUDIT_LOG } from '../data/agents'
import { TrustTrendChart, CompletionAreaChart, ResponseBarChart } from '../components/Charts'
import Heatmap from '../components/Heatmap'
import AgentCard from '../components/AgentCard'

export default function AgentDetail() {
  const { id } = useParams()
  const agent = getAgent(id)

  if (!agent) {
    return (
      <div className="max-w-[1200px] mx-auto text-center py-24">
        <Bot size={40} className="mx-auto text-slate-300 mb-3" />
        <div className="font-semibold text-slate-700">Agent not found</div>
        <Link to="/marketplace" className="text-sm text-brand-600 font-semibold mt-2 inline-block">← Back to marketplace</Link>
      </div>
    )
  }

  const meta = STATUS_META[agent.status]
  const peers = agent.peers.map(getAgent).filter(Boolean)
  const audits = AUDIT_LOG.filter((e) => e.agent.id === agent.id || e.auditor.id === agent.id)

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 font-medium">
        <ArrowLeft size={15} /> Back to marketplace
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white" style={{ background: agent.stage.color }}>
            <Bot size={26} />
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{agent.name}</h1>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                {meta.label}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{agent.role} · {agent.stage.label} stage</div>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">{agent.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.tags.map((t) => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 font-medium">{t}</span>
              ))}
            </div>
          </div>

          {/* Trust gauge */}
          <div className="text-center shrink-0">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#eef2f7" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={trustColor(agent.trustScore)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(agent.trustScore / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums" style={{ color: trustColor(agent.trustScore) }}>
                  {agent.trustScore.toFixed(0)}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Trust</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">peer-audited</div>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickMetric icon={CheckCircle2} label="Completion" value={`${agent.completionRate.toFixed(1)}%`} color="#10b981" />
          <QuickMetric icon={Timer} label="Avg response" value={fmtMs(agent.avgResponseTime)} color="#8b5cf6" />
          <QuickMetric icon={Activity} label="p95 latency" value={fmtMs(agent.p95Latency)} color="#f59e0b" />
          <QuickMetric icon={RefreshCw} label="Retention" value={`${agent.retentionRate.toFixed(1)}%`} color="#3d6cec" />
          <QuickMetric icon={Zap} label="Uptime" value={`${agent.uptime.toFixed(1)}%`} color="#06b6d4" />
          <QuickMetric icon={DollarSign} label="Price / task" value={`$${agent.pricePerTask.toFixed(2)}`} color="#64748b" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Trust score — 30 days</h3>
          <TrustTrendChart data={agent.history.trust} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Completion rate — 30 days</h3>
          <CompletionAreaChart data={agent.history.completion} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Response time — 30 days</h3>
          <ResponseBarChart data={agent.history.response} />
        </div>
      </div>

      {/* Heatmap + peers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <Heatmap data={agent.heatmap} title={`${agent.name} — activity heatmap`} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Peer audit network</h3>
          {peers.length === 0 ? (
            <p className="text-sm text-slate-400">No peer relationships yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {peers.map((p) => (
                <Link key={p.id} to={`/agents/${p.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: p.stage.color }}>
                    <Bot size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.role}</div>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: trustColor(p.trustScore) }}>
                    {p.trustScore.toFixed(0)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit history */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-800">Audit history</h3>
          <span className="text-[10px] text-slate-400 ml-auto">{audits.length} events</span>
        </div>
        {audits.length === 0 ? (
          <p className="text-sm text-slate-400">No audit events recorded for this agent.</p>
        ) : (
          <div className="space-y-2.5">
            {audits.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ev.verdict === 'pass' ? 'bg-emerald-500' : ev.verdict === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold">{ev.auditor.name}</span>
                    {ev.agent.id === agent.id ? ' audited this agent' : ' was audited by this agent'}
                    <span className={`ml-1.5 text-[10px] font-bold uppercase ${ev.verdict === 'pass' ? 'text-emerald-600' : ev.verdict === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
                      {ev.verdict}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{ev.note}</p>
                  <div className="text-[10px] text-slate-300 mt-0.5">{ev.ts}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar agents */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Similar agents in {agent.stage.label}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {AGENTS.filter((a) => a.stage.id === agent.stage.id && a.id !== agent.id)
            .slice(0, 3)
            .map((a) => <AgentCard key={a.id} agent={a} compact />)}
        </div>
      </div>
    </div>
  )
}

function QuickMetric({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-semibold">
        <Icon size={12} style={{ color }} />
        {label}
      </div>
      <div className="mt-1 text-base font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  )
}