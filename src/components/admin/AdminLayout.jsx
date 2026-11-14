import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

export default function AdminLayout({ children }) {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-deep-green">
      <header className="sticky top-0 z-50 bg-white border-b border-earth-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-lg font-bold text-deep-green leading-tight">Sanathanam Admin</p>
              <p className="text-xs text-earth-500">Inventory for sanathanamshop.in</p>
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
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
