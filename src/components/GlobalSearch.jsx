import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bot, Network, ShieldCheck, ArrowRight } from 'lucide-react'
import { useData } from '../DataContext'
import { trustColor } from '../data/agents'

/**
 * Global search — live dropdown over agents, swarms and audits.
 * Click a result to navigate; Enter opens the first match.
 */
export default function GlobalSearch() {
  const { agents, swarms, audits } = useData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const query = q.trim().toLowerCase()
  const results = query
    ? {
        agents: agents
          .filter((a) =>
            [a.name, a.role, ...(a.tags || []), a.description || ''].join(' ').toLowerCase().includes(query)
          )
          .slice(0, 5),
        swarms: swarms
          .filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(query))
          .slice(0, 3),
        audits: audits
          .filter((a) =>
            `${a.agent?.name || ''} ${a.auditor?.name || ''} ${a.task || ''}`.toLowerCase().includes(query)
          )
          .slice(0, 3),
      }
    : { agents: [], swarms: [], audits: [] }

  const total = results.agents.length + results.swarms.length + results.audits.length

  const go = (path) => {
    setQ('')
    setOpen(false)
    navigate(path)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && total > 0) {
      const first =
        results.agents[0] || results.swarms[0] || results.audits[0]
      if (results.agents[0]) go(`/app/agents/${results.agents[0].id}`)
      else if (results.swarms[0]) go('/app/swarms')
      else go('/app/audits')
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="flex-1 max-w-md relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search agents, swarms, audits…"
        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
      />

      {open && query && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden z-50">
          {total === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No matches for “{q.trim()}”
            </div>
          )}

          {results.agents.length > 0 && (
            <div className="py-1.5">
              <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agents</div>
              {results.agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => go(`/app/agents/${a.id}`)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-brand-50/60 text-left transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{a.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{a.role}</span>
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ color: trustColor(a.trustScore), background: `${trustColor(a.trustScore)}14` }}
                  >
                    {a.trustScore.toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.swarms.length > 0 && (
            <div className="py-1.5 border-t border-slate-100">
              <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Swarms</div>
              {results.swarms.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go('/app/swarms')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-brand-50/60 text-left transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Network size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{s.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{s.description}</span>
                  </span>
                  <ArrowRight size={13} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {results.audits.length > 0 && (
            <div className="py-1.5 border-t border-slate-100">
              <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Audits</div>
              {results.audits.map((a, i) => (
                <button
                  key={i}
                  onClick={() => go('/app/audits')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-brand-50/60 text-left transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 truncate">
                      {a.auditor?.name} → {a.agent?.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate">{a.task}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                      a.verdict === 'pass'
                        ? 'text-emerald-600 bg-emerald-50'
                        : a.verdict === 'warn'
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-red-600 bg-red-50'
                    }`}
                  >
                    {a.verdict}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}