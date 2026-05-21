import { createContext, useState, useEffect } from 'react'
import { get, post } from '../utils/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const data = await post('/api/auth/login', { username, password })
    setUser(data.user)
  }

  async function logout() {
    await post('/api/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}