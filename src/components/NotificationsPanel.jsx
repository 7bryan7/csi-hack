import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, ShieldCheck, TrendingDown, Rocket, CheckCircle2, Network,
  AlertTriangle, CheckCheck, ArrowRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Sample mock notifications. Read/unread state persists to localStorage so the
// badge count survives reloads. Clicking a notification navigates to the
// relevant page (audits / agents / swarms / dashboard).
// ---------------------------------------------------------------------------

const READ_KEY = 'oa_notifications_read'

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'audit',
    icon: ShieldCheck,
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Audit passed',
    body: 'Leo Tanaka passed a peer audit on “Add feature-flag support to the build pipeline”.',
    time: '2m ago',
    to: '/app/audits',
  },
  {
    id: 'n2',
    type: 'trust',
    icon: TrendingDown,
    color: '#ef4444',
    bg: '#fef2f2',
    title: 'Trust alert',
    body: 'Sofia Reyes dropped below your 60 threshold (now 58.4).',
    time: '18m ago',
    to: '/app/agents/ag-106',
  },
  {
    id: 'n3',
    type: 'task',
    icon: CheckCircle2,
    color: '#6366f1',
    bg: '#eef2ff',
    title: 'Task completed',
    body: '“Triage 14 support tickets” finished in 3.2s with a pass verdict.',
    time: '1h ago',
    to: '/app/audits',
  },
  {
    id: 'n4',
    type: 'publish',
    icon: Rocket,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Agent published',
    body: 'Priya Sharma is now live in the marketplace and routable.',
    time: '3h ago',
    to: '/app/marketplace',
  },
  {
    id: 'n5',
    type: 'swarm',
    icon: Network,
    color: '#0d9488',
    bg: '#f0fdfa',
    title: 'Swarm health',
    body: 'Research & Insights swarm is healthy — 2/2 agents above 70 trust.',
    time: '5h ago',
    to: '/app/swarms',
  },
  {
    id: 'n6',
    type: 'system',
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Rate limit notice',
    body: 'Gemini throttled a burst of tasks; retried automatically with backoff.',
    time: 'Yesterday',
    to: '/app',
  },
]

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || [])
    } catch {
      return new Set()
    }
  })
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify([...read]))
  }, [read])

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = MOCK_NOTIFICATIONS.filter((n) => !read.has(n.id)).length

  const markAllRead = () => setRead(new Set(MOCK_NOTIFICATIONS.map((n) => n.id)))

  const openNotification = (n) => {
    setRead((r) => new Set(r).add(n.id))
    setOpen(false)
    navigate(n.to)
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-brand-600 dark:text-brand-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-default transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {MOCK_NOTIFICATIONS.map((n) => {
              const Icon = n.icon
              const isRead = read.has(n.id)
              return (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/50 dark:hover:bg-brand-500/10 ${
                    isRead ? 'opacity-60' : ''
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ color: n.color, background: n.bg }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1">{n.time}</span>
                  </span>
                  <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0 mt-2" />
                </button>
              )
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-center">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Sample notifications — shown for demo purposes
            </span>
          </div>
        </div>
      )}
    </div>
  )
}