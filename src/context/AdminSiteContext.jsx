import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api, setAdminTenant, getAdminTenant } from '../lib/api'

// Shown until /api/stores answers; stores added in Admin → Stores come from the API.
export const ADMIN_SITES = [
  { slug: 'divine-petals', name: 'Divine Petals', hint: 'Soaps' },
  { slug: 'divine-jewels', name: 'Divine Jewels', hint: 'Jewellery' },
  { slug: 'sanathanam', name: 'Sanathanam', hint: 'Textiles & dry fruits' },
]

const AdminSiteContext = createContext(null)

export function AdminSiteProvider({ children }) {
  const [activeSite, setActiveSiteState] = useState(() => getAdminTenant())
  const [sites, setSites] = useState(ADMIN_SITES)

  const setActiveSite = useCallback((slug) => {
    setAdminTenant(slug)
    setActiveSiteState(slug)
  }, [])

  const reloadSites = useCallback(
    () =>
      api
        .stores()
        .then((list) => {
          if (!Array.isArray(list) || !list.length) return
          setSites(
            list.map((s) => ({
              slug: s.slug,
              name: s.name,
              hint: s.tagline || ADMIN_SITES.find((a) => a.slug === s.slug)?.hint || '',
              theme_key: s.theme_key,
            })),
          )
        })
        .catch(() => {}),
    [],
  )

  useEffect(() => {
    reloadSites()
  }, [reloadSites])

  const site = sites.find((s) => s.slug === activeSite) ?? sites[0]

  return (
    <AdminSiteContext.Provider value={{ activeSite, setActiveSite, site, sites, reloadSites }}>
      {children}
    </AdminSiteContext.Provider>
  )
}

export function useAdminSite() {
  const ctx = useContext(AdminSiteContext)
  if (!ctx) throw new Error('useAdminSite must be used within AdminSiteProvider')
  return ctx
}
