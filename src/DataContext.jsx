import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api'

const DataContext = createContext(null)

/**
 * Loads agents / swarms / audits from the backend.
 * Falls back to bundled fake data when the backend is offline.
 * Exposes runTask / auditTask for the live demo flow.
 */
export function DataProvider({ children }) {
  const [agents, setAgents] = useState([])
  const [swarms, setSwarms] = useState([])
  const [audits, setAudits] = useState([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [mode, setMode] = useState('loading')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([api.agents(), api.swarms(), api.audits()]).then(([a, s, au]) => {
      if (cancelled) return
      setAgents(a.agents)
      setSwarms(s.swarms)
      setAudits(au.audits)
      setAuditTotal(au.total || au.audits.length)
      setMode(a.mode)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const runTask = useCallback(
    async (task, opts) => {
      const result = await api.runTask(task, opts)
      refresh()
      return result
    },
    [refresh]
  )

  const auditTask = useCallback(
    async (taskId, opts) => {
      const result = await api.auditTask(taskId, opts)
      refresh()
      return result
    },
    [refresh]
  )

  return (
    <DataContext.Provider
      value={{ agents, swarms, audits, auditTotal, mode, loading, refresh, runTask, auditTask }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}