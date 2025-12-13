import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NewEntry from './pages/NewEntry'
import Calendar from './pages/Calendar'
import Revisions from './pages/Revisions'
import Settings from './pages/Settings'
import Summaries from './pages/Summaries'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} />
      
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="new" element={<NewEntry />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="revisions" element={<Revisions />} />
        <Route path="summaries" element={<Summaries />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
