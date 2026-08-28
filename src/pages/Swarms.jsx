import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Network, Activity, Zap, ArrowRight, Bot } from 'lucide-react'
import NetworkGraph from '../components/NetworkGraph'
import { trustColor, STATUS_META } from '../data/agents'
import { useData } from '../DataContext'

export default function Swarms() {
  const { swarms, agents } = useData()
  const [selectedSwarm, setSelectedSwarm] = useState(swarms[0]?.id)
  const swarm = swarms.find((s) => s.id === selectedSwarm) || swarms[0]
  const members = swarm ? swarm.agents.map((id) => agents.find((a) => a.id === id)).filter(Boolean) : []

  if (!swarm) {
    return <div className="text-center py-24 text-slate-400 text-sm">Loading swarm data…</div>
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Swarm Network</h1>
        <p className="text-sm text-slate-500 mt-1">
          Orchestrated agent groups with dynamic re-ranking driven by peer audits.
        </p>
      </div>

      {/* Swarm selector cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {swarms.map((s) => {
          const isSel = s.id === selectedSwarm
          const healthColor = s.health >= 85 ? '#10b981' : s.health >= 75 ? '#f59e0b' : '#ef4444'
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSwarm(s.id)}
              className={`card-lift text-left bg-white rounded-2xl border-2 p-5 transition-colors ${
                isSel ? 'border-brand-500' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSel ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Network size={17} />
                  </div>
                  <div className="font-semibold text-slate-900">{s.name}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: healthColor, background: `${healthColor}14` }}>
                  {s.health}% health
                </span>
              </div>
              <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">{s.description}</p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1"><Bot size={12} /> {s.agents.length} agents</span>
                <span className="inline-flex items-center gap-1"><Zap size={12} /> {s.throughput} tasks/hr</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Network + members */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">{swarm.name} — topology</h3>
            <span className="text-[10px] text-slate-400">Double-click a node to open its profile</span>
          </div>
          <NetworkGraph height={480} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Swarm members — ranked by trust</h3>
          <div className="space-y-2">
            {[...members]
              .sort((a, b) => b.trustScore - a.trustScore)
              .map((a, i) => {
                const meta = STATUS_META[a.status]
                return (
                  <Link
                    key={a.id}
                    to={`/app/agents/${a.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-100">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{a.name}</div>
                      <div className="text-[11px] text-slate-400">{a.role}</div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: trustColor(a.trustScore) }}>
                        {a.trustScore.toFixed(0)}
                      </span>
                    </div>
                  </Link>
                )
              })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2">Swarm metrics</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg trust</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {(members.reduce((s, a) => s + a.trustScore, 0) / members.length).toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg completion</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {(members.reduce((s, a) => s + a.completionRate, 0) / members.length).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg response</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {(members.reduce((s, a) => s + a.avgResponseTime, 0) / members.length / 1000).toFixed(2)}s
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Audits today</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {members.reduce((s, a) => s + a.auditsReceived, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Re-ranking explainer */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-6 text-white flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <Activity size={16} />
            Dynamic re-ranking in action
          </div>
          <p className="text-sm text-brand-100 leading-relaxed">
            When a member's trust drops below threshold (e.g. repeated failed audits), the orchestrator
            automatically re-ranks the swarm and routes tasks to the next-best agent — no hardcoded routing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-bold">{swarm.agents.length}</div>
            <div className="text-[10px] text-brand-200 uppercase">agents</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-bold">{swarm.health}%</div>
            <div className="text-[10px] text-brand-200 uppercase">health</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-bold">{swarm.throughput}</div>
            <div className="text-[10px] text-brand-200 uppercase">tasks/hr</div>
          </div>
        </div>
      </div>
    </div>
  )
}