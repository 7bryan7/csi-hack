import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { DataProvider } from './DataContext'
import { AuthProvider, useAuth } from './AuthContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Swarms from './pages/Swarms'
import Audits from './pages/Audits'
import AgentDetail from './pages/AgentDetail'
import Connections from './pages/Connections'

function ProtectedApp() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="swarms" element={<Swarms />} />
          <Route path="audits" element={<Audits />} />
          <Route path="connections" element={<Connections />} />
          <Route path="agents/:id" element={<AgentDetail />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<ProtectedApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}