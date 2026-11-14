import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { useAdminSite } from '../../context/AdminSiteContext'

export default function AdminLayout({ children }) {
  const { logout } = useAdminAuth()
  const { activeSite, setActiveSite, sites } = useAdminSite()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-deep-green">
      <header className="sticky top-0 z-50 bg-white border-b border-earth-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-lg font-bold text-deep-green leading-tight">Sanathanam Admin</p>
              <p className="text-xs text-earth-500">Manage all storefronts</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/admin/login')
              }}
              className="self-start sm:self-auto min-h-[40px] px-4 text-sm font-medium border border-earth-200 rounded-xl text-earth-600 hover:bg-earth-50 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Select storefront">
            {sites.map((s) => {
              const active = s.slug === activeSite
              return (
                <button
                  key={s.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSite(s.slug)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                    active
                      ? 'bg-deep-green text-white border-deep-green shadow-sm'
                      : 'bg-white text-earth-700 border-earth-200 hover:border-saffron-300 hover:text-saffron-700'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className={`block text-[10px] font-normal mt-0.5 ${active ? 'text-earth-200' : 'text-earth-400'}`}>
                    {s.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
