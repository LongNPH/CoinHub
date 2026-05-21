import { Routes, Route } from 'react-router-dom'
import Navbar          from './components/Navbar'
import ProtectedRoute  from './components/ProtectedRoute'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Trade           from './pages/Trade'
import News            from './pages/News'
import History         from './pages/History'
import Admin           from './pages/Admin'
import { useLatency }  from './hooks/useLatency'

export default function App() {
  useLatency()

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      minHeight:     '100vh',
      background:    '#000',
    }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/login"    element={<Login />}           />
          <Route path="/register" element={<Register />}        />

          {/* Public */}
          <Route path="/"    element={<Home />}  />
          <Route path="/trade" element={<Trade />} />
          <Route path="/news"  element={<News />}  />

          {/* Protected */}
          <Route path="/history" element={
            <ProtectedRoute><History /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><Admin /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  )
}
