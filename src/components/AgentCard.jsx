import { useNavigate } from 'react-router-dom'
import { Bot, CheckCircle2, AlertTriangle, XCircle, Clock, ArrowUpRight } from 'lucide-react'
import { STATUS_META, trustColor, fmtMs } from '../data/agents'

const STATUS_ICON = {
  active: CheckCircle2,
  degraded: AlertTriangle,
  stalled: XCircle,
  idle: Clock,
}

export default function AgentCard({ agent, compact = false }) {
  const navigate = useNavigate()
  const StatusIcon = STATUS_ICON[agent.status]
  const meta = STATUS_META[agent.status]

  return (
    <div
      onClick={() => navigate(`/agents/${agent.id}`)}
      className="card-lift cursor-pointer bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: agent.stage.color }}
          >
            <Bot size={19} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 leading-tight">{agent.name}</div>
            <div className="text-xs text-slate-400">{agent.role}</div>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={{ color: meta.color, background: meta.bg }}
        >
          <StatusIcon size={11} />
          {meta.label}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2rem]">{agent.description}</p>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Trust" value={agent.trustScore.toFixed(0)} suffix="" color={trustColor(agent.trustScore)} />
        <Metric label="Completion" value={agent.completionRate.toFixed(0)} suffix="%" color="#3d6cec" />
        <Metric label="Response" value={fmtMs(agent.avgResponseTime)} suffix="" color="#8b5cf6" />
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.tags.slice(0, compact ? 2 : 3).map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
            {t}
          </span>
        ))}
        <span
          className="text-[10px] px-2 py-0.5 rounded-md font-medium"
          style={{ color: agent.stage.color, background: `${agent.stage.color}14` }}
        >
          {agent.stage.label}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>{agent.tasksCompleted.toLocaleString()} tasks · {agent.auditsReceived} audits</span>
        <span className="inline-flex items-center gap-0.5 text-brand-600 font-medium">
          Details <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  )
}

function Metric({ label, value, suffix, color }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-800 tabular-nums" style={{ color }}>
        {value}
        {suffix}
      </div>
    </div>
  )
}