import { createContext, useContext, useState } from 'react'
import { api, getAdminToken, setAdminToken } from '../lib/api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminToken())

  const login = async (email, password) => {
    const data = await api.adminLogin(email, password)
    setAdminToken(data.token)
    setIsAuthenticated(true)
  }

  const logout = () => {
    setAdminToken(null)
    setIsAuthenticated(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
