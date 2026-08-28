import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Swarms from './pages/Swarms'
import Audits from './pages/Audits'
import AgentDetail from './pages/AgentDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/swarms" element={<Swarms />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}