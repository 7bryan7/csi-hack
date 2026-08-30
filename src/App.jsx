import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { DataProvider } from './DataContext'
import { AuthProvider, useAuth } from './AuthContext'
import { ThemeProvider } from './ThemeContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Swarms from './pages/Swarms'
import Audits from './pages/Audits'
import AgentDetail from './pages/AgentDetail'
import Connections from './pages/Connections'
import Feed from './pages/Feed'

function ProtectedApp() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="feed" element={<Feed />} />
          <Route path="swarms" element={<Swarms />} />
          <Route path="audits" element={<Audits />} />
          <Route path="connections" element={<Connections />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app/*" element={<ProtectedApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}