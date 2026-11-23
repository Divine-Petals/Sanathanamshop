import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBrand } from '../context/BrandContext'

const inputClass =
  'w-full min-h-[44px] px-3 py-2 border border-earth-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-saffron-300 text-deep-green'
const buttonClass =
  'w-full min-h-[48px] bg-deep-green text-white font-bold rounded-xl text-sm disabled:opacity-50'

const today = () => new Date().toISOString().slice(0, 10)

// Steps: phone → code (registered number) or signup (new number) → profile (old accounts without a date of birth).
export default function LoginPage() {
  const { sendOtp, verifyOtp, signUp, updateProfile } = useAuth()
  const brand = useBrand()
  const navigate = useNavigate()
  const location = useLocation()
  const next = location.state?.from ?? '/account'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [otpMode, setOtpMode] = useState('sms')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [step, setStep] = useState('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setError('')
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    run(async () => {
      const res = await sendOtp(phone.trim())
      if (res?.new_user) {
        setStep('signup')
        return
      }
      setOtpMode(res?.otp_mode === 'dob' ? 'dob' : 'sms')
      setCode('')
      setStep('code')
    })
  }

  const handleVerify = (e) => {
    e.preventDefault()
    run(async () => {
      const data = await verifyOtp(phone.trim(), code.trim())
      if (!data.user?.date_of_birth) {
        setName(data.user?.name ?? '')
        setStep('profile')
        return
      }
      navigate(next, { replace: true })
    })
  }

  const handleSignUp = (e) => {
    e.preventDefault()
    run(async () => {
      await signUp(phone.trim(), name.trim(), dob)
      navigate(next, { replace: true })
    })
  }

  const handleProfile = (e) => {
    e.preventDefault()
    run(async () => {
      await updateProfile(name.trim(), dob)
      navigate(next, { replace: true })
    })
  }

  const changeNumber = () => {
    setError('')
    setStep('phone')
  }

  const nameAndDob = (
    <>
      <div>
        <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-earth-600 mb-1" htmlFor="dob">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          autoComplete="bday"
          required
          min="1900-01-01"
          max={today()}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={inputClass}
        />
        <p className="text-[11px] text-earth-400 mt-1">
          You'll sign in with the day and month of your birth (DDMM) as your OTP.
        </p>
      </div>
    </>
  )

  const titles = {
    phone: ['Sign in', `${brand.name} · mobile OTP`],
    code: ['Sign in', `${brand.name} · mobile OTP`],
    signup: ['Create your account', `New to ${brand.name}? Tell us a little about you.`],
    profile: ['One more step', 'Add your date of birth to finish your profile.'],
  }
  const [title, subtitle] = titles[step]

  return (
    <div className="min-h-[calc(100vh-112px)] flex items-center justify-center px-4 py-12 bg-cream">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-deep-green mt-3">{title}</h1>
          <p className="text-earth-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-earth-100 p-6">
          {step === 'phone' && (
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
                  className={inputClass}
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-earth-500">
                {otpMode === 'dob'
                  ? `Signing in as ${phone}. Your OTP is the day and month of your birth (DDMM), e.g. 7 March → 0703.`
                  : `OTP sent to ${phone}`}
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={otpMode === 'dob' ? 'DDMM' : 'OTP'}
                className={inputClass}
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" className="w-full text-xs text-earth-500" onClick={changeNumber}>
                Change number
              </button>
            </form>
          )}

          {step === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <p className="text-xs text-earth-500">{phone} isn't registered yet.</p>
              {nameAndDob}
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Creating account…' : 'Sign up'}
              </button>
              <button type="button" className="w-full text-xs text-earth-500" onClick={changeNumber}>
                Change number
              </button>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfile} className="space-y-4">
              {nameAndDob}
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Saving…' : 'Save and continue'}
              </button>
              <button
                type="button"
                className="w-full text-xs text-earth-500"
                onClick={() => navigate(next, { replace: true })}
              >
                Skip for now
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
