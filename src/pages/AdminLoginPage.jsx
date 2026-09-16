import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function AdminLoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/admin/inventory', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-cream">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-deep-green mt-3">Sanathanam Admin</h1>
          <p className="text-earth-500 text-sm mt-1">Sign in to manage all three storefronts</p>
        </div>
        <div className="bg-white rounded-2xl border border-earth-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-deep-green text-white font-bold rounded-xl text-sm disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
