import { useState, useRef, useEffect } from 'react'
import { api } from '../../lib/api'

const TEXT_FIELDS = [
  { key: 'tagline', label: 'Tagline', placeholder: 'Purity Enhanced' },
  { key: 'hero_eyebrow', label: 'Hero eyebrow', placeholder: 'Soaps · Shampoos · Perfumes' },
  { key: 'hero_title', label: 'Hero title', placeholder: 'Naturals That Tell' },
  { key: 'hero_highlight', label: 'Hero highlight', placeholder: "India's Story" },
  { key: 'hero_body', label: 'Hero text', multiline: true },
  { key: 'story_title', label: 'Story title' },
  { key: 'story_body', label: 'Story text', multiline: true },
]

const EMPTY_SETTINGS = {
  name: '',
  whatsapp_number: '',
  logo_url: '',
  hero_video_url: '',
  ...Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, ''])),
}

const inputClass = 'w-full min-h-[44px] px-3 border border-earth-200 rounded-xl text-sm'

function MediaField({ label, hint, value, accept, kind, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { url } = await api.adminUpload(file)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-earth-600 mb-1">{label}</label>
      <p className="text-xs text-earth-500 mb-2">{hint}</p>
      <div className="flex gap-3 items-start">
        <div className="h-16 w-16 shrink-0 rounded-xl border border-earth-100 bg-earth-50 overflow-hidden flex items-center justify-center">
          {value ? (
            kind === 'video' ? (
              <video src={value} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="text-[10px] text-earth-400">Default</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… (empty = default)"
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="min-h-[36px] px-3 border border-earth-200 rounded-xl text-xs font-semibold text-deep-green disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="min-h-[36px] px-3 text-xs text-earth-500">
                Clear
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept={accept} onChange={upload} className="hidden" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function StoreSettings({ siteSlug, siteName, onSaved }) {
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus('')
    setSettings(EMPTY_SETTINGS)
    api.adminSettings()
      .then((s) => setSettings({ ...EMPTY_SETTINGS, ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? ''])) }))
      .catch((err) => setStatus(err.message))
  }, [siteSlug])

  const set = (key, value) => {
    setStatus('')
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus('')
    try {
      const saved = await api.adminSaveSettings(settings)
      setSettings({ ...EMPTY_SETTINGS, ...Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v ?? ''])) })
      setStatus('Saved')
      onSaved?.(saved)
    } catch (err) {
      setStatus(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-white border border-earth-100 rounded-2xl p-4 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-deep-green">{siteName} — branding</h2>
        <p className="text-xs text-earth-500 mt-1">
          Uploaded files go to Supabase Storage. Leave a text or image empty to use the built-in default.
        </p>
      </div>
      <div>
        <label htmlFor="store-name" className="block text-sm font-semibold text-deep-green mb-2">
          Store name
        </label>
        <input
          id="store-name"
          value={settings.name}
          onChange={(e) => set('name', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wa-number" className="block text-sm font-semibold text-deep-green">
          Order WhatsApp number
        </label>
        <p className="text-xs text-earth-500 mt-1 mb-2">
          Customers send their order to this number after checkout. Include the country code, e.g. 919876543210.
        </p>
        <input
          id="wa-number"
          type="tel"
          inputMode="numeric"
          value={settings.whatsapp_number}
          onChange={(e) => set('whatsapp_number', e.target.value)}
          placeholder="919876543210"
          className={inputClass}
        />
      </div>

      <div className="border-t border-earth-100 pt-4">
          <div className="space-y-5">
            <MediaField
              label="Logo"
              hint="Square image, at least 256×256 px. Shown in the header, footer and hero."
              value={settings.logo_url}
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              kind="image"
              onChange={(v) => set('logo_url', v)}
            />
            <MediaField
              label="Hero video"
              hint="MP4 or WebM, under 30 MB. Plays in the circle on the home page; the logo is shown when empty."
              value={settings.hero_video_url}
              accept="video/mp4,video/webm"
              kind="video"
              onChange={(v) => set('hero_video_url', v)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <div key={f.key} className={f.multiline ? 'sm:col-span-2' : ''}>
                  <label htmlFor={`brand-${f.key}`} className="block text-xs font-semibold text-earth-600 mb-1">
                    {f.label}
                  </label>
                  {f.multiline ? (
                    <textarea
                      id={`brand-${f.key}`}
                      rows={3}
                      value={settings[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder="Empty = default"
                      className="w-full px-3 py-2 border border-earth-200 rounded-xl text-sm"
                    />
                  ) : (
                    <input
                      id={`brand-${f.key}`}
                      value={settings[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder ? `Default: ${f.placeholder}` : 'Empty = default'}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-5 bg-deep-green text-white font-semibold rounded-xl text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save store settings'}
        </button>
        {status && <p className={`text-xs ${status === 'Saved' ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
      </div>
    </form>
  )
}
