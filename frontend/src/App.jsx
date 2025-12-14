import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import NewEntry from './pages/NewEntry'
import EditEntry from './pages/EditEntry'
import Calendar from './pages/Calendar'
import Schedule from './pages/Schedule'
import Revisions from './pages/Revisions'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import Friends from './pages/Friends'
import FriendProfile from './pages/FriendProfile'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
      <Route path="/signup" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="new" element={<NewEntry />} />
        <Route path="edit/:id" element={<EditEntry />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="revisions" element={<Revisions />} />
        <Route path="friends" element={<Friends />} />
        <Route path="friends/:userId" element={<FriendProfile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
