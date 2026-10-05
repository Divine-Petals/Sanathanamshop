import { createContext, useContext, useState, useCallback } from 'react'
import { setAdminTenant, getAdminTenant } from '../lib/api'

export const ADMIN_SITES = [
  { slug: 'divine-petals', name: 'Divine Petals', hint: 'Soaps' },
  { slug: 'divine-jewels', name: 'Divine Jewels', hint: 'Jewellery' },
  { slug: 'sanathanam', name: 'Sanathanam', hint: 'Textiles & dry fruits' },
]

const AdminSiteContext = createContext(null)

export function AdminSiteProvider({ children }) {
  const [activeSite, setActiveSiteState] = useState(() => getAdminTenant())

  const setActiveSite = useCallback((slug) => {
    setAdminTenant(slug)
    setActiveSiteState(slug)
  }, [])

  const site = ADMIN_SITES.find((s) => s.slug === activeSite) ?? ADMIN_SITES[0]

  return (
    <AdminSiteContext.Provider value={{ activeSite, setActiveSite, site, sites: ADMIN_SITES }}>
      {children}
    </AdminSiteContext.Provider>
  )
}

export function useAdminSite() {
  const ctx = useContext(AdminSiteContext)
  if (!ctx) throw new Error('useAdminSite must be used within AdminSiteProvider')
  return ctx
}
