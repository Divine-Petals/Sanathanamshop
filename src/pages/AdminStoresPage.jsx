import { useState } from 'react'
import { api } from '../lib/api'
import { useAdminSite } from '../context/AdminSiteContext'
import StoreSettings from '../components/admin/StoreSettings'
import { CHILD_SITES } from '../lib/sites'

// Looks the storefront knows how to draw (src/lib/theme.js). A new store picks one.
const THEME_PRESETS = CHILD_SITES.map((s) => ({ key: s.slug, label: s.tone || s.name, accent: s.accent, soft: s.accentSoft }))

const EMPTY_STORE = { name: '', slug: '', tagline: '', theme_key: THEME_PRESETS[0].key, order_prefix: '', whatsapp_number: '' }
const inputClass = 'w-full min-h-[44px] px-3 border border-earth-200 rounded-xl text-sm'

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function AddStoreForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_STORE)
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => {
    setError('')
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && !slugTouched) next.slug = toSlug(value)
      return next
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await api.adminCreateStore(form)
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-saffron-200 rounded-2xl p-4 space-y-4">
      <h2 className="font-serif text-xl font-bold text-deep-green">Add a store</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-store-name" className="block text-xs font-semibold text-earth-600 mb-1">Store name *</label>
          <input id="new-store-name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Divine Arts" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-store-slug" className="block text-xs font-semibold text-earth-600 mb-1">Link name *</label>
          <input
            id="new-store-slug"
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              set('slug', toSlug(e.target.value))
            }}
            placeholder="divine-arts"
            className={inputClass}
          />
          <p className="text-[11px] text-earth-500 mt-1">
            Store address: {window.location.origin}/{form.slug || 'link-name'}
          </p>
        </div>
        <div>
          <label htmlFor="new-store-tagline" className="block text-xs font-semibold text-earth-600 mb-1">Tagline</label>
          <input id="new-store-tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Handmade with love" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-store-wa" className="block text-xs font-semibold text-earth-600 mb-1">Order WhatsApp number</label>
          <input id="new-store-wa" type="tel" inputMode="numeric" value={form.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="919876543210" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-store-prefix" className="block text-xs font-semibold text-earth-600 mb-1">Order number prefix</label>
          <input id="new-store-prefix" value={form.order_prefix} onChange={(e) => set('order_prefix', e.target.value.toUpperCase())} placeholder="DA" maxLength={6} className={inputClass} />
        </div>
      </div>

      <fieldset>
        <legend className="block text-xs font-semibold text-earth-600 mb-2">Look</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEME_PRESETS.map((p) => (
            <label
              key={p.key}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs ${
                form.theme_key === p.key ? 'border-deep-green bg-earth-50' : 'border-earth-200'
              }`}
            >
              <input type="radio" name="theme" value={p.key} checked={form.theme_key === p.key} onChange={() => set('theme_key', p.key)} className="sr-only" />
              <span className="flex shrink-0" aria-hidden="true">
                <span className="h-6 w-6 rounded-l-full" style={{ backgroundColor: p.accent }} />
                <span className="h-6 w-6 rounded-r-full" style={{ backgroundColor: p.soft }} />
              </span>
              <span className="text-earth-700 leading-snug">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="min-h-[44px] px-5 bg-deep-green text-white font-semibold rounded-xl text-sm disabled:opacity-50">
          {saving ? 'Creating…' : 'Create store'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] px-4 border border-earth-200 rounded-xl text-sm text-earth-600">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AdminStoresPage() {
  const { site, sites, setActiveSite, reloadSites } = useAdminSite()
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')

  const handleCreated = async (created) => {
    setAdding(false)
    await reloadSites()
    setActiveSite(created.slug)
    setNotice(`${created.name} is live at /${created.slug}. Add its logo and texts below, then add products under Inventory.`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-deep-green">Stores &amp; branding</h1>
          <p className="text-earth-500 text-sm mt-1">
            {sites.length} store{sites.length !== 1 ? 's' : ''}. Pick a store above to edit its name, logo, hero video and texts.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/${site.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 inline-flex items-center border border-earth-200 rounded-xl text-sm text-earth-700 hover:bg-earth-50"
          >
            View {site.name} ↗
          </a>
          {!adding && (
            <button
              type="button"
              onClick={() => {
                setNotice('')
                setAdding(true)
              }}
              className="min-h-[44px] bg-saffron-500 hover:bg-saffron-600 text-white font-semibold px-4 rounded-xl text-sm"
            >
              + Add store
            </button>
          )}
        </div>
      </div>

      {notice && (
        <p className="text-sm bg-green-50 border border-green-100 text-green-800 rounded-xl px-3 py-2">{notice}</p>
      )}

      {adding && <AddStoreForm onCreated={handleCreated} onCancel={() => setAdding(false)} />}

      <StoreSettings siteSlug={site.slug} siteName={site.name} onSaved={() => reloadSites()} />
    </div>
  )
}
