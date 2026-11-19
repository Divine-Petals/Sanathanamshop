import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, DEFAULT_STORE, setStorefrontTenant } from '../lib/api'
import { CHILD_SITES } from '../lib/sites'

const StoreContext = createContext(null)
const LAST_STORE_KEY = 'sanathanam.store'

// First path segments that are site pages, not store links (/login, /checkout …).
export const RESERVED_PATHS = ['admin', 'login', 'checkout', 'account', 'products']

// Used until /api/stores answers (or if it fails).
const STATIC_STORES = CHILD_SITES.map((s) => ({
  slug: s.slug,
  name: s.name,
  tagline: s.tagline,
  theme_key: s.slug,
  logo_url: '',
}))

function readLastStore() {
  try {
    return localStorage.getItem(LAST_STORE_KEY)
  } catch {
    return null
  }
}

function storeSlugFromPath(pathname) {
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first || RESERVED_PATHS.includes(first.toLowerCase())) return null
  return first.toLowerCase()
}

export function StoreProvider({ children }) {
  const location = useLocation()
  const [stores, setStores] = useState(STATIC_STORES)
  const [storesLoaded, setStoresLoaded] = useState(false)
  const [lastStore, setLastStore] = useState(() => readLastStore() ?? DEFAULT_STORE)

  const reloadStores = () =>
    api
      .stores()
      .then((list) => {
        if (Array.isArray(list) && list.length) setStores(list)
      })
      .catch(() => {})
      .finally(() => setStoresLoaded(true))

  useEffect(() => {
    reloadStores()
  }, [])

  const urlSlug = storeSlugFromPath(location.pathname)
  const isKnown = (slug) => stores.some((s) => s.slug === slug)

  // The URL wins; otherwise the store the customer last visited, then the default.
  const fallbackSlug = isKnown(lastStore) ? lastStore : isKnown(DEFAULT_STORE) ? DEFAULT_STORE : stores[0]?.slug
  const slug = urlSlug && (!storesLoaded || isKnown(urlSlug)) ? urlSlug : fallbackSlug
  setStorefrontTenant(slug)

  useEffect(() => {
    if (!urlSlug || !isKnown(urlSlug)) return
    setLastStore(urlSlug)
    try {
      localStorage.setItem(LAST_STORE_KEY, urlSlug)
    } catch {
      /* private mode */
    }
  }, [urlSlug, stores])

  const store = useMemo(
    () => stores.find((s) => s.slug === slug) ?? { slug, name: slug, tagline: '', theme_key: slug, logo_url: '' },
    [stores, slug],
  )

  const value = { stores, storesLoaded, store, urlSlug, fallbackSlug, isKnown, reloadStores }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Builds a link inside the active store: storePath('/products') → '/divine-jewels/products'. */
export function useStorePath() {
  const { store } = useStore()
  return (path = '/') => `/${store.slug}${path === '/' ? '' : path}`
}
