import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, Network, ShieldCheck, Settings, Bot, LogOut, Cpu } from 'lucide-react'
import { useData } from '../DataContext'
import { useAuth } from '../AuthContext'
import SettingsModal from './SettingsModal'
import GlobalSearch from './GlobalSearch'
import NotificationsPanel from './NotificationsPanel'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/marketplace', label: 'Agent Marketplace', icon: Store },
  { to: '/app/swarms', label: 'Swarm Network', icon: Network },
  { to: '/app/audits', label: 'Audit Ledger', icon: ShieldCheck },
  { to: '/app/connections', label: 'AI Models', icon: Cpu },
]

const MODE_META = {
  loading: { label: 'Connecting…', color: '#94a3b8', bg: '#f1f5f9' },
  simulated: { label: 'Simulated runtime', color: '#f59e0b', bg: '#fffbeb' },
  gemini: { label: 'Gemini live', color: '#10b981', bg: '#ecfdf5' },
  fallback: { label: 'Demo data (backend offline)', color: '#ef4444', bg: '#fef2f2' },
  offline: { label: 'Demo data', color: '#ef4444', bg: '#fef2f2' },
}

export default function Layout() {
  const { mode, agents, swarms, auditTotal } = useData()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const meta = MODE_META[mode] || MODE_META.fallback
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">OnlyAgent</div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Reputation Engine</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
            <div className="text-xs font-semibold mb-1">Protocol v2.4</div>
            <p className="text-[11px] text-brand-100 leading-relaxed">
              Peer-audited reputation layer. {agents.length} agents · {swarms.length} swarms ·{' '}
              {auditTotal} audits.
            </p>
          </div>
          <button
              onClick={() => setSettingsOpen(true)}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center gap-4 px-6">
          <div className="flex-1 max-w-md relative">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5"
              style={{ color: meta.color, background: meta.bg }}
            >
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: meta.color }} />
              {meta.label}
            </span>
            <NotificationsPanel />
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'user'}
                  className="w-8 h-8 rounded-full ring-2 ring-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => {
                  signOut()
                  navigate('/')
                }}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}