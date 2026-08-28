import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Bot, ArrowUpDown, X, Scale } from 'lucide-react'
import AgentCard from '../components/AgentCard'
import { AGENTS, LIFECYCLE_STAGES, STATUS_META, trustColor } from '../data/agents'

const SORTS = [
  { id: 'trust', label: 'Trust score' },
  { id: 'completion', label: 'Completion rate' },
  { id: 'response', label: 'Response time' },
  { id: 'price', label: 'Price / task' },
]

export default function Marketplace() {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [status, setStatus] = useState('all')
  const [minTrust, setMinTrust] = useState(0)
  const [sort, setSort] = useState('trust')
  const [compare, setCompare] = useState([])

  const filtered = useMemo(() => {
    let list = AGENTS.filter((a) => {
      if (stage !== 'all' && a.stage.id !== stage) return false
      if (status !== 'all' && a.status !== status) return false
      if (a.trustScore < minTrust) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'trust': return b.trustScore - a.trustScore
        case 'completion': return b.completionRate - a.completionRate
        case 'response': return a.avgResponseTime - b.avgResponseTime
        case 'price': return a.pricePerTask - b.pricePerTask
        default: return 0
      }
    })
    return list
  }, [query, stage, status, minTrust, sort])

  const toggleCompare = (id) => {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]))
  }

  const compareAgents = compare.map((id) => AGENTS.find((a) => a.id === id))
  const hasFilters = query || stage !== 'all' || status !== 'all' || minTrust > 0

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover and rank agents by live reputation — trust, completion and latency, peer-audited in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Bot size={14} className="text-brand-600" />
          <span className="font-semibold text-slate-800">{filtered.length}</span> of {AGENTS.length} agents
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, capability…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
            />
          </div>

          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 outline-none text-sm text-slate-700"
          >
            <option value="all">All lifecycle stages</option>
            {LIFECYCLE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 outline-none text-sm text-slate-700"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-600">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <span className="text-xs font-medium">Min trust</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minTrust}
              onChange={(e) => setMinTrust(Number(e.target.value))}
              className="w-24 accent-brand-600"
            />
            <span className="text-xs font-bold text-slate-800 tabular-nums w-8">{minTrust}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 outline-none text-sm text-slate-700"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>Sort: {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Active filters:</span>
            {query && <FilterChip label={`"${query}"`} onClear={() => setQuery('')} />}
            {stage !== 'all' && <FilterChip label={LIFECYCLE_STAGES.find((s) => s.id === stage)?.label} onClear={() => setStage('all')} />}
            {status !== 'all' && <FilterChip label={STATUS_META[status].label} onClear={() => setStatus('all')} />}
            {minTrust > 0 && <FilterChip label={`Trust ≥ ${minTrust}`} onClear={() => setMinTrust(0)} />}
            <button onClick={() => { setQuery(''); setStage('all'); setStatus('all'); setMinTrust(0) }} className="text-brand-600 font-semibold hover:text-brand-700">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Compare bar */}
      {compare.length > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <Scale size={16} className="text-brand-600" />
          <span className="text-sm font-semibold text-brand-800">Comparing {compare.length}/3 agents</span>
          <div className="flex gap-2 flex-1 flex-wrap">
            {compareAgents.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 bg-white border border-brand-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ background: trustColor(a.trustScore) }} />
                {a.name}
                <button onClick={() => toggleCompare(a.id)} className="text-slate-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          {compare.length === 3 && (
            <button className="text-xs font-bold bg-brand-600 text-white rounded-lg px-3 py-1.5 hover:bg-brand-700 transition-colors">
              Compare →
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Bot size={40} className="mx-auto text-slate-300 mb-3" />
          <div className="font-semibold text-slate-700">No agents match your filters</div>
          <p className="text-sm text-slate-400 mt-1">Try widening the trust threshold or clearing search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="relative">
              <button
                onClick={() => toggleCompare(a.id)}
                className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold transition-colors ${
                  compare.includes(a.id)
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600'
                }`}
                title="Add to compare"
              >
                {compare.includes(a.id) ? '✓' : '+'}
              </button>
              <AgentCard agent={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2.5 py-0.5 font-medium text-slate-600">
      {label}
      <button onClick={onClear} className="text-slate-400 hover:text-red-500">
        <X size={11} />
      </button>
    </span>
  )
}