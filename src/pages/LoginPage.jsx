import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBrand } from '../context/BrandContext'

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth()
  const brand = useBrand()
  const navigate = useNavigate()
  const location = useLocation()
  const next = location.state?.from ?? '/account'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('phone')
  const [debugOtp, setDebugOtp] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await sendOtp(phone.trim())
      setDebugOtp(res.debug_otp ?? res.debugOtp ?? null)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(phone.trim(), code.trim())
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-112px)] flex items-center justify-center px-4 py-12 bg-cream">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-deep-green mt-3">Sign in</h1>
          <p className="text-earth-500 text-sm mt-1">{brand.name} · mobile OTP</p>
        </div>
        <div className="bg-white rounded-2xl border border-earth-100 p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="phone">
                  Mobile number
                </label>
                <input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-deep-green text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-earth-500">OTP sent to {phone}</p>
              {debugOtp && (
                <p className="text-xs bg-earth-50 border border-earth-100 rounded-xl px-3 py-2">
                  Dev OTP: <strong>{debugOtp}</strong>
                </p>
              )}
              <input
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit OTP"
                className="w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green"
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-deep-green text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" className="w-full text-xs text-earth-500" onClick={() => setStep('phone')}>
                Change number
              </button>
            </form>
          )}
          <p className="text-[11px] text-earth-400 mt-4 text-center">
            Admin? <Link to="/admin/login" className="underline">Inventory login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
