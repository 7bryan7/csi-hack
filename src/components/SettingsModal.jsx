import { X, LogOut, Bot, ShieldCheck, Network, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useData } from '../DataContext'

const MODE_META = {
  loading: { label: 'Connecting…', color: '#94a3b8', bg: '#f1f5f9' },
  simulated: { label: 'Simulated runtime', color: '#f59e0b', bg: '#fffbeb' },
  gemini: { label: 'Gemini live', color: '#10b981', bg: '#ecfdf5' },
  fallback: { label: 'Demo data (backend offline)', color: '#ef4444', bg: '#fef2f2' },
  offline: { label: 'Demo data', color: '#ef4444', bg: '#fef2f2' },
}

export default function SettingsModal({ open, onClose }) {
  const { user, signOut } = useAuth()
  const { mode, agents, swarms, auditTotal } = useData()
  const navigate = useNavigate()
  if (!open) return null

  const meta = MODE_META[mode] || MODE_META.fallback

  const stats = [
    { icon: Bot, label: 'Agents registered', value: agents.length },
    { icon: Network, label: 'Swarms', value: swarms.length },
    { icon: ShieldCheck, label: 'Audits recorded', value: auditTotal },
    { icon: Activity, label: 'Runtime', value: meta.label },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Account */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Account</div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'user'}
                  className="w-10 h-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Signed in'}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Signed in
              </span>
            </div>
          </div>

          {/* Runtime */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Platform status</div>
            <div className="grid grid-cols-2 gap-2.5">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <Icon size={12} />
                    {label}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] text-slate-400 leading-relaxed">
              Reputation metrics are computed from real task executions and peer audits.
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}