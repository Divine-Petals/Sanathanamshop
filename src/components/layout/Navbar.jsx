import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore, useStorePath } from '../../context/StoreContext'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { getThemeMeta } from '../../lib/theme'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems, setIsCartOpen } = useCart()
  const { isAuthenticated } = useAuth()
  const brand = useBrand()
  const t = getThemeMeta(brand)
  const location = useLocation()
  const navigate = useNavigate()
  const { stores, store } = useStore()
  const storePath = useStorePath()

  const links = [
    { to: storePath('/'), label: 'Home' },
    { to: storePath('/products'), label: t.exploreLabel },
    { to: isAuthenticated ? '/account' : '/login', label: isAuthenticated ? 'Account' : 'Sign in' },
  ]

  // Stay on the same kind of page (home or products) in the other store.
  const switchStore = (slug) => {
    setMenuOpen(false)
    const onProducts = location.pathname.endsWith('/products')
    navigate(`/${slug}${onProducts ? '/products' : ''}`)
  }

  const cartBadge =
    brand.theme_key === 'divine-jewels'
      ? 'bg-[#c9a227] text-[#1f1520]'
      : brand.theme_key === 'sanathanam'
        ? 'bg-[#c2410c] text-white'
        : 'bg-saffron-500 text-white'

  return (
    <nav className={`sticky top-0 z-40 ${t.nav}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <BrandSwitcher brand={brand} t={t} stores={stores} current={store.slug} homePath={storePath('/')} onPick={switchStore} />

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to ? t.navLinkActive : t.navLink
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setIsCartOpen(true)}
            className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${t.navLink}`}
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className={`absolute top-1 right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${cartBadge}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setIsCartOpen(true)}
            className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center ${t.navTitle}`}
            aria-label={`Open cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <CartIcon />
            {totalItems > 0 && (
              <span className={`absolute top-1 right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${cartBadge}`}>
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${t.navTitle}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={`md:hidden border-t ${brand.theme_key === 'divine-jewels' ? 'border-[#c9a227]/20 bg-[#1f1520]' : 'border-earth-100 bg-white'}`}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block px-5 py-3.5 text-sm font-medium border-b last:border-0 ${
                location.pathname === link.to ? t.navLinkActive : t.navLink
              } ${brand.theme_key === 'divine-jewels' ? 'border-[#c9a227]/10' : 'border-earth-50'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

function BrandMark({ brand, t }) {
  return (
    <>
      <img src={brand.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" aria-hidden="true" />
      <span className="min-w-0 text-left">
        <span className={`block font-serif text-base sm:text-lg font-bold leading-none truncate ${t.navTitle}`}>{brand.name}</span>
        <span className={`hidden sm:block text-[10px] leading-none tracking-widest uppercase mt-0.5 ${t.navTagline}`}>
          {brand.tagline}
        </span>
      </span>
    </>
  )
}

function StoreAvatar({ store }) {
  const [broken, setBroken] = useState(false)
  if (store.logo_url && !broken) {
    return <img src={store.logo_url} alt="" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-full object-cover bg-gray-100" />
  }
  return (
    <span className="h-9 w-9 shrink-0 rounded-full bg-gray-200 flex items-center justify-center font-serif font-bold text-gray-600">
      {store.name?.[0] ?? '?'}
    </span>
  )
}

/** The store's logo and name double as the store switcher. */
function BrandSwitcher({ brand, t, stores, current, homePath, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (stores.length < 2) {
    return (
      <Link to={homePath} className="flex items-center gap-2 min-w-0" aria-label={`${brand.name} — Home`}>
        <BrandMark brand={brand} t={t} />
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${brand.name} — switch store`}
        className="flex items-center gap-2 min-w-0 min-h-[44px] -ml-1 pl-1 pr-2 rounded-xl hover:bg-black/5 transition-colors"
      >
        <BrandMark brand={brand} t={t} />
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${t.navTagline}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch store"
          className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white text-[#1f2937] rounded-2xl shadow-xl border border-black/10 p-1.5 z-50"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Our stores</p>
          {stores.map((s) => {
            const active = s.slug === current
            return (
              <button
                key={s.slug}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setOpen(false)
                  if (!active) onPick(s.slug)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <StoreAvatar store={s} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{s.name}</span>
                  {s.tagline && <span className="block text-xs text-gray-500 truncate">{s.tagline}</span>}
                </span>
                {active && (
                  <svg className="h-4 w-4 shrink-0 text-gray-700" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
