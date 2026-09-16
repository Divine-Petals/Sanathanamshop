import { createContext, useContext, useEffect, useState } from 'react'
import { api, getCustomerToken, setCustomerToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const token = getCustomerToken()
    if (!token) {
      setAuthLoading(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        setCustomerToken(null)
        setUser(null)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  const sendOtp = (phone) => api.sendOtp(phone)

  const verifyOtp = async (phone, code) => {
    const data = await api.verifyOtp(phone, code)
    setCustomerToken(data.token)
    setUser(data.user)
    return data
  }

  const updateName = async (name) => {
    const next = await api.updateMe(name)
    setUser(next)
  }

  const logout = () => {
    setCustomerToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authLoading,
        sendOtp,
        verifyOtp,
        updateName,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
